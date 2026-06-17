# Skill: Security Validation

Run lightweight OWASP-style checks against detected endpoints:
- Unauthenticated access returns 401
- Cross-tenant access returns 403
- Responses do not leak secrets / stack traces
- Common security headers present (CSP, X-Frame-Options, HSTS)
- No SQL/NoSQL injection echoed back
