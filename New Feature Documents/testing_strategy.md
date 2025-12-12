# Testing Strategy for Profolia.art

## 1. Unit Testing

### Backend Unit Tests (Jest + Supertest)

```typescript
// backend/tests/unit/auth.service.test.ts
import { register, login } from '../../src/controllers/auth.controller';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

describe('Auth Service', () => {
  describe('register', () => {
    it('should create a new user with hashed password', async () => {
      // Test implementation
    });

    it('should return 409 if email already exists', async () => {
      // Test implementation
    });
  });

  describe('login', () => {
    it('should return JWT tokens for valid credentials', async () => {
      // Test implementation
    });

    it('should return 401 for invalid credentials', async () => {
      // Test implementation
    });
  });
});

// backend/tests/unit/ai.service.test.ts
import { generateUsernameSuggestions, analyzeMedia } from '../../src/services/ai.service';

describe('AI Service', () => {
  describe('generateUsernameSuggestions', () => {
    it('should generate 10 unique usernames', async () => {
      const suggestions = await generateUsernameSuggestions('John Doe');
      expect(suggestions).toHaveLength(10);
      expect(suggestions.every(s => /^[a-z0-9-_]+$/.test(s))).toBe(true);
    });
  });

  describe('analyzeMedia', () => {
    it('should categorize media files correctly', async () => {
      const files = [
        { fileName: 'project1.jpg', fileType: 'image' },
        { fileName: 'demo.mp4', fileType: 'video' }
      ];
      const result = await analyzeMedia(files, 'photographer');
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('category');
      expect(result[0]).toHaveProperty('tags');
    });
  });
});
```

### Frontend Unit Tests (Jest + React Testing Library)

```typescript
// frontend/src/components/__tests__/ProfileForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider } from '../../contexts/AuthContext';
import ProfileFormPage from '../../pages/ProfileFormPage';

describe('ProfileForm', () => {
  it('should render all form fields', () => {
    render(
      <AuthProvider>
        <ProfileFormPage />
      </AuthProvider>
    );
    
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/profession type/i)).toBeInTheDocument();
  });

  it('should show username suggestions when name is entered', async () => {
    render(
      <AuthProvider>
        <ProfileFormPage />
      </AuthProvider>
    );
    
    const nameInput = screen.getByLabelText(/full name/i);
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.blur(nameInput);
    
    await waitFor(() => {
      expect(screen.getByText(/suggestions/i)).toBeInTheDocument();
    });
  });
});
```

## 2. Integration Testing

### API Integration Tests

```typescript
// backend/tests/integration/profile.integration.test.ts
import request from 'supertest';
import app from '../../src/index';
import { prisma } from '../../src/config/database';

describe('Profile API Integration', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Register and login to get auth token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Password123!' });
    
    authToken = registerResponse.body.accessToken;
    userId = registerResponse.body.user.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  describe('POST /api/profiles/me', () => {
    it('should create a new profile', async () => {
      const response = await request(app)
        .post('/api/profiles/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          username: 'johndoe',
          professionType: 'technologist',
          name: 'John Doe',
          email: 'john@example.com',
          skills: ['JavaScript', 'TypeScript', 'React']
        });

      expect(response.status).toBe(200);
      expect(response.body.profile).toHaveProperty('username', 'johndoe');
    });

    it('should return 409 if username is taken', async () => {
      const response = await request(app)
        .post('/api/profiles/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          username: 'johndoe', // Same as above
          professionType: 'technologist',
          name: 'Jane Doe'
        });

      expect(response.status).toBe(409);
    });
  });
});
```

### Media Upload Integration Tests

```typescript
// backend/tests/integration/media.integration.test.ts
import request from 'supertest';
import app from '../../src/index';
import path from 'path';
import fs from 'fs';

describe('Media Upload Integration', () => {
  let authToken: string;

  beforeAll(async () => {
    // Setup auth
  });

  describe('POST /api/media/upload', () => {
    it('should upload a single image file', async () => {
      const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');
      
      const response = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testImagePath);

      expect(response.status).toBe(200);
      expect(response.body.mediaAsset).toHaveProperty('fileUrl');
      expect(response.body.mediaAsset.fileType).toBe('image');
    });
  });

  describe('POST /api/media/upload-archive', () => {
    it('should extract and upload files from ZIP', async () => {
      const testZipPath = path.join(__dirname, '../fixtures/test-portfolio.zip');
      
      const response = await request(app)
        .post('/api/media/upload-archive')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('archive', testZipPath);

      expect(response.status).toBe(200);
      expect(response.body.mediaAssets).toBeInstanceOf(Array);
      expect(response.body.mediaAssets.length).toBeGreaterThan(0);
    });
  });
});
```

