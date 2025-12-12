# AWS Amplify Deployment Guide for Profolia.art

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Route 53 (DNS)                         │
│              profolia.art, www.profolia.art                 │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   CloudFront CDN                            │
│        - SSL/TLS Certificates (ACM)                         │
│        - Global Edge Locations                              │
│        - Custom Domain                                       │
└─────────────┬─────────────────────────────────┬─────────────┘
              │                                 │
              ▼                                 ▼
┌─────────────────────────┐       ┌─────────────────────────┐
│   AWS Amplify Hosting   │       │    S3 (Portfolios)      │
│   - Frontend (React)    │       │  - Generated HTML       │
│   - CI/CD from GitHub   │       │  - Media Assets         │
│   - Auto-scaling        │       │                         │
└─────────────────────────┘       └─────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│              Application Load Balancer (ALB)                │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│           EC2 Auto Scaling Group / ECS Fargate              │
│              Backend API (Node.js + Express)                │
└─────────────┬───────────────────────────────────────────────┘
              │
    ┌─────────┴─────────┬──────────────────┐
    ▼                   ▼                  ▼
┌─────────┐      ┌──────────┐      ┌──────────────┐
│ RDS     │      │ S3       │      │ Secrets      │
│ Postgres│      │ Storage  │      │ Manager      │
└─────────┘      └──────────┘      └──────────────┘
```

## Step 1: Prerequisites Setup

### 1.1 AWS Account Setup

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS credentials
aws configure
# Enter: Access Key ID, Secret Access Key, Region (us-east-1), Output (json)
```

### 1.2 Create IAM User for Deployment

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "amplify:*",
        "s3:*",
        "rds:*",
        "ec2:*",
        "ecs:*",
        "cloudfront:*",
        "route53:*",
        "acm:*",
        "secretsmanager:*"
      ],
      "Resource": "*"
    }
  ]
}
```

## Step 2: Infrastructure as Code (Terraform)

```hcl
# terraform/main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "profolia-vpc"
  }
}

# Subnets
resource "aws_subnet" "public_1" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"

  tags = {
    Name = "profolia-public-1"
  }
}

resource "aws_subnet" "public_2" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "us-east-1b"

  tags = {
    Name = "profolia-public-2"
  }
}

resource "aws_subnet" "private_1" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.11.0/24"
  availability_zone = "us-east-1a"

  tags = {
    Name = "profolia-private-1"
  }
}

resource "aws_subnet" "private_2" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.12.0/24"
  availability_zone = "us-east-1b"

  tags = {
    Name = "profolia-private-2"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "profolia-igw"
  }
}

# RDS PostgreSQL
resource "aws_db_subnet_group" "main" {
  name       = "profolia-db-subnet"
  subnet_ids = [aws_subnet.private_1.id, aws_subnet.private_2.id]

  tags = {
    Name = "profolia-db-subnet"
  }
}

resource "aws_db_instance" "postgres" {
  identifier             = "profolia-db"
  engine                 = "postgres"
  engine_version         = "15.4"
  instance_class         = "db.t3.micro"
  allocated_storage      = 20
  storage_type           = "gp3"
  db_name                = "profolia"
  username               = "profolia_admin"
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  skip_final_snapshot    = false
  final_snapshot_identifier = "profolia-final-snapshot"
  backup_retention_period = 7

  tags = {
    Name = "profolia-postgres"
  }
}

