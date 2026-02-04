variable "vpc_id" {
  type = string
}

variable "alb_sg_name" {
  type    = string
  default = "alb-security-group"
}

variable "app_sg_name" {
  type    = string
  default = "app-security-group"
}

variable "db_sg_name" {
  type    = string
  default = "db-security-group"
}
