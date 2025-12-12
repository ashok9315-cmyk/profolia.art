import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { generateUsernameSuggestions, generateBio, getProfessionFields } from '../services/ai.service';

/**
 * Generate username suggestions based on user's name
 * GET /api/profiles/suggestions?name=John%20Doe
 */
export const suggestUsernames = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name } = req.query;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new AppError('Name is required', 400);
    }

    // Generate suggestions using AI
    const suggestions = await generateUsernameSuggestions(name);
    
    // Check availability for each suggestion
    const availableSuggestions = await Promise.all(
      suggestions.map(async (username) => {
        const exists = await prisma.profile.findUnique({ where: { username } });
        return { username, available: !exists };
      })
    );

    res.json({ 
      suggestions: availableSuggestions,
      totalSuggestions: availableSuggestions.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check if a username is available
 * GET /api/profiles/check/:username
 */
export const checkUsername = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { username } = req.params;
    
    if (!username || username.trim().length === 0) {
      throw new AppError('Username is required', 400);
    }

    // Validate username format
    const usernameRegex = /^[a-z0-9_-]{4,20}$/;
    if (!usernameRegex.test(username.toLowerCase())) {
      throw new AppError('Invalid username format. Use 4-20 characters (lowercase letters, numbers, hyphens, underscores)', 400);
    }

    const profile = await prisma.profile.findUnique({ where: { username } });
    
    res.json({ 
      available: !profile,
      username,
      message: profile ? 'Username is taken' : 'Username is available'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user's profile
 * GET /api/profiles/me
 */
export const getCurrentProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    const profile = await prisma.profile.findFirst({ 
      where: { userId },
      include: {
        mediaAssets: true,
        generatedPortfolios: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!profile) {
      throw new AppError('Profile not found', 404);
    }

    res.json({ profile });
  } catch (error) {
    next(error);
  }
};

/**
 * Get profession-specific custom fields
 * GET /api/profiles/fields/:professionType
 */
export const getProfessionCustomFields = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { professionType } = req.params;
    
    if (!professionType) {
      throw new AppError('Profession type is required', 400);
    }

    const fields = await getProfessionFields(professionType);
    
    res.json({ 
      professionType,
      customFields: fields
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create or update user profile
 * POST /api/profiles
 */
export const upsertProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const {
      username,
      professionType,
      name,
      email,
      phone,
      githubUrl,
      websiteUrl,
      resumeUrl,
      bio,
      skills,
      customFields,
      themePreferences
    } = req.body;

    // Validate required fields
    if (!username || !professionType || !name) {
      throw new AppError('Username, profession type, and name are required', 400);
    }

    // Validate username format
    const usernameRegex = /^[a-z0-9_-]{4,20}$/;
    if (!usernameRegex.test(username.toLowerCase())) {
      throw new AppError('Invalid username format. Use 4-20 characters (lowercase letters, numbers, hyphens, underscores)', 400);
    }

    // Check if username is taken by another user
    const existingUsername = await prisma.profile.findUnique({ where: { username } });
    if (existingUsername && existingUsername.userId !== userId) {
      throw new AppError('Username already taken', 409);
    }

    // Find user's current profile
    const currentProfile = await prisma.profile.findFirst({ where: { userId } });

    let profile;
    if (currentProfile) {
      // Update existing profile
      profile = await prisma.profile.update({
        where: { id: currentProfile.id },
        data: {
          username,
          professionType,
          name,
          email,
          phone,
          githubUrl,
          websiteUrl,
          resumeUrl,
          bio,
          skills: skills ? JSON.stringify(skills) : null,
          customFields: customFields ? JSON.stringify(customFields) : null,
          themePreferences: themePreferences ? JSON.stringify(themePreferences) : null,
          updatedAt: new Date()
        },
        include: {
          mediaAssets: true,
          generatedPortfolios: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });
    } else {
      // Create new profile
      profile = await prisma.profile.create({
        data: {
          userId,
          username,
          professionType,
          name,
          email,
          phone,
          githubUrl,
          websiteUrl,
          resumeUrl,
          bio,
          skills: skills ? JSON.stringify(skills) : null,
          customFields: customFields ? JSON.stringify(customFields) : null,
          themePreferences: themePreferences ? JSON.stringify(themePreferences) : null
        },
        include: {
          mediaAssets: true,
          generatedPortfolios: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });
    }

    res.status(currentProfile ? 200 : 201).json({ 
      message: currentProfile ? 'Profile updated successfully' : 'Profile created successfully',
      profile,
      portfolioUrl: `https://www.profolia.art/${username}`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user profile
 * DELETE /api/profiles/:profileId
 */
export const deleteProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { profileId } = req.params;

    // Verify ownership
    const profile = await prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile || profile.userId !== userId) {
      throw new AppError('Profile not found or unauthorized', 404);
    }

    await prisma.profile.delete({ where: { id: profileId } });

    res.json({ message: 'Profile deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Get public profile by username
 * GET /api/profiles/public/:username
 */
export const getPublicProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { username } = req.params;

    const profile = await prisma.profile.findUnique({ 
      where: { username },
      include: {
        mediaAssets: true,
        generatedPortfolios: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!profile || !profile.isPublished) {
      throw new AppError('Profile not found', 404);
    }

    // Return only public information
    const publicProfile = {
      username: profile.username,
      name: profile.name,
      professionType: profile.professionType,
      email: profile.email,
      phone: profile.phone,
      githubUrl: profile.githubUrl,
      websiteUrl: profile.websiteUrl,
      bio: profile.bio,
      skills: profile.skills,
      mediaAssets: profile.mediaAssets,
      generatedPortfolios: profile.generatedPortfolios,
      createdAt: profile.createdAt
    };

    res.json({ profile: publicProfile });
  } catch (error) {
    next(error);
  }
};

/**
 * Publish/unpublish profile
 * PATCH /api/profiles/:profileId/publish
 */
export const togglePublishProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { profileId } = req.params;
    const { isPublished } = req.body;

    // Verify ownership
    const profile = await prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile || profile.userId !== userId) {
      throw new AppError('Profile not found or unauthorized', 404);
    }

    const updatedProfile = await prisma.profile.update({
      where: { id: profileId },
      data: { isPublished }
    });

    res.json({ 
      message: `Profile ${isPublished ? 'published' : 'unpublished'} successfully`,
      profile: updatedProfile,
      portfolioUrl: isPublished ? `https://www.profolia.art/${updatedProfile.username}` : null
    });
  } catch (error) {
    next(error);
  }
};