# Security Group for RDS
resource "aws_security_group" "rds" {
  name        = "profolia-rds-sg"
  description = "Security group for RDS"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.backend.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# S3 Bucket for Media Storage
resource "aws_s3_bucket" "media" {
  bucket = "profolia-media-${random_id.bucket_suffix.hex}"

  tags = {
    Name = "profolia-media"
  }
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

resource "aws_s3_bucket_public_access_block" "media" {
  bucket = aws_s3_bucket.media.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "media" {
  bucket = aws_s3_bucket.media.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.media.arn}/*"
      }
    ]
  })
}

# S3 Bucket for Portfolio HTML
resource "aws_s3_bucket" "portfolios" {
  bucket = "profolia-portfolios-${random_id.bucket_suffix.hex}"

  tags = {
    Name = "profolia-portfolios"
  }
}

# ECS Cluster for Backend
resource "aws_ecs_cluster" "backend" {
  name = "profolia-backend-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# Security Group for Backend
resource "aws_security_group" "backend" {
  name        = "profolia-backend-sg"
  description = "Security group for backend ECS tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Application Load Balancer
resource "aws_security_group" "alb" {
  name        = "profolia-alb-sg"
  description = "Security group for ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
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
}

resource "aws_lb" "backend" {
  name               = "profolia-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = [aws_subnet.public_1.id, aws_subnet.public_2.id]

  tags = {
    Name = "profolia-alb"
  }
}

# Outputs
output "rds_endpoint" {
  value = aws_db_instance.postgres.endpoint
}

output "s3_media_bucket" {
  value = aws_s3_bucket.media.bucket
}

output "s3_portfolios_bucket" {
  value = aws_s3_bucket.portfolios.bucket
}

output "alb_dns_name" {
  value = aws_lb.backend.dns_name
}
```

## Step 3: Backend Deployment (ECS Fargate)

### 3.1 Dockerfile for Backend

```dockerfile
# backend/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### 3.2 ECS Task Definition

```json
{
  "family": "profolia-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "<AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/profolia-backend:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3000"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:<ACCOUNT_ID>:secret:profolia/db-url"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:<ACCOUNT_ID>:secret:profolia/jwt-secret"
        },
        {
          "name": "ANTHROPIC_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:<ACCOUNT_ID>:secret:profolia/anthropic-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/profolia-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "backend"
        }
      }
    }
  ]
}
```

### 3.3 Deployment Script

```bash
#!/bin/bash
# deploy-backend.sh

set -e

AWS_REGION="us-east-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPO_NAME="profolia-backend"
IMAGE_TAG="latest"

echo "Building Docker image..."
cd backend
docker build -t ${ECR_REPO_NAME}:${IMAGE_TAG} .

echo "Authenticating with ECR..."
aws ecr get-login-password --region ${AWS_REGION} | \
  docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

echo "Creating ECR repository if it doesn't exist..."
aws ecr describe-repositories --repository-names ${ECR_REPO_NAME} --region ${AWS_REGION} || \
  aws ecr create-repository --repository-name ${ECR_REPO_NAME} --region ${AWS_REGION}

echo "Tagging and pushing image..."
docker tag ${ECR_REPO_NAME}:${IMAGE_TAG} \
  ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}:${IMAGE_TAG}

docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}:${IMAGE_TAG}

echo "Updating ECS service..."
aws ecs update-service \
  --cluster profolia-backend-cluster \
  --service profolia-backend-service \
  --force-new-deployment \
  --region ${AWS_REGION}

echo "Backend deployment complete!"
```

## Step 4: Frontend Deployment (AWS Amplify)

### 4.1 Amplify Configuration

```yaml
# amplify.yml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: build
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
  customHeaders:
    - pattern: '**/*'
      headers:
        - key: 'Strict-Transport-Security'
          value: 'max-age=31536000; includeSubDomains'
        - key: 'X-Frame-Options'
          value: 'SAMEORIGIN'
        - key: 'X-Content-Type-Options'
          value: 'nosniff'
        - key: 'X-XSS-Protection'
          value: '1; mode=block'
```

### 4.2 Environment Variables in Amplify

```bash
# Set in AWS Amplify Console
REACT_APP_API_URL=https://api.profolia.art
REACT_APP_ENV=production
```

### 4.3 Custom Domain Setup in Amplify

1. Go to AWS Amplify Console
2. Select your app
3. Click "Domain management"
4. Add custom domain: `profolia.art` and `www.profolia.art`
5. Follow DNS verification steps
6. Wait for SSL certificate provisioning

### 4.4 Rewrites and Redirects

```json
[
  {
    "source": "/<*>",
    "target": "/index.html",
    "status": "404-200",
    "condition": null
  },
  {
    "source": "</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|ttf|map|json)$)([^.]+$)/>",
    "target": "/index.html",
    "status": "200",
    "condition": null
  }
]
```

## Step 5: CI/CD Pipeline Setup

### 5.1 GitHub Actions for Backend

```yaml
# .github/workflows/deploy-backend.yml
name: Deploy Backend to ECS

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: profolia-backend
  ECS_SERVICE: profolia-backend-service
  ECS_CLUSTER: profolia-backend-cluster

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Build, tag, and push image to Amazon ECR
        id: build-image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          cd backend
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT
      
      - name: Update ECS service
        run: |
          aws ecs update-service \
            --cluster ${{ env.ECS_CLUSTER }} \
            --service ${{ env.ECS_SERVICE }} \
            --force-new-deployment
```

### 5.2 Amplify Auto-Deploy

Amplify automatically deploys when you push to the connected GitHub branch. Configure in Amplify Console:

1. Connect GitHub repository
2. Select branch (main/production)
3. Amplify auto-detects build settings
4. Enable auto-deploy on push

## Step 6: Monitoring and Logging

### 6.1 CloudWatch Setup

```bash
# Create log groups
aws logs create-log-group --log-group-name /ecs/profolia-backend
aws logs create-log-group --log-group-name /amplify/profolia-frontend

# Create CloudWatch Dashboard
aws cloudwatch put-dashboard --dashboard-name Profolia --dashboard-body file://dashboard.json
```

### 6.2 Dashboard Configuration

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ECS", "CPUUtilization", { "stat": "Average" }],
          [".", "MemoryUtilization", { "stat": "Average" }]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "ECS Backend Metrics"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/RDS", "CPUUtilization"],
          [".", "DatabaseConnections"],
          [".", "FreeStorageSpace"]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "RDS Metrics"
      }
    }
  ]
}
```

## Step 7: Cost Optimization

### Estimated Monthly Costs

- **AWS Amplify**: $0-15 (depends on traffic)
- **ECS Fargate**: $15-30 (1 task, 0.5 vCPU, 1GB RAM)
- **RDS t3.micro**: $15-20
- **S3 Storage**: $5-10 (first 50GB)
- **CloudFront**: $5-15 (first 1TB transfer)
- **Route 53**: $0.50 per hosted zone
- **Total**: 

### Cost Optimization Tips

1. Use AWS Free Tier where possible
2. Enable S3 Lifecycle policies for old portfolios
3. Use CloudFront caching aggressively
4. Consider Reserved Instances for RDS if traffic is consistent
5. Implement auto-scaling for ECS based on load

## Step 8: Post-Deployment Checklist

- [ ] Verify DNS propagation
- [ ] Test SSL certificates
- [ ] Verify API connectivity from frontend
- [ ] Test user registration and login
- [ ] Test portfolio creation end-to-end
- [ ] Verify media uploads to S3
- [ ] Test AI generation functionality
- [ ] Check CloudWatch logs for errors
- [ ] Set up AWS Budget alerts
- [ ] Configure AWS Backup for RDS
- [ ] Set up monitoring alerts
- [ ] Test from multiple devices/browsers
- [ ] Verify public portfolio URLs work
