resource "aws_kms_key" "this" {
  description = "${var.name_prefix}-kms-key"
  deletion_window_in_days = 7
}

resource "aws_kms_alias" "alias" {
  name          = "alias/${var.name_prefix}-alias"
  target_key_id = aws_kms_key.this.key_id
}

# Generate a secure random password for the database
resource "random_password" "db_master" {
  length           = 20
  special          = true
  override_special = "!@#%&*()_+"
}

output "kms_key_id" { 
  value = aws_kms_key.this.key_id 
}

output "db_master_password" { 
  value     = random_password.db_master.result
  sensitive = true 
}
