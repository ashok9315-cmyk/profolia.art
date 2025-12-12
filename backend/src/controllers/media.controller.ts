import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { uploadToS3, deleteFromS3, generateMediaKey, listUserMedia } from '../services/aws.service';
import { analyzeMedia } from '../services/ai.service';
import multer from 'multer';
import AdmZip from 'adm-zip';
import path from 'path';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime',
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'application/pdf', 'application/zip'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

export const uploadMiddleware = upload.single('file');
export const uploadZipMiddleware = upload.single('zipFile');

/**
 * Upload single media file
 * POST /api/media/upload
 */
export const uploadMediaFile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    if (!req.file) {
      throw new AppError('No file provided', 400);
    }

    // Get user's profile
    const profile = await prisma.profile.findFirst({ where: { userId } });
    if (!profile) {
      throw new AppError('Profile not found. Please create a profile first.', 404);
    }

    // Generate S3 key
    const s3Key = generateMediaKey(profile.id, req.file.originalname);
    
    // Upload to S3
    const fileUrl = await uploadToS3(
      s3Key,
      req.file.buffer,
      req.file.mimetype
    );

    // Determine file type
    const fileType = req.file.mimetype.startsWith('image') ? 'image'
                   : req.file.mimetype.startsWith('video') ? 'video'
                   : req.file.mimetype.startsWith('audio') ? 'audio'
                   : 'document';

    // Analyze media using AI
    const analysis = await analyzeMedia(
      [{ fileName: req.file.originalname, fileType, description: req.body.description }],
      profile.professionType
    );

    const mediaData = analysis[0] || {
      category: 'Uncategorized',
      tags: [],
      description: req.body.description || ''
    };

    // Save to database
    const mediaAsset = await prisma.mediaAsset.create({
      data: {
        profileId: profile.id,
        fileName: req.file.originalname,
        fileType,
        fileUrl,
        fileSize: BigInt(req.file.size),
        category: mediaData.category,
        tags: JSON.stringify(mediaData.tags),
        metadata: JSON.stringify(mediaData)
      }
    });

    res.status(201).json({
      message: 'File uploaded successfully',
      mediaAsset,
      s3Key
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload ZIP archive with multiple files
 * POST /api/media/upload-zip
 */
export const uploadZipArchive = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    if (!req.file) {
      throw new AppError('No ZIP file provided', 400);
    }

    // Get user's profile
    const profile = await prisma.profile.findFirst({ where: { userId } });
    if (!profile) {
      throw new AppError('Profile not found. Please create a profile first.', 404);
    }

    // Extract ZIP
    const zip = new AdmZip(req.file.buffer);
    const zipEntries = zip.getEntries();

    const supportedTypes = ['image', 'video', 'audio', 'pdf'];
    const uploadedAssets = [];
    const errors = [];

    for (const entry of zipEntries) {
      try {
        if (entry.isDirectory) continue;

        const fileName = entry.name;
        const fileBuffer = entry.getData();
        const ext = path.extname(fileName).toLowerCase();
        
        // Skip unsupported files
        const isSupportedType = supportedTypes.some(type => {
          if (type === 'image') return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
          if (type === 'video') return ['.mp4', '.webm', '.mov', '.avi'].includes(ext);
          if (type === 'audio') return ['.mp3', '.wav', '.ogg', '.m4a'].includes(ext);
          if (type === 'pdf') return ext === '.pdf';
          return false;
        });

        if (!isSupportedType) {
          errors.push({ fileName, error: 'Unsupported file type' });
          continue;
        }

        // Generate S3 key and upload
        const s3Key = generateMediaKey(profile.id, fileName);
        const mimeType = getMimeType(ext);
        
        const fileUrl = await uploadToS3(s3Key, fileBuffer, mimeType);

        // Determine file type
        const fileType = mimeType.startsWith('image') ? 'image'
                       : mimeType.startsWith('video') ? 'video'
                       : mimeType.startsWith('audio') ? 'audio'
                       : 'document';

        // Analyze media
        const analysis = await analyzeMedia(
          [{ fileName, fileType }],
          profile.professionType
        );

        const mediaData = analysis[0] || {
          category: 'Uncategorized',
          tags: [],
          description: ''
        };

        // Save to database
        const mediaAsset = await prisma.mediaAsset.create({
          data: {
            profileId: profile.id,
            fileName,
            fileType,
            fileUrl,
            fileSize: BigInt(fileBuffer.length),
            category: mediaData.category,
            tags: JSON.stringify(mediaData.tags),
            metadata: JSON.stringify(mediaData)
          }
        });

        uploadedAssets.push(mediaAsset);
      } catch (fileError) {
        errors.push({ fileName: entry.name, error: String(fileError) });
      }
    }

    res.status(201).json({
      message: `Uploaded ${uploadedAssets.length} files from ZIP`,
      uploadedAssets,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total: uploadedAssets.length + errors.length,
        successful: uploadedAssets.length,
        failed: errors.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all media for a profile
 * GET /api/media
 */
export const getProfileMedia = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    const profile = await prisma.profile.findFirst({ where: { userId } });
    if (!profile) {
      throw new AppError('Profile not found', 404);
    }

    const mediaAssets = await prisma.mediaAsset.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      total: mediaAssets.length,
      mediaAssets
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete media asset
 * DELETE /api/media/:mediaId
 */
export const deleteMediaAsset = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { mediaId } = req.params;

    // Get media asset
    const mediaAsset = await prisma.mediaAsset.findUnique({ where: { id: mediaId } });
    if (!mediaAsset) {
      throw new AppError('Media not found', 404);
    }

    // Verify ownership
    const profile = await prisma.profile.findUnique({ where: { id: mediaAsset.profileId } });
    if (!profile || profile.userId !== userId) {
      throw new AppError('Unauthorized', 403);
    }

    // Extract S3 key from URL
    const s3Key = mediaAsset.fileUrl.split(`${process.env.S3_BUCKET_NAME}/`)[1];
    
    // Delete from S3
    await deleteFromS3(s3Key);

    // Delete from database
    await prisma.mediaAsset.delete({ where: { id: mediaId } });

    res.json({ message: 'Media deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper function to get MIME type from extension
 */
function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.pdf': 'application/pdf'
  };

  return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
}
