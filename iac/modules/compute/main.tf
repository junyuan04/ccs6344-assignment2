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
    #!/bin/bash
    set -euxo pipefail

    yum update -y
    yum install -y git

    # install Node.js 18
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    yum install -y nodejs

    cd /home/ec2-user
    rm -rf apprepo
    git clone https://github.com/junyuan04/ccs6344-assignment2 apprepo

    cd /home/ec2-user/apprepo/${var.backend_dir}

    # create .env
    cat > .env <<'ENVEOF'
    PORT=${var.app_port}
    DB_HOST=${var.db_host}
    DB_PORT=${var.db_port}
    DB_NAME=${var.db_name}
    DB_USER=${var.db_user}
    DB_PASSWORD=${var.db_password}
    JWT_SECRET=${var.jwt_secret}
    ENVEOF

    cd /home/ec2-user/apprepo/Database-Assignment1-Backend-master/Database-Assignment1-Backend-master
    
    npm ci || npm install

    # use nohup launch
    nohup node server.js > /var/log/app.log 2>&1 &

    sleep 5
    ss -lntp | grep :${var.app_port} || (echo "PORT NOT LISTENING"; tail -n 120 /var/log/app.log || true)
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
