/**
 * GET    /api/admin/companies        — list all companies (superadmin)
 * POST   /api/admin/companies        — create company (superadmin)
 * PATCH  /api/admin/companies/[id]   — update company (superadmin)
 */
import { requireAuth } from "../../../lib/session.js";
import { createCompany, listCompanies, updateCompany, ROLES } from "../../../lib/db.js";
import { validateCsrfToken } from "../../../lib/csrf.js";
import { logger } from "../../../lib/logger.js";

export default async function handler(req, res) {
  const ctx = await requireAuth(req, res, { role: ROLES.SUPERADMIN });
  if (!ctx) return;

  if (req.method === "GET") {
    return res.status(200).json({ companies: listCompanies() });
  }

  const csrf = validateCsrfToken(req);
  if (!csrf.valid) return res.status(403).json({ error: "Invalid CSRF token." });

  if (req.method === "POST") {
    const { name, domain } = req.body || {};
    if (!name || typeof name !== "string") return res.status(400).json({ error: "Company name required." });
    const company = createCompany({ name: name.trim(), domain: domain?.trim() });
    logger.info("COMPANY_CREATED", { by: ctx.user.id, companyId: company.id });
    return res.status(201).json({ company });
  }

  if (req.method === "PATCH") {
    const { id, ...fields } = req.body || {};
    if (!id) return res.status(400).json({ error: "Company ID required." });
    const updated = updateCompany(id, fields);
    if (!updated) return res.status(404).json({ error: "Company not found." });
    logger.info("COMPANY_UPDATED", { by: ctx.user.id, companyId: id });
    return res.status(200).json({ company: updated });
  }

  res.setHeader("Allow", "GET, POST, PATCH");
  return res.status(405).json({ error: "Method not allowed" });
}

export const config = { api: { bodyParser: { sizeLimit: "8kb" } } };
