terraform {
  required_providers {
    aws    = { source = "hashicorp/aws", version = "~> 5.0" }
    random = { source = "hashicorp/random", version = "~> 3.0" }
  }
}

provider "aws" { region = "us-east-1" }

resource "random_password" "db_password" {
  length  = 16
  special = false
}

module "network" {
  source               = "../../modules/network"
  vpc_cidr             = var.vpc_cidr
  azs                  = var.azs
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  enable_nat           = var.enable_nat
}

module "security" {
  source = "../../modules/security"
  vpc_id = module.network.vpc_id
}

resource "aws_db_subnet_group" "this" {
  name       = "db-subnet-group"
  subnet_ids = module.network.private_subnets
}

resource "aws_db_instance" "postgres" {
  identifier        = "app-database"
  engine            = "postgres"
  engine_version    = "16.11"
  instance_class    = "db.t3.micro"
  allocated_storage = 20
  storage_type      = "gp2"

  db_name  = "appdb"
  username = "dbadmin"
  password = random_password.db_password.result

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [module.security.db_sg_id]

  publicly_accessible = false
  skip_final_snapshot = true
  storage_encrypted   = true

  multi_az                = false
  backup_retention_period = 7
  apply_immediately       = true
}

module "ssm_params" {
  source = "../../modules/ssm_params"

  name_prefix = "assignment2"
  db_password = random_password.db_password.result
  db_host     = aws_db_instance.postgres.address
  db_port     = aws_db_instance.postgres.port
  db_name     = "appdb"
}

module "edge" {
  source         = "../../modules/edge"
  vpc_id         = module.network.vpc_id
  public_subnets = module.network.public_subnets
  alb_sg_id      = module.security.alb_sg_id
  name_prefix    = "assignment2"
}

module "compute" {
  source = "../../modules/compute"

  name_prefix      = "assignment2"
  public_subnets   = module.network.public_subnets
  app_sg_id        = module.security.app_sg_id
  subnet_id          = module.network.public_subnets[0]
  security_group_id  = module.security.app_sg_id
  target_group_arn = module.edge.target_group_arn

  db_host     = aws_db_instance.postgres.address
  db_port     = tostring(aws_db_instance.postgres.port)
  db_name     = aws_db_instance.postgres.db_name
  db_user     = aws_db_instance.postgres.username
  db_password = random_password.db_password.result
  jwt_secret  = module.ssm_params.jwt_secret_value

  backend_dir = "Database-Assignment1-Backend-master/Database-Assignment1-Backend-master"
  app_port    = 5000
  key_name    = ""

  db_host     = aws_db_instance.postgres.address
  db_port     = aws_db_instance.postgres.port
  db_name     = "appdb"
  db_username = "dbadmin"
  db_password = random_password.db_password.result
  jwt_secret  = "mysecretjwtkey12345"
}

output "vpc_id" { value = module.network.vpc_id }
output "public_subnets" { value = module.network.public_subnets }
output "private_subnets" { value = module.network.private_subnets }
output "alb_sg_id" { value = module.security.alb_sg_id }
output "app_sg_id" { value = module.security.app_sg_id }
output "db_sg_id" { value = module.security.db_sg_id }
output "rds_endpoint" { value = aws_db_instance.postgres.endpoint }
output "rds_address" { value = aws_db_instance.postgres.address }
output "rds_port" { value = aws_db_instance.postgres.port }
output "alb_dns_name" { value = module.edge.alb_dns_name }
output "alb_arn" { value = module.edge.alb_arn }
output "target_group_arn" { value = module.edge.target_group_arn }
output "db_username_param" { value = module.ssm_params.db_username_param }
output "db_password_param" { value = module.ssm_params.db_password_param }
output "db_host_param" { value = module.ssm_params.db_host_param }
output "db_port_param" { value = module.ssm_params.db_port_param }
output "db_name_param" { value = module.ssm_params.db_name_param }
output "jwt_secret_param" { value = module.ssm_params.jwt_secret_param }
output "db_password" {
  value     = random_password.db_password.result
  sensitive = true
}
