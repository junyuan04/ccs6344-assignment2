resource "aws_db_subnet_group" "this" {
  name       = "iac-db-subnet-group"
  subnet_ids = var.private_subnet_ids
}

resource "aws_db_instance" "this" {
  identifier         = "iac-db-instance"
  engine             = var.engine
  engine_version     = var.engine_version
  instance_class     = var.instance_class
  allocated_storage  = var.allocated_storage
  db_subnet_group_name = aws_db_subnet_group.this.name
  vpc_security_group_ids = [var.db_sg_id]
  db_name            = var.db_name
  username           = var.db_username
  password           = var.master_password
  publicly_accessible = false
  storage_encrypted  = true
  kms_key_id         = var.kms_key_id
  skip_final_snapshot = true
  auto_minor_version_upgrade = true
  backup_retention_period = 7
  apply_immediately = true
  multi_az = var.multi_az
}
