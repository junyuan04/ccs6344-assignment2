data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

resource "aws_iam_role" "ec2_role" {
  name = "assignment2-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action = "sts:AssumeRole",
      Effect = "Allow",
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "assignment2-ec2-profile"
  role = aws_iam_role.ec2_role.name
}

# allow SSM agent basic + instance managed
resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# allow reading your parameter store values
resource "aws_iam_policy" "ssm_read_params" {
  name = "assignment2-ssm-read-params"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath"],
        Resource = "arn:aws:ssm:us-east-1:374832594034:parameter/assignment2/*"
      },
      {
        Effect = "Allow",
        Action = ["kms:Decrypt"],
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ssm_read_attach" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = aws_iam_policy.ssm_read_params.arn
}

resource "aws_instance" "app" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = "t3.micro"
  subnet_id              = var.public_subnets[0]
  vpc_security_group_ids = [var.app_sg_id]

  iam_instance_profile = aws_iam_instance_profile.ec2_profile.name


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
    PORT=5000
    DB_HOST=$${DB_HOST_FROM_SSM}
    DB_PORT=$${DB_PORT_FROM_SSM}
    DB_NAME=$${DB_NAME_FROM_SSM}
    DB_USER=$${DB_USER_FROM_SSM}
    DB_PASSWORD=$${DB_PASSWORD_FROM_SSM}
    DB_SSL=true
    JWT_SECRET=$${JWT_FROM_SSM}
    ENVEOF

    npm ci || npm install

    # use nohup launch
    nohup node src/server.js > /var/log/app.log 2>&1 &

    sleep 5
    ss -lntp | grep :${var.app_port} || true
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
