
---

# Objectives (what we’re fixing)

* Public-only VPC → **private subnets for ECS/RDS, ALB in public**.
* Unlocked state + AES-256 → **S3 SSE-KMS + DynamoDB state locks**.
* Secrets in tfvars → **OIDC for CI + SSM/Secrets Manager + SOPS**.
* Hardcoded domains → **fully parameterized Route53/ACM**.
* Toy RDS/ECS posture → **prod-ready configs (backups, autoscaling, alarms)**.
* One account → **multi-account with role assumption + guardrails**.
* Missing edge/WAF/observability/cost controls → **add them, default-on**.

---

# Target layout (minimal changes, big wins)

```
terraform/
├── main.tf                    # backend + remote state (S3+KMS+DynDB)
├── providers.tf               # aws + assume-role per env
├── variables.tf
├── versions.tf                # pin TF + providers
├── policies/                  # OPA/Conftest, SCPs, IAM docs
├── modules/
│   ├── networking/            # VPC: 2 public + 2 private, NAT or endpoints
│   ├── ecs-service/           # ECR + ECS(Fargate) + ALB TG + autoscaling + alarms
│   ├── rds-postgres/
│   ├── route53-certs/
│   ├── s3-bucket/
│   ├── cloudfront-waf/        # optional: edge, WAF managed rules
│   └── budgets/
└── environments/
    ├── dev/
    │   ├── backend.tf         # same bucket/table but different key
    │   ├── dev.tfvars
    │   └── main.tf            # wires modules
    └── prod/
        ├── backend.tf
        ├── prod.tfvars
        └── main.tf
```

---

# P0: Networking (private subnets, sane routing)

**modules/networking/main.tf** (sketch)

```hcl
variable "vpc_cidr" { default = "10.0.0.0/16" }
variable "azs"      { type = list(string) } # ["ap-southeast-1a","ap-southeast-1b"]
variable "enable_nat" { default = true }

# VPC
resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = { Name = "${var.env}-vpc", env = var.env }
}

# 2 public + 2 private subnets
module "subnets" {
  source  = "terraform-aws-modules/vpc/aws//modules/subnets"
  version = "~> 5.0"
  vpc_id  = aws_vpc.this.id
  azs     = var.azs
  public_subnet_cidrs  = ["10.0.0.0/24","10.0.1.0/24"]
  private_subnet_cidrs = ["10.0.10.0/24","10.0.11.0/24"]
}

# IGW + public routes
module "igw" {
  source  = "terraform-aws-modules/vpc/aws//modules/internet-gateway"
  vpc_id  = aws_vpc.this.id
}

# NAT (or skip and use VPC endpoints heavily)
module "nat" {
  count   = var.enable_nat ? 1 : 0
  source  = "terraform-aws-modules/vpc/aws//modules/nat-gateway"
  vpc_id  = aws_vpc.this.id
  public_subnet_ids  = module.subnets.public_subnet_ids
  private_subnet_ids = module.subnets.private_subnet_ids
}

# Gateway endpoints to cut NAT egress
module "endpoints" {
  source  = "terraform-aws-modules/vpc/aws//modules/vpc-endpoints"
  vpc_id  = aws_vpc.this.id
  endpoints = {
    s3  = { service = "s3",  service_type = "Gateway", route_table_ids = module.subnets.private_route_table_ids }
    dynamodb = { service = "dynamodb", service_type = "Gateway", route_table_ids = module.subnets.private_route_table_ids }
    ecr_api = { service = "ecr.api", subnet_ids = module.subnets.private_subnet_ids, security_group_ids = [aws_security_group.endpoints.id] }
    ecr_dkr = { service = "ecr.dkr", subnet_ids = module.subnets.private_subnet_ids, security_group_ids = [aws_security_group.endpoints.id] }
    ssm      = { service = "ssm",      subnet_ids = module.subnets.private_subnet_ids, security_group_ids = [aws_security_group.endpoints.id] }
    secretsmanager = { service = "secretsmanager", subnet_ids = module.subnets.private_subnet_ids, security_group_ids = [aws_security_group.endpoints.id] }
    logs     = { service = "logs",     subnet_ids = module.subnets.private_subnet_ids, security_group_ids = [aws_security_group.endpoints.id] }
  }
}
```

**Security groups pattern**

* ALB SG: ingress 443 from `0.0.0.0/0`; egress to ECS SG.
* ECS SG: ingress from ALB SG; egress to RDS SG + endpoints/NAT.
* RDS SG: ingress 5432 from ECS SG only.

---

# P0: Remote state hardening (S3 SSE-KMS + DynamoDB locks)

**main.tf (root)**

```hcl
terraform {
  backend "s3" {
    bucket         = "freediving-ph-tofu-state"
    key            = "global/${path_relative_to_include()}/terraform.tfstate"
    region         = "ap-southeast-1"
    dynamodb_table = "tf-state-locks"
    encrypt        = true
    kms_key_id     = "alias/tf-state-key"
  }
  required_version = "~> 1.9"
}
```

Add:

* `aws_kms_key` (managed CMK with rotation) for the state bucket.
* `aws_dynamodb_table` (PAY_PER_REQUEST) with `LockID` as hash key.
* S3 bucket policy: block public, TLS-only, bucket-owner-enforced object ownership.

---

# P0: Secrets & CI (kill plaintext, use OIDC + SSM/Secrets Manager)

**GitHub Actions OIDC trust**

* Create IAM role `gha-deploy-role` with web identity trust for `token.actions.githubusercontent.com` and `sub` matching your repo.
* Attach least-priv policies (plan/apply, read/write state bucket, assume env roles).

**App secrets**

* Store DB creds, app secrets in **SSM Parameter Store (SecureString)** or **Secrets Manager**.
* In ECS task definitions, inject via `secrets { name = "DATABASE_URL" valueFrom = aws_ssm_parameter.db_url.arn }`.

**Config in Git**

* Use **SOPS** for any `.tfvars` you insist on keeping—AES256/age, not plaintext.

---

# P0: Route53 & ACM (parameterized, no hardcodes)

**modules/route53-certs/variables.tf**

```hcl
variable "zone_name" { type = string }         # e.g., "freediving.ph"
variable "records"   { type = map(any) }       # { "app.dev" = { type="A", alias={ ... } }, ... }
variable "region_for_cf_cert" { default = "us-east-1" }
```

* For **ALB certs**: ACM in same region as ALB (ap-southeast-1).
* For **CloudFront** (if used): separate ACM cert in **us-east-1**.
* Envs pass their own subdomain maps, e.g. `app.dev.freediving.ph`, `api.dev.freediving.ph`, `app.freediving.ph`.

---

# P0: RDS production posture

**modules/rds-postgres/main.tf** (key bits)

```hcl
resource "aws_db_instance" "this" {
  engine                 = "postgres"
  engine_version         = "14.11"
  instance_class         = "db.t4g.small"
  allocated_storage      = 20
  storage_type           = "gp3"
  max_allocated_storage  = 200
  multi_az               = true
  deletion_protection    = true
  backup_retention_period= 7
  preferred_backup_window= "18:00-20:00"
  auto_minor_version_upgrade = true
  performance_insights_enabled = true
  monitoring_interval    = 60 # enhanced monitoring
  iam_database_authentication_enabled = true # optional
  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [var.rds_sg_id]
  username               = var.db_user
  password               = random_password.db.result
  parameter_group_name   = aws_db_parameter_group.pg.name
  publicly_accessible    = false
  tags = { env = var.env, service = var.service }
}

resource "random_password" "db" {
  length  = 32
  special = false
}

# Store creds in Secrets Manager
resource "aws_secretsmanager_secret" "db" { name = "${var.env}/${var.service}/db" }
resource "aws_secretsmanager_secret_version" "db" {
  secret_id     = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    username = var.db_user,
    password = random_password.db.result,
    host     = aws_db_instance.this.address,
    port     = aws_db_instance.this.port,
    dbname   = var.db_name
  })
}
```

---

# P0: ECS service module (Fargate, autoscaling, circuit breaker)

**modules/ecs-service/variables.tf** (API of the module)

```hcl
variable "service_name" {}
variable "image" {}
variable "cpu" { default = 512 }
variable "memory" { default = 1024 }
variable "desired_count" { default = 2 }
variable "container_port" {}
variable "env" {}
variable "alb_listener_arn" {}
variable "private_subnet_ids" { type = list(string) }
variable "task_role_policies" { type = list(string) } # ARNs
variable "secrets" { type = map(string) }             # env_name -> SSM/Secrets ARN
```

**Key features to implement**

* `deployment_circuit_breaker { enable = true rollback = true }`
* Target-tracking autoscaling on CPU/Mem (50–60%).
* Per-service CloudWatch alarms (5XX on TG, desired vs running mismatch).
* ECR lifecycle policy (keep N images).
* ALB access logs to S3.

---

# P1: Single-account with proper IAM roles and policies

* Create dedicated IAM roles for Terraform operations:
  * `terraform-dev-role` - limited to dev resources
  * `terraform-prod-role` - limited to prod resources
* Use IAM policies with resource-based conditions to enforce environment isolation
* In `providers.tf`:

```hcl
provider "aws" {
  region = var.region
  # Use IAM user/role with appropriate permissions
  default_tags { tags = { env = var.env, owner = "platform", project = var.project } }
}
```

* Add IAM policy conditions to prevent cross-environment resource access

**Environment Isolation Strategy (Single Account)**

```hcl
# IAM policy condition example
{
  "Condition": {
    "StringEquals": {
      "aws:RequestedRegion": "ap-southeast-1"
    },
    "ForAllValues:StringEquals": {
      "aws:TagKeys": ["env", "project"]
    }
  },
  "Effect": "Allow",
  "Action": [
    "ecs:*",
    "rds:*",
    "ec2:*"
  ],
  "Resource": "*",
  "Condition": {
    "StringEquals": {
      "aws:ResourceTag/env": "${aws:PrincipalTag/env}"
    }
  }
}
```

