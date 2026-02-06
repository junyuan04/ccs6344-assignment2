variable "name_prefix" { type = string }

variable "public_subnets" { type = list(string) }
variable "app_sg_id" { type = string }

variable "target_group_arn" { type = string }

variable "backend_dir" {
  type    = string
  default = "Database-Assignment1-Backend-master/Database-Assignment1-Backend-master"
}

variable "app_port" {
  type    = number
  default = 5000
}

variable "key_name" {
  type    = string
  default = ""
}

variable "db_host" {
  type = string
}

variable "db_port" {
  type    = number
  default = 5432
}

variable "db_name" {
  type = string
}

variable "db_username" {
  type = string
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "jwt_secret" {
  type      = string
  sensitive = true
}
