variable "name_prefix" {
  description = "Prefix used for naming edge resources"
  type        = string
}
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

variable "enable_https" {
  type    = bool
  default = false
}

variable "certificate_arn" {
  type    = string
  default = ""
}