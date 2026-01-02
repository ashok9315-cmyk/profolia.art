# Resume Portfolio Generator

AI-powered resume portfolio generator that enhances the existing profolia.art website with dynamic backend capabilities.

## Prerequisites

- Node.js 20+ installed
- AWS CLI configured with appropriate credentials
- AWS CDK CLI installed (`npm install -g aws-cdk`)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Install Lambda dependencies:
```bash
cd lambda
npm install
cd ..
```

3. Bootstrap CDK (first time only):
```bash
npx cdk bootstrap
```

## Deployment

1. Build the TypeScript code:
```bash
npm run build
```

2. Deploy the infrastructure:
```bash
npm run deploy
```

3. The deployment will output:
   - API Gateway URL
   - S3 bucket names for resumes and generated content

## Architecture

- **S3 Buckets**: Secure storage for uploaded resumes and generated portfolio content
- **Lambda Functions**: Serverless processing for upload, parsing, and content generation
- **API Gateway**: RESTful API with CORS configured for profolia.art domain
- **IAM Roles**: Least-privilege access for Lambda functions

## API Endpoints

- `POST /api/upload-resume` - Upload resume files
- `GET /api/processing-status/{jobId}` - Check processing status
- `GET /api/portfolio-content/{jobId}` - Retrieve generated portfolio content
- `POST /api/save-preferences` - Save user preferences

## Security Features

- Server-side encryption for S3 storage
- HTTPS-only API endpoints
- CORS configured for profolia.art domain
- Automatic file cleanup (30-day retention for resumes, 7-day for generated content)

## AWS Free Tier Compliance

- Lambda: 1M requests/month, 400,000 GB-seconds
- S3: 5GB storage, 20,000 GET requests, 2,000 PUT requests
- API Gateway: 1M API calls/month
- Lifecycle policies to manage storage costs

## Development

- `npm run watch` - Watch for TypeScript changes
- `npm run test` - Run tests
- `npm run synth` - Generate CloudFormation template
- `npm run destroy` - Remove all AWS resources