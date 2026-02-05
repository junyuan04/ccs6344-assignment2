# Find Windows Server 2019 with SQL Server Express AMI
data "aws_ami" "windows_sql" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["Windows_Server-2019-English-Full-SQL*Express*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "sql_server" {
  ami           = data.aws_ami.windows_sql.id
  instance_type = var.instance_type
  subnet_id     = var.private_subnet_id
  
  vpc_security_group_ids = [var.db_sg_id]
  
  iam_instance_profile = "LabInstanceProfile"
  
  # Removed root_block_device - use AMI defaults to avoid permission issues

  user_data = <<-EOT
    <powershell>
    # Set SQL Server SA password
    $password = "${var.sql_password}"
    $securePassword = ConvertTo-SecureString $password -AsPlainText -Force
    
    # Enable SQL Server authentication
    Import-Module SQLPS -DisableNameChecking
    $server = New-Object Microsoft.SqlServer.Management.Smo.Server("localhost")
    $server.Settings.LoginMode = [Microsoft.SqlServer.Management.SMO.ServerLoginMode]::Mixed
    $server.Alter()
    
    # Set SA password
    $login = $server.Logins["sa"]
    $login.PasswordPolicyEnforced = $false
    $login.ChangePassword($password)
    $login.Enable()
    $login.Alter()
    
    # Restart SQL Server service
    Restart-Service MSSQLSERVER -Force
    
    # Configure firewall
    New-NetFirewallRule -DisplayName "SQL Server" -Direction Inbound -LocalPort 1433 -Protocol TCP -Action Allow
    </powershell>
  EOT
}
