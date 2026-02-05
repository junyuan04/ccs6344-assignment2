terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
    random = { source = "hashicorp/random", version = "~> 3.0" }
  }
}

provider "aws" { region = var.region }

resource "random_password" "sql_password" {
  length  = 16
  special = true
  override_special = "!@#$%^&*()-_=+[]{}|:,.<>?"
}

module "network" {
  source = "../../modules/network"
  vpc_cidr = var.vpc_cidr
  azs = var.azs
  public_subnet_cidrs = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  enable_nat = var.enable_nat
}

module "security" {
  source = "../../modules/security"
  vpc_id = module.network.vpc_id
}

module "database_ec2" {
  source = "../../modules/database_ec2"
  vpc_id = module.network.vpc_id
  private_subnet_id = module.network.private_subnets[0]
  db_sg_id = module.security.db_sg_id
  sql_password = random_password.sql_password.result
}

output "sql_server_private_ip" {
  value = module.database_ec2.sql_server_private_ip
}

output "sql_password" {
  value     = random_password.sql_password.result
  sensitive = true
}
