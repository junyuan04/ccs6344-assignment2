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
