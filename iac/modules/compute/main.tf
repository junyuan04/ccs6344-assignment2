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


  key_name = var.key_name != "" ? var.key_name : null

  user_data = <<-USERDATA
  exec > >(tee /var/log/user-data.log | logger -t user-data -s 2>/dev/console) 2>&1
set -euxo pipefail
    #!/bin/bash
set -euxo pipefail

yum update -y
yum install -y git

# Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs

APP_DIR="/home/ec2-user/apprepo"
BACKEND_DIR="Database-Assignment1-Backend-master/Database-Assignment1-Backend-master"  # <<< 改这里（server.js 所在目录）

rm -rf "$APP_DIR"
git clone https://github.com/junyuan04/ccs6344-assignment2 "$APP_DIR"

cd "$APP_DIR/$BACKEND_DIR"
npm ci || npm install

cat > .env <<EOT
PORT=${var.app_port}
DB_HOST=${var.db_host}
DB_USER=${var.db_user}
DB_PASSWORD=${var.db_password}
DB_NAME=${var.db_name}
DB_PORT=${var.db_port}
JWT_SECRET=${var.jwt_secret}
EOT

# systemd service
cat > /etc/systemd/system/ebs-backend.service <<'SERVICE'
[Unit]
Description=EBS Backend
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/ec2-user/apprepo/Database-Assignment1-Backend-master/Database-Assignment1-Backend-master
EnvironmentFile=/etc/ebs-backend.env
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3
User=ec2-user

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable --now ebs-backend

sleep 3
systemctl status ebs-backend --no-pager -l
ss -lntp | grep :${var.app_port} || true
curl -i http://127.0.0.1:${var.app_port}/api/health || true
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
