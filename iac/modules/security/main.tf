resource "aws_security_group" "alb_sg" {
  name   = var.alb_sg_name
  vpc_id = var.vpc_id
  description = "ALB SG - allow 443 from internet"

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = var.alb_sg_name }
}

resource "aws_security_group" "app_sg" {
  name   = "app-security-group-v2"
  vpc_id = var.vpc_id
  description = "App SG - allow traffic from ALB"

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
    description     = "Allow ALB to Node.js"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "app-security-group-v2" }
}

resource "aws_security_group" "db_sg" {
  name   = var.db_sg_name
  vpc_id = var.vpc_id
  description = "DB SG - allow 1433 from App"

  ingress {
    from_port       = 1433
    to_port         = 1433
    protocol        = "tcp"
    security_groups = [aws_security_group.app_sg.id]
    description     = "Allow app servers to SQL Server"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = var.db_sg_name }
}
