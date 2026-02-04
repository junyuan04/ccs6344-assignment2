variable "engine" {
  type    = string
  default = "postgres"
}

variable "engine_version" {
  type    = string
  default = "13.7"
}

variable "instance_class" {
  type    = string
  default = "db.t3.micro"
}

variable "allocated_storage" {
  type    = number
  default = 20
}

variable "db_name" {
  type    = string
  default = "electricitybilling"
}

variable "db_username" {
  type    = string
  default = "dbadmin"
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "db_sg_id" {
  type = string
}

variable "kms_key_id" {
  type = string
}

variable "master_password" {
  type      = string
  sensitive = true
}

variable "multi_az" {
  type    = bool
  default = false
}
