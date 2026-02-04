terraform {
  required_providers {
    aws    = { source = "hashicorp/aws", version = "~> 5.0" }
    random = { source = "hashicorp/random", version = "~> 3.0" }
  }
}

provider "aws" { region = var.region }

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

module "kms_secrets" {
  source      = "../../modules/kms_secrets"
  name_prefix = "assignment2"
}

module "database" {
  source             = "../../modules/database"
  engine             = "postgres"
  engine_version     = "13.7"
  instance_class     = "db.t3.micro"
  allocated_storage  = 20
  db_name            = "electricitybilling"
  db_username        = "dbadmin"
  vpc_id             = module.network.vpc_id
  private_subnet_ids = module.network.private_subnets
  db_sg_id           = module.security.db_sg_id
  kms_key_id         = module.kms_secrets.kms_key_id
  master_password    = module.kms_secrets.db_master_password
  multi_az           = false
}

module "edge" {
  source = "../../modules/edge"

  name_prefix    = var.name_prefix
  vpc_id         = module.network.vpc_id
  public_subnets = module.network.public_subnets
  alb_sg_id      = module.security.alb_sg_id

  target_port        = 5000
  health_check_path  = "/api/health"

  enable_https   = false
  certificate_arn = ""
}

module "compute" {
  source = "../../modules/compute"

  name_prefix       = var.name_prefix
  public_subnets    = module.network.public_subnets
  app_sg_id         = module.security.app_sg_id
  target_group_arn  = module.edge.target_group_arn

  backend_dir = "Database-Assignment1-Backend-master/Database-Assignment1-Backend-master"
  app_port    = 5000

  key_name = "" 
}
