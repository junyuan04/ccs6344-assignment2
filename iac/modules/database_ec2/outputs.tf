output "sql_server_private_ip" {
  value = aws_instance.sql_server.private_ip
}

output "sql_server_id" {
  value = aws_instance.sql_server.id
}
