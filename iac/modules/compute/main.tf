data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

resource "aws_instance" "app" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = "t3.micro"
  subnet_id              = var.public_subnets[0]
  vpc_security_group_ids = [var.app_sg_id]

  key_name = "assignment2-key"

  user_data = <<-USERDATA
#!/bin/bash
exec > /var/log/user-data.log 2>&1
set -ex

yum update -y
yum install -y git

curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

cd /home/ec2-user
rm -rf apprepo
git clone https://github.com/junyuan04/ccs6344-assignment2.git apprepo

cd /home/ec2-user/apprepo/${var.backend_dir}

echo "PORT=${var.app_port}" > .env
echo "JWT_SECRET=${var.jwt_secret}" >> .env
echo "DB_HOST=${var.db_host}" >> .env
echo "DB_PORT=${var.db_port}" >> .env
echo "DB_NAME=${var.db_name}" >> .env
echo "DB_USER=${var.db_username}" >> .env
echo "DB_PASSWORD=${var.db_password}" >> .env
echo "DB_SSL=true" >> .env

npm ci || npm install

nohup node src/server.js > /var/log/app.log 2>&1 &

sleep 5
ss -lntp | grep :${var.app_port} || echo "Port not listening yet"
USERDATA

  tags = {
    Name = "${var.name_prefix}-app"
  }
}

resource "aws_lb_target_group_attachment" "app" {
  target_group_arn = var.target_group_arn
  target_id        = aws_instance.app.id
  port             = var.app_port
}
