locals {
  az_index = [for idx,az in var.azs : idx]
}

resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = { Name = "iac-vpc" }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.this.id
  tags   = { Name = "iac-igw" }
}

# create public subnets (one per AZ)
resource "aws_subnet" "public" {
  for_each = { for idx, az in zipmap(local.az_index, var.azs) : idx => az }
  vpc_id            = aws_vpc.this.id
  cidr_block        = var.public_subnet_cidrs[tonumber(each.key)]
  availability_zone = each.value
  map_public_ip_on_launch = true
  tags = { Name = "public-${each.value}" }
}

# create private subnets (one per AZ)
resource "aws_subnet" "private" {
  for_each = { for idx, az in zipmap(local.az_index, var.azs) : idx => az }
  vpc_id            = aws_vpc.this.id
  cidr_block        = var.private_subnet_cidrs[tonumber(each.key)]
  availability_zone = each.value
  map_public_ip_on_launch = false
  tags = { Name = "private-${each.value}" }
}

# public route table + route to IGW
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id
  tags   = { Name = "public-rt" }
}

resource "aws_route" "public_internet_access" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.igw.id
}

resource "aws_route_table_association" "public_assoc" {
  for_each = aws_subnet.public
  subnet_id      = each.value.id
  route_table_id = aws_route_table.public.id
}

# NAT Gateway (single NAT in first public subnet if enabled)
resource "aws_eip" "nat_eip" {
  count = var.enable_nat ? 1 : 0
  domain = "vpc"
}

# pick the first public subnet id for nat gateway placement
locals {
  public_subnet_ids = [for s in aws_subnet.public : s.id]
}

resource "aws_nat_gateway" "nat" {
  count = var.enable_nat ? 1 : 0
  allocation_id = aws_eip.nat_eip[0].id
  subnet_id     = local.public_subnet_ids[0]
  depends_on = [aws_internet_gateway.igw]
  tags = { Name = "iac-nat" }
}

# private route table that points to NAT (for internet egress)
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.this.id
  tags   = { Name = "private-rt" }
}

resource "aws_route" "private_nat" {
  count = var.enable_nat ? 1 : 0
  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.nat[0].id
}

resource "aws_route_table_association" "private_assoc" {
  for_each = aws_subnet.private
  subnet_id      = each.value.id
  route_table_id = aws_route_table.private.id
}
