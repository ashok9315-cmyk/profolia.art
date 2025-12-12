// backend/src/services/ai.service.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

interface ProfileData {
  name: string;
  professionType: string;
  email?: string;
  phone?: string;
  githubUrl?: string;
  websiteUrl?: string;
  bio?: string;
  skills?: string[];
  customFields?: Record<string, any>;
  mediaAssets?: Array<{
    fileUrl: string;
    fileType: string;
    category?: string;
    tags?: string[];
  }>;
}

// Generate username suggestions
export async function generateUsernameSuggestions(name: string): Promise<string[]> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `Generate 10 unique, professional username suggestions for a person named "${name}". 
      Requirements:
      - Lowercase only
      - No spaces or special characters except hyphens and underscores
      - Between 4-20 characters
      - Professional and memorable
      - Mix of different styles (firstname, firstnamelastname, creative variations)
      
      Return ONLY a JSON array of strings, nothing else.
      Example: ["johnsmith", "john-smith", "jsmith", "john_s", "smithjohn"]`
    }]
  });

  const content = message.content[0];
  if (content.type === 'text') {
    const cleanedText = content.text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanedText);
  }
  
  return [];
}

// Analyze media files and categorize them
export async function analyzeMedia(
  fileData: { fileName: string; fileType: string; description?: string }[],
  professionType: string
): Promise<Array<{ fileName: string; category: string; tags: string[]; description: string }>> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Analyze these media files for a ${professionType}'s portfolio and categorize them:
      
Files: ${JSON.stringify(fileData, null, 2)}

Based on the profession type and file names/types, categorize each file and suggest:
1. A category (e.g., "Featured Work", "Projects", "Gallery", "About", etc.)
2. Relevant tags
3. A brief description of what this might be

Return a JSON array with this structure:
[
  {
    "fileName": "example.jpg",
    "category": "Featured Work",
    "tags": ["tag1", "tag2"],
    "description": "Brief description"
  }
]

Return ONLY valid JSON, nothing else.`
    }]
  });

  const content = message.content[0];
  if (content.type === 'text') {
    const cleanedText = content.text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanedText);
  }
  
  return [];
}

// Generate portfolio HTML
export async function generatePortfolioHTML(profileData: ProfileData): Promise<string> {
  const prompt = `Create a stunning, modern, single-page portfolio website for ${profileData.name}, a ${profileData.professionType}.

Profile Information:
${JSON.stringify(profileData, null, 2)}

Requirements:
1. Modern, visually stunning design with smooth animations
2. Fully responsive (mobile, tablet, desktop)
3. Use modern CSS (Grid, Flexbox, CSS Variables)
4. Include sections: Hero, About, Skills/Services, Portfolio/Work, Contact
5. Add smooth scroll behavior and intersection observers for animations
6. Use a professional color scheme appropriate for the profession
7. Include Font Awesome icons via CDN
8. For media assets, display them in an attractive gallery with lightbox functionality
9. Make it SEO-friendly with proper meta tags
10. Include a professional navigation menu

Style Guidelines based on profession:
- Technologist: Clean, minimalist, tech-focused (blues, grays)
- Photographer: Image-focused, elegant (blacks, whites, subtle accents)
- Musician: Dynamic, energetic (purples, reds, warm tones)
- Dancer: Fluid, graceful (soft pastels or bold contrasts)
- Artist: Creative, colorful (depends on art style)
- Designer: Sleek, portfolio-first (monochrome with accent color)

IMPORTANT: Return ONLY the complete HTML code, nothing else. Include all CSS in <style> tags and JavaScript in <script> tags. Make it production-ready.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  const content = message.content[0];
  if (content.type === 'text') {
    // Remove any markdown code blocks if present
    let html = content.text.replace(/```html\n?|\n?```/g, '').trim();
    
    // Ensure it starts with <!DOCTYPE html>
    if (!html.toLowerCase().startsWith('<!doctype html>')) {
      html = '<!DOCTYPE html>\n' + html;
    }
    
    return html;
  }
  
  throw new Error('Failed to generate portfolio HTML');
}

