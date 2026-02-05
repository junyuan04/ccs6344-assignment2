resource "aws_kms_key" "this" {
  description = "${var.name_prefix}-kms-key"
  deletion_window_in_days = 7
  tags = { Name = "${var.name_prefix}-kms" }
}

resource "aws_kms_alias" "alias" {
  name          = "alias/${var.name_prefix}-alias"
  target_key_id = aws_kms_key.this.key_id
}

resource "random_password" "db_master" {
  length           = 20
  override_special = "!@#%&*()_+0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
}

resource "aws_secretsmanager_secret" "db_creds" {
  name = "${var.name_prefix}-db-creds"
  description = "DB master credentials for demo"
  tags = { Name = "${var.name_prefix}-db-creds" }
}

resource "aws_secretsmanager_secret_version" "db_creds_version" {
  secret_id     = aws_secretsmanager_secret.db_creds.id
  secret_string = jsonencode({
    username = "dbadmin"
    password = random_password.db_master.result
  })
}

output "kms_key_id" {
  value = aws_kms_key.this.key_id
}

output "secret_arn" {
  value = aws_secretsmanager_secret.db_creds.arn
}

output "db_master_password" {
  value     = random_password.db_master.result
  sensitive = true
}
