# Person B - How to Use Person A's Infrastructure

## 📦 Infrastructure Available

Person A has deployed the foundation:
- ✅ VPC with public/private subnets across 2 AZs
- ✅ Security Groups (ALB, App, DB)
- ✅ PostgreSQL RDS database (encrypted, private)
- ✅ Credentials stored in SSM Parameter Store

---

## 🔧 Step 1: Use These Values in Your Terraform
```hcl
# In your iac/envs/dev/terraform.tfvars or variables

vpc_id = "vpc-0b422687a16b17d3f"

public_subnets = [
  "subnet-0f334077bcba9fe20",  # us-east-1a
  "subnet-06a2d31723ae9a28c"   # us-east-1b
]

private_subnets = [
  "subnet-0b510eb82e957b545",  # us-east-1a
  "subnet-033a8264cb2c5d901"   # us-east-1b
]

alb_sg_id = "sg-0d05c3ce321d7b1f0"
app_sg_id = "sg-0d6db97f252093840"
db_sg_id  = "sg-0d41d364ffaa02c72"

rds_endpoint = "app-database.cdzfgknu2gha.us-east-1.rds.amazonaws.com:5432"
```

---

## 🔐 Step 2: Retrieve Credentials from SSM

### In EC2 User Data (when launching instances):
```bash
#!/bin/bash
# Install dependencies
yum update -y
yum install -y aws-cli

# Retrieve database credentials from SSM
export DB_HOST=$(aws ssm get-parameter \
  --name "/assignment2/database/host" \
  --region us-east-1 \
  --query 'Parameter.Value' \
  --output text)

export DB_PORT=$(aws ssm get-parameter \
  --name "/assignment2/database/port" \
  --region us-east-1 \
  --query 'Parameter.Value' \
  --output text)

export DB_NAME=$(aws ssm get-parameter \
  --name "/assignment2/database/name" \
  --region us-east-1 \
  --query 'Parameter.Value' \
  --output text)

export DB_USER=$(aws ssm get-parameter \
  --name "/assignment2/database/username" \
  --region us-east-1 \
  --with-decryption \
  --query 'Parameter.Value' \
  --output text)

export DB_PASSWORD=$(aws ssm get-parameter \
  --name "/assignment2/database/password" \
  --region us-east-1 \
  --with-decryption \
  --query 'Parameter.Value' \
  --output text)

export JWT_SECRET=$(aws ssm get-parameter \
  --name "/assignment2/app/jwt-secret" \
  --region us-east-1 \
  --with-decryption \
  --query 'Parameter.Value' \
  --output text)

# Create .env file for your Node.js app
cat > /home/ec2-user/app/.env << ENVEOF
DATABASE_HOST=$DB_HOST
DATABASE_PORT=$DB_PORT
DATABASE_NAME=$DB_NAME
DATABASE_USER=$DB_USER
DATABASE_PASSWORD=$DB_PASSWORD
JWT_SECRET=$JWT_SECRET
ENVEOF
```

### In Python (Boto3):
```python
import boto3

ssm = boto3.client('ssm', region_name='us-east-1')

# Get database credentials
db_host = ssm.get_parameter(Name='/assignment2/database/host')['Parameter']['Value']
db_password = ssm.get_parameter(
    Name='/assignment2/database/password',
    WithDecryption=True
)['Parameter']['Value']
```

---

## 🚀 Step 3: Deploy Your Components

You need to create:

1. **Application Load Balancer (ALB)**
   - Deploy in public subnets: `subnet-0f334077bcba9fe20`, `subnet-06a2d31723ae9a28c`
   - Use security group: `sg-0d05c3ce321d7b1f0`
   - Configure HTTPS listener (port 443)

2. **EC2 Instances (Application Tier)**
   - Deploy in private subnets: `subnet-0b510eb82e957b545`, `subnet-033a8264cb2c5d901`
   - Use security group: `sg-0d6db97f252093840`
   - Attach **LabInstanceProfile** (has SSM permissions)
   - User data script retrieves credentials from SSM

3. **Target Group**
   - Health check path: `/health` or `/`
   - Port: 5000 (your Node.js app port)

---

## ✅ IAM Permissions

The **LabRole** (attached via LabInstanceProfile) already has permissions to:
- ✅ Read from SSM Parameter Store
- ✅ Connect to RDS in same VPC
- ✅ Write CloudWatch logs

No additional IAM configuration needed!

---

## 🔍 Testing Database Connection

From your EC2 instance, test the connection:
```bash
# Install PostgreSQL client
sudo yum install -y postgresql15

# Test connection
psql -h app-database.cdzfgknu2gha.us-east-1.rds.amazonaws.com \
     -p 5432 \
     -U dbadmin \
     -d appdb
# Enter password when prompted
```

---

## 📊 Network Flow
```
Internet → ALB (public subnets, sg-alb)
           ↓
        EC2 App (private subnets, sg-app)
           ↓
        RDS DB (private subnets, sg-db)
```

Only the ALB is internet-facing. App and DB are fully private.

---

## 🆘 Troubleshooting

**Can't retrieve SSM parameters?**
- Ensure EC2 has LabInstanceProfile attached
- Check region is `us-east-1`

**Can't connect to RDS?**
- Ensure EC2 has security group `sg-app`
- Ensure EC2 is in same VPC: `vpc-0b422687a16b17d3f`
- Check RDS security group allows port 5432 from sg-app

**App can't reach internet?**
- Private subnets have NAT Gateway configured
- Check route tables

---

Good luck with your deployment! 🚀
