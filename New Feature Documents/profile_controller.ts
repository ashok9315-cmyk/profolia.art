// backend/src/controllers/profile.controller.ts
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { generateUsernameSuggestions } from '../services/ai.service';

// Generate username suggestions based on name
export const suggestUsernames = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name } = req.query;
    if (!name || typeof name !== 'string') {
      throw new AppError('Name is required', 400);
    }

    const suggestions = await generateUsernameSuggestions(name);
    
    // Check availability
    const availableSuggestions = await Promise.all(
      suggestions.map(async (username) => {
        const exists = await prisma.profile.findUnique({ where: { username } });
        return { username, available: !exists };
      })
    );

    res.json({ suggestions: availableSuggestions });
  } catch (error) {
    next(error);
  }
};

// Check username availability
export const checkUsername = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { username } = req.params;
    const profile = await prisma.profile.findUnique({ where: { username } });
    
    res.json({ available: !profile });
  } catch (error) {
    next(error);
  }
};

// Create or update profile
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
      customFields
    } = req.body;

    // Check if username is taken by another user
    const existingProfile = await prisma.profile.findUnique({ where: { username } });
    if (existingProfile && existingProfile.userId !== userId) {
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
          skills,
          customFields,
          updatedAt: new Date()
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
          skills,
          customFields
        }
      });
    }

    res.json({
      message: 'Profile saved successfully',
      profile
    });
  } catch (error) {
    next(error);
  }
};

// Get user's own profile
export const getMyProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    
    const profile = await prisma.profile.findFirst({
      where: { userId },
      include: {
        mediaAssets: {
          orderBy: { displayOrder: 'asc' }
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

// Get public profile by username
export const getPublicProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { username } = req.params;
    
    const profile = await prisma.profile.findUnique({
      where: { username },
      include: {
        mediaAssets: {
          where: { category: { not: null } },
          orderBy: { displayOrder: 'asc' }
        },
        generatedPortfolios: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!profile || !profile.isPublished) {
      throw new AppError('Profile not found', 404);
    }

    res.json({ profile });
  } catch (error) {
    next(error);
  }
};

// Delete profile
export const deleteProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    
    const profile = await prisma.profile.findFirst({ where: { userId } });
    if (!profile) {
      throw new AppError('Profile not found', 404);
    }

    await prisma.profile.delete({ where: { id: profile.id } });

    res.json({ message: 'Profile deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Get profession-specific form fields
export const getProfessionFields = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { professionType } = req.params;
    
    const fieldConfigs: Record<string, any> = {
      technologist: [
        { name: 'github', label: 'GitHub Profile', type: 'url', required: true },
        { name: 'website', label: 'Personal Website', type: 'url', required: false },
        { name: 'resume', label: 'Resume', type: 'file', required: true },
        { name: 'skills', label: 'Technical Skills', type: 'tags', required: true },
        { name: 'experience', label: 'Years of Experience', type: 'number', required: false }
      ],
      photographer: [
        { name: 'specialization', label: 'Photography Specialization', type: 'select', 
          options: ['Portrait', 'Landscape', 'Wedding', 'Product', 'Fashion', 'Wildlife'], required: true },
        { name: 'equipment', label: 'Primary Equipment', type: 'text', required: false },
        { name: 'instagram', label: 'Instagram Handle', type: 'text', required: false },
        { name: 'mediaArchive', label: 'Portfolio Images (ZIP)', type: 'file', required: true }
      ],
      musician: [
        { name: 'genre', label: 'Music Genre', type: 'tags', required: true },
        { name: 'instruments', label: 'Instruments', type: 'tags', required: true },
        { name: 'spotify', label: 'Spotify Profile', type: 'url', required: false },
        { name: 'soundcloud', label: 'SoundCloud Profile', type: 'url', required: false },
        { name: 'mediaArchive', label: 'Music Samples (ZIP)', type: 'file', required: false }
      ],
      dancer: [
        { name: 'danceStyle', label: 'Dance Style', type: 'tags', required: true },
        { name: 'youtube', label: 'YouTube Channel', type: 'url', required: false },
        { name: 'mediaArchive', label: 'Performance Videos (ZIP)', type: 'file', required: true }
      ],
      artist: [
        { name: 'artMedium', label: 'Art Medium', type: 'tags', required: true },
        { name: 'style', label: 'Artistic Style', type: 'text', required: false },
        { name: 'exhibitions', label: 'Notable Exhibitions', type: 'textarea', required: false },
        { name: 'mediaArchive', label: 'Artwork Images (ZIP)', type: 'file', required: true }
      ],
      designer: [
        { name: 'designType', label: 'Design Specialization', type: 'select',
          options: ['UI/UX', 'Graphic', 'Product', 'Interior', 'Fashion'], required: true },
        { name: 'tools', label: 'Design Tools', type: 'tags', required: true },
        { name: 'behance', label: 'Behance Profile', type: 'url', required: false },
        { name: 'dribbble', label: 'Dribbble Profile', type: 'url', required: false },
        { name: 'mediaArchive', label: 'Design Portfolio (ZIP)', type: 'file', required: true }
      ]
    };

    const fields = fieldConfigs[professionType] || [];
    res.json({ fields });
  } catch (error) {
    next(error);
  }
};

// backend/src/routes/profile.routes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  suggestUsernames,
  checkUsername,
  upsertProfile,
  getMyProfile,
  getPublicProfile,
  deleteProfile,
  getProfessionFields
} from '../controllers/profile.controller';

const router = Router();

// Public routes
router.get('/public/:username', getPublicProfile);
router.get('/profession-fields/:professionType', getProfessionFields);

// Protected routes
router.use(authenticate);
router.get('/username-suggestions', suggestUsernames);
router.get('/check-username/:username', checkUsername);
router.post('/me', upsertProfile);
router.get('/me', getMyProfile);
router.delete('/me', deleteProfile);

export default router;