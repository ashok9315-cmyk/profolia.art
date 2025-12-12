# Profolia Backend API

AI-powered portfolio generator backend built with Node.js, Express, TypeScript, and Prisma.

## 🚀 Features

- ✅ User authentication with JWT tokens
- ✅ PostgreSQL database with Prisma ORM
- ✅ RESTful API endpoints
- 🔄 Profile management (coming soon)
- 🔄 AI-powered portfolio generation with Claude (coming soon)
- 🔄 Media upload and management with AWS S3 (coming soon)

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- AWS account (for S3 storage)
- Anthropic API key (for Claude AI)

## 🛠️ Installation

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your credentials:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/profolia"
   JWT_SECRET=your-super-secret-key
   ANTHROPIC_API_KEY=your-anthropic-api-key
   AWS_ACCESS_KEY_ID=your-aws-key
   AWS_SECRET_ACCESS_KEY=your-aws-secret
   ```

3. **Set up PostgreSQL database:**
   ```bash
   # Create database
   createdb profolia
   
   # Or using psql
   psql -U postgres
   CREATE DATABASE profolia;
   \q
   ```

4. **Run Prisma migrations:**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

   Server will start on http://localhost:3000

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user

### Profiles (Coming Soon)
- `GET /api/profiles/me` - Get current user profile
- `POST /api/profiles` - Create/update profile
- `GET /api/profiles/suggestions?name=John` - Get username suggestions
- `GET /api/profiles/check/:username` - Check username availability

### Media (Coming Soon)
- `POST /api/media/upload` - Upload media files
- `POST /api/media/upload-zip` - Upload ZIP archive
- `GET /api/media/:profileId` - Get media for profile
- `DELETE /api/media/:mediaId` - Delete media

### Portfolios (Coming Soon)
- `POST /api/portfolios/generate` - Generate portfolio with AI
- `GET /api/portfolios/:username` - Get public portfolio

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 📦 Database Management

```bash
# Generate Prisma Client
npm run prisma:generate

# Create migration
npm run prisma:migrate

# Open Prisma Studio (GUI)
npm run prisma:studio
```

## 🏗️ Project Structure

```
backend/
├── src/
│   ├── controllers/     # Request handlers
│   ├── routes/          # API routes
│   ├── middleware/      # Custom middleware
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   ├── validators/      # Input validation
│   ├── config/          # Configuration files
│   └── index.ts         # App entry point
├── prisma/
│   └── schema.prisma    # Database schema
├── package.json
└── tsconfig.json
```

## 🔒 Security

- Passwords hashed with bcrypt (12 rounds)
- JWT tokens with 15-minute expiration
- Refresh tokens with 7-day expiration
- Helmet.js for HTTP security headers
- CORS configured for frontend origin
- Input validation and sanitization

## 📝 Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint

## 🚀 Deployment

Build and deploy to production:

```bash
npm run build
npm start
```

## 📄 License

MIT © ASHOK S

## 👤 Author

**ASHOK S**
- Email: ashok9315@gmail.com
- GitHub: [@ashok9315-cmyk](https://github.com/ashok9315-cmyk)
