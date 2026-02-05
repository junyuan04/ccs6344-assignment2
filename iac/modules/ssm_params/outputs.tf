output "db_username_param" {
  description = "SSM Parameter name for DB username"
  value       = aws_ssm_parameter.db_username.name
}

output "db_password_param" {
  description = "SSM Parameter name for DB password"
  value       = aws_ssm_parameter.db_password.name
}

output "db_host_param" {
  description = "SSM Parameter name for DB host"
  value       = aws_ssm_parameter.db_host.name
}

output "db_port_param" {
  description = "SSM Parameter name for DB port"
  value       = aws_ssm_parameter.db_port.name
}

output "db_name_param" {
  description = "SSM Parameter name for DB name"
  value       = aws_ssm_parameter.db_name.name
}

output "jwt_secret_param" {
  description = "SSM Parameter name for JWT secret"
  value       = aws_ssm_parameter.jwt_secret.name
}

output "jwt_secret_value" {
  description = "JWT secret value (sensitive)"
  value       = random_password.jwt_secret.result
  sensitive   = true
}
