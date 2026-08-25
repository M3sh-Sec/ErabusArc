# Contributing to EREBUS ARC

Thank you for your interest in contributing.

## Development Setup

1. Fork and clone the repo
2. Run `npm install`
3. Copy `.env.example` to `.env.local` and fill in your values
4. Run `npm run dev`

## Code Style

- ES modules throughout (import/export)
- No TypeScript — plain JavaScript with Zod for runtime validation
- Inline comments on security-critical logic
- All server-side modules must not use `NEXT_PUBLIC_` env vars

## Security Guidelines

- Never log API keys, passwords, or session tokens
- All user input must be validated with Zod before use
- All AI output must be validated with the output schema before sending to client
- companyId must always come from session — never from client request body
- New API routes must implement: method check, CSRF, auth, rate limit, input validation

## Pull Request Process

1. Branch from `develop`, not `main`
2. One feature or fix per PR
3. Update relevant documentation
4. Ensure `npm run build` passes
5. Describe security implications of any changes in the PR description
