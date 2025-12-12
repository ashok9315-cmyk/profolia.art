import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { generatePortfolioHTML } from '../services/ai.service';
import { uploadPortfolioToS3 } from '../services/aws.service';

/**
 * Generate portfolio HTML using AI
 * POST /api/portfolios/generate
 */
export const generatePortfolio = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    // Get user's profile with all related data
    const profile = await prisma.profile.findFirst({
      where: { userId },
      include: {
        mediaAssets: true
      }
    });

    if (!profile) {
      throw new AppError('Profile not found. Please create a profile first.', 404);
    }

    // Prepare profile data for AI
    const profileData = {
      name: profile.name,
      professionType: profile.professionType,
      email: profile.email || undefined,
      phone: profile.phone || undefined,
      githubUrl: profile.githubUrl || undefined,
      websiteUrl: profile.websiteUrl || undefined,
      bio: profile.bio || undefined,
      skills: profile.skills ? JSON.parse(profile.skills as string) : undefined,
      customFields: profile.customFields ? JSON.parse(profile.customFields as string) : undefined,
      mediaAssets: profile.mediaAssets.map(asset => ({
        fileUrl: asset.fileUrl,
        fileType: asset.fileType,
        category: asset.category,
        tags: asset.tags ? JSON.parse(asset.tags as string) : []
      }))
    };

    // Generate portfolio HTML
    const htmlContent = await generatePortfolioHTML(profileData);

    // Upload to S3
    const { htmlUrl } = await uploadPortfolioToS3(profile.username, htmlContent);

    // Save to database
    const generatedPortfolio = await prisma.generatedPortfolio.create({
      data: {
        profileId: profile.id,
        htmlContent,
        s3Url: htmlUrl,
        cloudfrontUrl: `https://www.profolia.art/${profile.username}`, // This will be updated with actual CloudFront URL
        generationPrompt: JSON.stringify(profileData)
      }
    });

    // Update profile to published if not already
    await prisma.profile.update({
      where: { id: profile.id },
      data: { isPublished: true }
    });

    res.status(201).json({
      message: 'Portfolio generated successfully',
      generatedPortfolio,
      portfolioUrl: `https://www.profolia.art/${profile.username}`,
      s3Url: htmlUrl
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get public portfolio by username (HTML content or redirect)
 * GET /api/portfolios/:username
 */
export const getPublicPortfolio = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { username } = req.params;

    // Get profile
    const profile = await prisma.profile.findUnique({
      where: { username },
      include: {
        generatedPortfolios: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!profile || !profile.isPublished) {
      throw new AppError('Portfolio not found', 404);
    }

    if (profile.generatedPortfolios.length === 0) {
      throw new AppError('Portfolio not yet generated', 404);
    }

    const portfolio = profile.generatedPortfolios[0];

    res.json({
      portfolio: {
        username: profile.username,
        name: profile.name,
        professionType: profile.professionType,
        htmlContent: portfolio.htmlContent,
        s3Url: portfolio.s3Url,
        createdAt: portfolio.createdAt,
        updatedAt: portfolio.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get portfolio generation history
 * GET /api/portfolios/history/:profileId
 */
export const getPortfolioHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { profileId } = req.params;

    // Verify ownership
    const profile = await prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile || profile.userId !== userId) {
      throw new AppError('Unauthorized', 403);
    }

    const history = await prisma.generatedPortfolio.findMany({
      where: { profileId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      total: history.length,
      history
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete generated portfolio
 * DELETE /api/portfolios/:portfolioId
 */
export const deletePortfolio = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { portfolioId } = req.params;

    // Get portfolio
    const portfolio = await prisma.generatedPortfolio.findUnique({ where: { id: portfolioId } });
    if (!portfolio) {
      throw new AppError('Portfolio not found', 404);
    }

    // Verify ownership
    const profile = await prisma.profile.findUnique({ where: { id: portfolio.profileId } });
    if (!profile || profile.userId !== userId) {
      throw new AppError('Unauthorized', 403);
    }

    // Delete from database
    await prisma.generatedPortfolio.delete({ where: { id: portfolioId } });

    res.json({ message: 'Portfolio deleted successfully' });
  } catch (error) {
    next(error);
  }
};
