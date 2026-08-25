/**
 * GET  /api/users   — list users in caller's company
 * POST /api/users   — invite/create a new user (company_admin+)
 * PATCH /api/users  — update a user (company_admin+)
 * DELETE /api/users — deactivate a user (company_admin+)
 *
 * Security:
 * - Users can only manage users in their own company
 * - Cannot assign roles higher than their own
 * - Superadmin can manage any company's users (with X-Company-Id header)
 */
import { requireAuth } from "../../../lib/session.js";
import {
  createUser, listUsersForCompany, updateUser, deleteUser,
  sanitizeUser, ROLES, ROLE_HIERARCHY
} from "../../../lib/db.js";
import { validateCsrfToken } from "../../../lib/csrf.js";
import { logger } from "../../../lib/logger.js";

export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, { role: ROLES.VIEWER });
  if (!ctx) return;

  const companyId = ctx.company?.id;
  if (!companyId) return res.status(400).json({ error: "No company scope. Use X-Company-Id header." });

  // GET — list users
  if (req.method === "GET") {
    return res.status(200).json({ users: listUsersForCompany(companyId) });
  }

  // Mutations require company_admin+
  if (!["POST","PATCH","DELETE"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST, PATCH, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const csrf = validateCsrfToken(req);
  if (!csrf.valid) return res.status(403).json({ error: "Invalid CSRF token." });

  if (ctx.user.role !== ROLES.SUPERADMIN && ROLE_HIERARCHY[ctx.user.role] < ROLE_HIERARCHY[ROLES.COMPANY_ADMIN]) {
    return res.status(403).json({ error: "Company admin role required." });
  }

  // POST — create user
  if (req.method === "POST") {
    const { email, password, name, role = ROLES.ANALYST } = req.body || {};
    if (!email || !password || !name) return res.status(400).json({ error: "email, password, name required." });

    // Admins cannot create superadmins
    if (role === ROLES.SUPERADMIN && ctx.user.role !== ROLES.SUPERADMIN) {
      return res.status(403).json({ error: "Cannot create superadmin accounts." });
    }
    // Cannot assign role higher than own
    if ((ROLE_HIERARCHY[role] || 0) > (ROLE_HIERARCHY[ctx.user.role] || 0)) {
      return res.status(403).json({ error: "Cannot assign a role higher than your own." });
    }

    try {
      const user = createUser({ email, password, name, companyId, role });
      logger.info("USER_CREATED", { by: ctx.user.id, newUserId: user.id, companyId });
      return res.status(201).json({ user });
    } catch (e) {
      return res.status(409).json({ error: e.message });
    }
  }

  // PATCH — update user
  if (req.method === "PATCH") {
    const { id, ...fields } = req.body || {};
    if (!id) return res.status(400).json({ error: "User ID required." });
    // Ensure target user is in same company
    const { getUser } = await import("../../../lib/db.js");
    const target = getUser(id);
    if (!target || target.companyId !== companyId) return res.status(404).json({ error: "User not found." });

    // Strip fields that shouldn't be user-updateable via this endpoint
    const { passwordHash, companyId: _, ...safeFields } = fields;
    try {
      const updated = updateUser(id, safeFields, ctx.user.id);
      logger.info("USER_UPDATED", { by: ctx.user.id, userId: id });
      return res.status(200).json({ user: updated });
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
  }

  // DELETE — deactivate user
  if (req.method === "DELETE") {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "User ID required." });
    if (id === ctx.user.id) return res.status(400).json({ error: "Cannot deactivate your own account." });
    const { getUser } = await import("../../../lib/db.js");
    const target = getUser(id);
    if (!target || target.companyId !== companyId) return res.status(404).json({ error: "User not found." });
    deleteUser(id);
    logger.info("USER_DEACTIVATED", { by: ctx.user.id, userId: id });
    return res.status(200).json({ success: true });
  }
}

export const config = { api: { bodyParser: { sizeLimit: "8kb" } } };
