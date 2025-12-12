# Profolia Frontend

Modern React frontend for the AI-powered portfolio generator platform.

## 🚀 Features

- ✅ User authentication (login/register)
- ✅ Responsive design with Tailwind CSS
- ✅ TypeScript for type safety
- ✅ React Router for navigation
- ✅ API client with axios
- ✅ Context API for state management

## 📋 Prerequisites

- Node.js 18+
- npm or yarn

## 🛠️ Installation

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

   Server will start on http://localhost:3001

## 🏗️ Project Structure

```
frontend/
├── src/
│   ├── components/      # Reusable components
│   ├── contexts/        # React contexts
│   ├── hooks/           # Custom hooks
│   ├── pages/           # Page components
│   ├── services/        # API services
│   ├── types/           # TypeScript types
│   ├── App.tsx          # Main app component
│   └── main.tsx         # Entry point
├── public/              # Static assets
├── package.json
└── tsconfig.json
```

## 📚 Pages

- **Home** (`/`) - Landing page
- **Login** (`/login`) - User login
- **Register** (`/register`) - User registration
- **Dashboard** (`/dashboard`) - User dashboard (private route)

## 🔐 Authentication

Uses JWT tokens stored in localStorage. Tokens are automatically included in API requests via axios interceptor.

## 📦 Build

```bash
npm run build
```

## 🧪 Linting

```bash
npm run lint
```

## 📝 License

MIT © ASHOK S
