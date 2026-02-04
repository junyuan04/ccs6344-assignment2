
terraform {

  required_providers {

    aws = {

      source  = "hashicorp/aws"

      version = "~> 5.0"

    }

  }

}

provider "aws" {

  region = var.region

}

# call network module

module "network" {

  source               = "../../modules/network"

  vpc_cidr             = var.vpc_cidr

  azs                  = var.azs

  public_subnet_cidrs  = var.public_subnet_cidrs

  private_subnet_cidrs = var.private_subnet_cidrs

  enable_nat           = var.enable_nat

}

# call security module

module "security" {

  source = "../../modules/security"

  vpc_id = module.network.vpc_id

}

# other modules will consume outputs from network/security

# compute/edge modules here later

