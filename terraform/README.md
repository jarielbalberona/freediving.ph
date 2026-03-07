# Freediving.ph AWS Infrastructure (Terraform)

**STATUS:** 🚧 **NOT PRODUCTION READY** - Infrastructure prepared for future scaling, currently using PaaS

**LAST ASSESSED:** Oct 2025

---

## ⚠️ CRITICAL SECURITY ISSUES TO FIX BEFORE USE

### 1. **HARDCODED SECRETS IN GIT HISTORY** 🔥
**Location:** `modules/ecs/api.tf`

```hcl
{ name = "RESEND_EMAIL_KEY", value = "re_MWcm3XnE_MPLJ8MbwpGZiAoXjmefHNu1X" }
```

**Actions Required:**
- [ ] Clean git history using `git filter-branch` or BFG Repo Cleaner
- [ ] Rotate Resend API key immediately
- [ ] Implement AWS Secrets Manager for all secrets
- [ ] Remove all hardcoded credentials from task definitions

**Proper Implementation:**
```hcl
secrets = [
  {
    name      = "RESEND_EMAIL_KEY"
    valueFrom = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.environment}/resend/api-key"
  },
  {
    name      = "DATABASE_URL"
    valueFrom = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.environment}/database/url"
  }
]
```
