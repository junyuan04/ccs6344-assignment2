variable "vpc_id" {
  type = string
}

variable "private_subnet_id" {
  type = string
}

variable "db_sg_id" {
  type = string
}

variable "sql_password" {
  type      = string
  sensitive = true
}

variable "instance_type" {
  type    = string
  default = "t3.small"
}
