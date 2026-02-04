variable "name_prefix" { type = string }
variable "vpc_id" { type = string }
variable "public_subnets" { type = list(string) }
variable "alb_sg_id" { type = string }

variable "target_port" {
  type    = number
  default = 5000
}

variable "health_check_path" {
  type    = string
  default = "/api/health"
}

# 先默认不开 HTTPS（你们之后再上 ACM/WAF）
variable "enable_https" {
  type    = bool
  default = false
}

variable "certificate_arn" {
  type    = string
  default = ""
}