// Generate optimized bio/description
export async function generateBio(
  name: string,
  professionType: string,
  customFields: Record<string, any>
): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Write a professional, engaging bio (2-3 paragraphs, ~150 words) for ${name}, a ${professionType}.

Additional context: ${JSON.stringify(customFields, null, 2)}

The bio should:
- Be written in third person
- Highlight key skills and experience
- Be professional yet personable
- Be SEO-friendly
- End with a call-to-action or availability statement

Return ONLY the bio text, nothing else.`
    }]
  });

  const content = message.content[0];
  return content.type === 'text' ? content.text.trim() : '';
}

// Suggest improvements to portfolio
export async function suggestImprovements(
  profileData: ProfileData
): Promise<string[]> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `Analyze this ${profileData.professionType}'s portfolio and suggest 5 specific improvements:

${JSON.stringify(profileData, null, 2)}

Focus on:
- Missing information that would strengthen the portfolio
- Better ways to present existing information
- Industry-specific best practices
- Visual or content enhancements

Return a JSON array of improvement suggestions as strings.
Example: ["Add more specific project descriptions", "Include client testimonials"]

Return ONLY valid JSON array, nothing else.`
    }]
  });

  const content = message.content[0];
  if (content.type === 'text') {
    const cleanedText = content.text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanedText);
  }
  
  return [];
}

// backend/src/controllers/portfolio.controller.ts
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { generatePortfolioHTML, suggestImprovements } from '../services/ai.service';
import { uploadToS3, uploadToCloudFront } from '../services/aws.service';

// Generate portfolio
export const generatePortfolio = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    
    // Get user's profile with media
    const profile = await prisma.profile.findFirst({
      where: { userId },
      include: {
        mediaAssets: {
          orderBy: { displayOrder: 'asc' }
        }
      }
    });

    if (!profile) {
      throw new AppError('Profile not found. Please create a profile first.', 404);
    }

    // Generate HTML using AI
    const html = await generatePortfolioHTML({
      name: profile.name,
      professionType: profile.professionType,
      email: profile.email || undefined,
      phone: profile.phone || undefined,
      githubUrl: profile.githubUrl || undefined,
      websiteUrl: profile.websiteUrl || undefined,
      bio: profile.bio || undefined,
      skills: profile.skills as string[] || undefined,
      customFields: profile.customFields as Record<string, any> || undefined,
      mediaAssets: profile.mediaAssets.map(m => ({
        fileUrl: m.fileUrl,
        fileType: m.fileType,
        category: m.category || undefined,
        tags: m.tags as string[] || undefined
      }))
    });

    // Upload to S3 and CloudFront
    const s3Url = await uploadToS3(
      `portfolios/${profile.username}/index.html`,
      html,
      'text/html'
    );
    
    const cloudFrontUrl = `https://www.profolia.art/${profile.username}`;

    // Save generated portfolio
    const portfolio = await prisma.generatedPortfolio.create({
      data: {
        profileId: profile.id,
        htmlContent: html,
        s3Url,
        cloudFrontUrl,
        templateVersion: '1.0',
        generationPrompt: 'AI-generated portfolio',
        isActive: true
      }
    });

    // Mark profile as published
    await prisma.profile.update({
      where: { id: profile.id },
      data: { isPublished: true }
    });

    res.json({
      message: 'Portfolio generated successfully',
      portfolio: {
        id: portfolio.id,
        url: cloudFrontUrl,
        previewUrl: s3Url
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get portfolio improvements
export const getImprovements = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    
    const profile = await prisma.profile.findFirst({
      where: { userId },
      include: { mediaAssets: true }
    });

    if (!profile) {
      throw new AppError('Profile not found', 404);
    }

    const improvements = await suggestImprovements({
      name: profile.name,
      professionType: profile.professionType,
      email: profile.email || undefined,
      bio: profile.bio || undefined,
      skills: profile.skills as string[] || undefined,
      customFields: profile.customFields as Record<string, any> || undefined
    });

    res.json({ improvements });
  } catch (error) {
    next(error);
  }
};