# Generate random passwords
resource "random_password" "jwt_secret" {
  length  = 32
  special = true
  override_special = "!@#$%&*()_+-=[]{}|:"
}

# SSM Parameter Store - DB Username (encrypted with AWS-managed key)
resource "aws_ssm_parameter" "db_username" {
  name        = "/${var.name_prefix}/database/username"
  description = "Database master username"
  type        = "SecureString"  # Encrypted at rest
  value       = "dbadmin"
  
  tags = {
    Name = "${var.name_prefix}-db-username"
  }
}

# SSM Parameter Store - DB Password (encrypted with AWS-managed key)
resource "aws_ssm_parameter" "db_password" {
  name        = "/${var.name_prefix}/database/password"
  description = "Database master password"
  type        = "SecureString"  # Encrypted at rest
  value       = var.db_password  # Will be passed from parent module
  
  tags = {
    Name = "${var.name_prefix}-db-password"
  }
}

# SSM Parameter Store - DB Host
resource "aws_ssm_parameter" "db_host" {
  name        = "/${var.name_prefix}/database/host"
  description = "Database endpoint"
  type        = "String"
  value       = var.db_host
  
  tags = {
    Name = "${var.name_prefix}-db-host"
  }
}

# SSM Parameter Store - DB Port
resource "aws_ssm_parameter" "db_port" {
  name        = "/${var.name_prefix}/database/port"
  description = "Database port"
  type        = "String"
  value       = tostring(var.db_port)
  
  tags = {
    Name = "${var.name_prefix}-db-port"
  }
}

# SSM Parameter Store - DB Name
resource "aws_ssm_parameter" "db_name" {
  name        = "/${var.name_prefix}/database/name"
  description = "Database name"
  type        = "String"
  value       = var.db_name
  
  tags = {
    Name = "${var.name_prefix}-db-name"
  }
}

# SSM Parameter Store - JWT Secret (encrypted)
resource "aws_ssm_parameter" "jwt_secret" {
  name        = "/${var.name_prefix}/app/jwt-secret"
  description = "JWT signing secret for application"
  type        = "SecureString"  # Encrypted at rest
  value       = random_password.jwt_secret.result
  
  tags = {
    Name = "${var.name_prefix}-jwt-secret"
  }
}