## 3. End-to-End Testing (Playwright)

```typescript
// e2e/tests/portfolio-creation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Portfolio Creation Flow', () => {
  test('should complete full portfolio creation', async ({ page }) => {
    // 1. Register
    await page.goto('/register');
    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/dashboard');

    // 2. Start profile creation
    await page.click('text=Create Portfolio');
    await expect(page).toHaveURL('/profile/edit');

    // 3. Fill basic information
    await page.fill('input[name="name"]', 'John Developer');
    await page.selectOption('select[name="professionType"]', 'technologist');
    
    // Wait for username suggestions
    await page.waitForSelector('text=Suggestions');
    await page.click('button:has-text("johndev")');
    
    await page.click('button:has-text("Next")');

    // 4. Fill contact information
    await page.fill('input[name="email"]', 'john@example.com');
    await page.fill('input[name="phone"]', '+1234567890');
    await page.click('button:has-text("Next")');

    // 5. Fill professional details
    await page.fill('input[name="github"]', 'https://github.com/johndev');
    await page.fill('input[name="website"]', 'https://johndev.com');
    
    // Upload resume
    const resumePath = 'tests/fixtures/sample-resume.pdf';
    await page.setInputFiles('input[name="resume"]', resumePath);
    
    await page.click('button:has-text("Next")');

    // 6. Review and generate
    await expect(page.locator('text=profolia.art/johndev')).toBeVisible();
    await page.click('button:has-text("Generate Portfolio")');

    // 7. Wait for generation
    await page.waitForURL('/dashboard', { timeout: 60000 });
    await expect(page.locator('text=Portfolio generated')).toBeVisible();

    // 8. Visit public portfolio
    await page.goto('/johndev');
    await expect(page.locator('h1:has-text("John Developer")')).toBeVisible();
  });

  test('should handle username conflicts', async ({ page }) => {
    await page.goto('/profile/edit');
    await page.fill('input[name="username"]', 'existinguser');
    await page.blur('input[name="username"]');
    
    await expect(page.locator('text=Username already taken')).toBeVisible();
  });
});
```

## 4. Load Testing (Artillery)

```yaml
# load-tests/portfolio-generation.yml
config:
  target: "https://api.profolia.art"
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    - duration: 120
      arrivalRate: 10
      name: "Sustained load"
    - duration: 60
      arrivalRate: 20
      name: "Peak load"
  
scenarios:
  - name: "Create and Generate Portfolio"
    flow:
      - post:
          url: "/api/auth/register"
          json:
            email: "test-{{ $randomString() }}@example.com"
            password: "TestPass123!"
          capture:
            - json: "$.accessToken"
              as: "authToken"
      
      - post:
          url: "/api/profiles/me"
          headers:
            Authorization: "Bearer {{ authToken }}"
          json:
            username: "user-{{ $randomString() }}"
            professionType: "technologist"
            name: "Test User"
            email: "test@example.com"
            skills: ["JavaScript", "React"]
      
      - post:
          url: "/api/portfolios/generate"
          headers:
            Authorization: "Bearer {{ authToken }}"
```

## 5. Security Testing

### Authentication Tests

```typescript
// security/tests/auth-security.test.ts
describe('Authentication Security', () => {
  it('should reject weak passwords', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: '123' });
    
    expect(response.status).toBe(400);
  });

  it('should rate limit login attempts', async () => {
    const attempts = Array(10).fill(null);
    
    const responses = await Promise.all(
      attempts.map(() => 
        request(app)
          .post('/api/auth/login')
          .send({ email: 'test@example.com', password: 'wrong' })
      )
    );
    
    const lastResponse = responses[responses.length - 1];
    expect(lastResponse.status).toBe(429); // Too many requests
  });

  it('should sanitize user inputs to prevent XSS', async () => {
    const maliciousInput = '<script>alert("xss")</script>';
    
    const response = await request(app)
      .post('/api/profiles/me')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: maliciousInput });
    
    expect(response.body.profile.name).not.toContain('<script>');
  });
});
```

## 6. Test Coverage Requirements

- **Unit Tests**: Minimum 80% code coverage
- **Integration Tests**: All API endpoints
- **E2E Tests**: All critical user flows
- **Load Tests**: Handle 100 concurrent users
- **Security Tests**: OWASP Top 10 vulnerabilities

## 7. CI/CD Testing Pipeline

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test:unit
      - run: npm run test:coverage
  
  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run test:integration
  
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npx playwright install
      - run: npm run test:e2e
```