* **Resource naming**: Enforce `{env}-{project}-{resource}` pattern
* **Tag-based access control**: All resources must have `env` tag matching the role
* **Cost allocation**: Use tags for cost tracking per environment

---

# P1: Observability (default-on)

* **OpenTelemetry** distro baked into container images; export to **Grafana Cloud** or **Datadog**.
* CloudWatch:

  * Log groups with retention (dev 14–30d, prod 90d).
  * VPC Flow Logs (CloudWatch or S3).
  * ALB access logs to S3 (lifecycle to Glacier).
* RDS: enable slow query log to CloudWatch, alarm on `DatabaseConnections`, `CPUUtilization`, `FreeStorageSpace`.
* Alarms routed to **SNS → Slack/Webhook**.

---

# P1: Edge & WAF (optional but recommended)

* **CloudFront** in front of ALB:

  * Origin: ALB DNS.
  * Viewer protocol: redirect to HTTPS.
  * HSTS headers.
  * Managed WAF rules: `AWSManagedRulesCommonRuleSet`, `KnownBadInputsRuleSet`, `AWSManagedRulesBotControlRuleSet` (as needed).
  * ACM cert in **us-east-1**.

If you prefer Cloudflare, put CF in front, keep WAF there, and still terminate TLS at ALB.

---

# P1: Cost controls

* `modules/budgets/` that creates:

  * `aws_budgets_budget` per account/env with 80/100/120% thresholds → SNS.
  * **Cost Anomaly Detection** monitors.
* Tag policy: enforce `env`, `service`, `owner`, `cost_center` via OPA/Conftest in CI.
* Prefer **Graviton** (`t4g`, `c7g`) where possible.

---

# CI/CD hardening (GitHub Actions)

* `plan` job: `terraform fmt -check`, `validate`, `tflint`, `checkov`, `conftest` → `terraform plan`.
* `apply` job: `aws-actions/configure-aws-credentials` with OIDC → `terraform apply -auto-approve`.
* No static AWS keys. Period.

Example snippet:

```yaml
permissions:
  id-token: write
  contents: read

- uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::${{ secrets.AWS_ACCOUNT_ID }}:role/gha-deploy-role
    aws-region: ap-southeast-1
```

* Create single OIDC role `gha-deploy-role` with environment-specific permissions
* Use IAM policy conditions to restrict access based on environment tags

---

# Domain/env parameterization (kill hardcodes)

**environments/dev/dev.tfvars**

```hcl
env             = "dev"
project         = "freediving-ph"
zone_name       = "freediving.ph"
subdomains = {
  app = "app.dev"
  api = "api.dev"
}
```

**environments/prod/prod.tfvars**

```hcl
env             = "prod"
project         = "freediving-ph"
zone_name       = "freediving.ph"
subdomains = {
  app = "app"
  api = "api"
}
```

Your Route53 module computes FQDNs as `"${var.subdomains.app}.${var.zone_name}"`.

---

# Migration sequence (safe, minimal downtime)

1. **Create new VPC** (with private+public subnets, endpoints, NAT).
2. **Stand up RDS (new)** with snapshot restore from current; test via bastion/SSM or temporary ECS task.
3. **Bring up ECS services** in new VPC, pointing to **new RDS**; verify health on a **temporary CNAME** (e.g., `app-green.dev.domain`).
4. **Cut over DNS** (Route53/CloudFront) to new ALB; lower TTL beforehand (60s).
5. **Decommission old** ECS/RDS/VPC once stabilized.
6. **Enable WAF** & **budgets**, confirm alarms firing to Slack.

---

# What to give Claude/Cursor (tasks checklist)

1. **Networking module**: add private subnets, endpoints, SGs, variables; wire NAT as toggle.
2. **Remote state**: add KMS key + DynDB lock + bucket policy.
3. **Secrets**: replace tfvars creds with SSM/Secrets; ECS task `secrets {}` blocks.
4. **Route53/ACM**: parameterize, add us-east-1 cert output for CloudFront.
5. **RDS module**: gp3, Multi-AZ, backups, deletion protection, Insights, Enhanced Monitoring, Secrets Manager export.
6. **ECS service module**: Fargate only, circuit breaker, autoscaling, alarms, ECR lifecycle.
7. **IAM roles**: create environment-specific roles with proper permissions and conditions.
8. **CI**: GitHub OIDC role; add lint/scan gates.
9. **Budgets/Anomaly Detection** module + SNS to Slack.
10. **Optionally CloudFront/WAF** module; HSTS headers.

---

# Sanity guardrails (you'll thank me later)

* **One golden service template** (Dockerfile, healthcheck, OTel shim, TF module inputs).
* **No inline IAM** in services—use managed policies attached to per-service task roles.
* **Log retention set** everywhere (no "infinite" CloudWatch).
* **Everything tagged** (`env`, `service`, `owner`, `project`).
* **No public S3**, **no public RDS**, **no ECS in public subnets**. Ever.
* **Environment isolation** via IAM conditions and resource tagging (single account, multiple environments).

---
