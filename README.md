
# CCS6344 Assignment 2 — IaC repo

This repository contains Terraform IaC and app integration for the AWS migration assignment.

## Structure

- iac/ - Terraform infrastructure code

  - modules/ - reusable modules (network, security, database, compute, edge, observability)

  - envs/dev/ - environment-specific integration and tfvars

## Workflow

- Branches:

  - main — final merged code

  - feature/partd-network —  (network & DB)

  - feature/partd-app —  (compute / ALB / app)

## Region and defaults (Academy sandbox)

- Region: us-east-1 (sandbox enforced)

- VPC CIDR: 10.0.0.0/16

- Public subnets: 10.0.1.0/24, 10.0.2.0/24

- Private subnets: 10.0.11.0/24, 10.0.12.0/24

- Test domain: use ALB DNS (no custom domain needed)

