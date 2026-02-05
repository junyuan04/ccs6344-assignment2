# Part D: Secure Implementation on AWS - Person A

## Infrastructure Deployed

### 1. Network Layer (VPC Architecture)

**VPC Configuration:**
- VPC CIDR: 10.0.0.0/16
- Region: us-east-1
- Availability Zones: us-east-1a, us-east-1b

**Subnet Architecture:**
```
Public Subnets (for internet-facing resources):
  • 10.0.1.0/24 (us-east-1a) - For ALB
  • 10.0.2.0/24 (us-east-1b) - For ALB

Private Subnets (for application and database):
  • 10.0.11.0/24 (us-east-1a) - For App servers & RDS
  • 10.0.12.0/24 (us-east-1b) - For App servers & RDS
```

**Routing:**
- Public route table: Routes to Internet Gateway (0.0.0.0/0 → IGW)
- Private route table: Routes to NAT Gateway (0.0.0.0/0 → NAT)
- NAT Gateway: Deployed in public subnet for private subnet internet access

**Justification:**
The multi-AZ design provides high availability. Public/private subnet separation follows the principle of least privilege by ensuring backend components are not directly accessible from the internet.

---

### 2. Security Layer

**Security Groups (Stateful Firewall Rules):**

| Security Group | Purpose | Inbound Rules | Outbound Rules |
|----------------|---------|---------------|----------------|
| sg-alb | Load Balancer | Port 443 from 0.0.0.0/0 | All traffic |
| sg-app | Application Tier | Port 5000 from sg-alb only | All traffic |
| sg-db | Database Tier | Port 5432 from sg-app only | All traffic |

**Defense-in-Depth Implementation:**
1. Only ALB is internet-accessible
2. Application tier only accepts traffic from ALB
3. Database tier only accepts traffic from application tier
4. No direct internet access to backend components

---

### 3. Database Layer (Amazon RDS)

**RDS Configuration:**
- Engine: PostgreSQL 16.11
- Instance Class: db.t3.micro
- Storage: 20GB General Purpose SSD (gp2)
- Encryption: ✅ Enabled (AWS-managed KMS key)
- Multi-AZ: ❌ Disabled (AWS Academy Sandbox limitation)
- Backup Retention: 7 days
- Publicly Accessible: ❌ No
- Deployment: Private subnets only

**Security Measures:**
- ✅ Encryption at rest (AWS-managed KMS)
- ✅ Private subnet deployment (no internet access)
- ✅ Security group restricts access to application tier only
- ✅ Automated backups enabled
- ✅ Database credentials stored securely (SSM Parameter Store)

---

### 4. Secrets Management (SSM Parameter Store)

**Challenge:** AWS Academy Sandbox does not support AWS Secrets Manager or custom KMS key creation.

**Solution:** We implemented **AWS Systems Manager Parameter Store** with SecureString encryption:

| Parameter Name | Type | Encryption | Purpose |
|----------------|------|------------|---------|
| `/assignment2/database/username` | SecureString | ✅ Yes | DB username |
| `/assignment2/database/password` | SecureString | ✅ Yes | DB password |
| `/assignment2/database/host` | String | N/A | DB endpoint |
| `/assignment2/database/port` | String | N/A | DB port |
| `/assignment2/database/name` | String | N/A | DB name |
| `/assignment2/app/jwt-secret` | SecureString | ✅ Yes | JWT secret |

**Security Benefits:**
- No hardcoded credentials in code or configuration files
- SecureString parameters encrypted at rest with AWS-managed KMS
- IAM policies control access to parameters
- CloudTrail logs all parameter access for audit trail
- Credentials can be rotated without code changes

---

## AWS Academy Sandbox Limitations & Mitigations

| Requirement | Sandbox Limitation | Our Implementation | Security Equivalence |
|-------------|-------------------|-------------------|---------------------|
| Customer-managed KMS keys | ❌ Read-only access | AWS-managed encryption | ✅ Same encryption strength (FIPS 140-2) |
| AWS Secrets Manager | ❌ Not available | SSM Parameter Store (SecureString) | ✅ Encrypted at rest, IAM-controlled |
| Multi-AZ RDS | ❌ Explicitly not supported | Single-AZ + 7-day backups | ⚠️ Documented for production upgrade |

**Production Implementation Code:**

In a full AWS environment, we would use:
```hcl
# Custom KMS key for encryption
resource "aws_kms_key" "rds" {
  description             = "RDS encryption key"
  enable_key_rotation     = true
  deletion_window_in_days = 30
}

# Multi-AZ RDS deployment
resource "aws_db_instance" "prod" {
  engine            = "postgres"
  multi_az          = true  # High availability
  storage_encrypted = true
  kms_key_id        = aws_kms_key.rds.arn
  # ... other settings
}

# AWS Secrets Manager with rotation
resource "aws_secretsmanager_secret" "db_creds" {
  name = "prod/database/credentials"
  rotation_rules {
    automatically_after_days = 30
  }
}
```

---

## Infrastructure as Code (Terraform)

**Module Structure:**
```
iac/
├── modules/
│   ├── network/        # VPC, subnets, routing, NAT
│   ├── security/       # Security groups
│   └── ssm_params/     # Parameter Store for secrets
└── envs/
    └── dev/
        ├── main.tf     # Main configuration
        ├── variables.tf
        └── terraform.tfvars
```

**Terraform Modules Created:**

1. **Network Module:** VPC, subnets, Internet Gateway, NAT Gateway, route tables
2. **Security Module:** Security groups with least-privilege rules
3. **SSM Params Module:** Encrypted parameter storage for credentials

**Code Quality:**
- ✅ Modular and reusable
- ✅ Well-documented with comments
- ✅ Follows Terraform best practices
- ✅ Sensitive values marked appropriately
- ✅ Version controlled in GitHub

---

## Evidence

See `docs/evidence/` directory for:
1. VPC dashboard screenshot
2. Subnets configuration screenshot
3. Security groups with rules screenshot
4. RDS instance showing encryption enabled screenshot
5. SSM Parameter Store showing encrypted parameters screenshot
6. Terraform deployment output screenshot

---

## GitHub Repository

All code is available at:
- Network infrastructure: `iac/modules/network/`
- Security configurations: `iac/modules/security/`
- Secrets management: `iac/modules/ssm_params/`
- Deployment configuration: `iac/envs/dev/`

GitHub Link: [Your GitHub URL]

---

## Handoff to Person B

Person B can use the deployed infrastructure by referencing:
- `outputs/person-a-outputs.json` - All infrastructure IDs and endpoints
- `outputs/PERSON_B_INTEGRATION_GUIDE.md` - Integration instructions
- `outputs/INFRASTRUCTURE_SUMMARY.txt` - Human-readable summary

Person B needs to deploy:
1. Application Load Balancer in public subnets
2. EC2 instances in private subnets with application code
3. Target groups connecting ALB to EC2

---
