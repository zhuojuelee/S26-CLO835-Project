variable "aws_region" { type = string }
variable "vpc_id" { type = string }
variable "instance_id" { type = string }

provider "aws" {
  region = var.aws_region
}

data "aws_instance" "target_ec2" {
  instance_id = var.instance_id
}

data "aws_subnets" "all_vpc_subnets" {
  filter {
    name   = "vpc-id"
    values = [var.vpc_id]
  }
}

# Target Group (Targets Port 30080)
resource "aws_lb_target_group" "tg" {
  name        = "clo835-project-tg"
  port        = 30080
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "instance"
}

# Attach EC2 instance to the target group
resource "aws_lb_target_group_attachment" "tg_attachment" {
  target_group_arn = aws_lb_target_group.tg.arn
  target_id        = var.instance_id
  port             = 30080
}

# Security Group for ALB (Allows public HTTP)
resource "aws_security_group" "alb_sg" {
  name   = "clo835-project-alb-sg"
  vpc_id = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_lb" "alb" {
  name               = "clo835-project-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]

  subnets = [
    data.aws_instance.target_ec2.subnet_id,
    element([for id in data.aws_subnets.all_vpc_subnets.ids : id if id != data.aws_instance.target_ec2.subnet_id], 0)
  ]
}

# ALB Listener (Listens on 80 -> Forwards to TG on 30080)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tg.arn
  }
}

output "alb_url" {
  value = "http://${aws_lb.alb.dns_name}"
}
