#  Security Policy

##  Supported Versions

We actively support security updates for the following versions:

| Version | Supported |
|--------|----------|
| main branch | ✅ |
| latest release | ✅ |
| older releases | ❌ |

---

##  Reporting a Vulnerability

If you discover a security vulnerability in **OpenIO**, please do NOT open a public issue.

Instead, report it privately:

###  Preferred Method
- Email: sentinelapex.kh@gmail.com
- OR GitHub Security Advisory:  
  https://github.com/Sentinel-Apex/openio/security/advisories

---

##  What to Include

Please include:

- Description of the vulnerability
- Steps to reproduce
- Affected version(s)
- Possible impact
- Any suggested fixes (if available)

---

##  Response Time

We aim to respond within:

-  48 hours → Initial response
-  7 days → Investigation update
-  Fix release → Depends on severity

---

##  Scope

This security policy applies to:

- OpenIO CLI
- Core packages
- Official plugins
- Official APIs

It does NOT cover:

- Third-party forks
- Unofficial modifications
- External dependencies (unless directly exploitable via OpenIO)

---

##  Security Best Practices (For Contributors)

When contributing:

- Never commit `.env` or secrets
- Avoid hardcoding API keys
- Validate all user inputs
- Follow least-privilege principle
- Run dependency audits regularly

```bash
npm audit
