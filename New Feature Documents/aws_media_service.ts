// backend/src/services/aws.service.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'profolia-portfolios';

// Upload file to S3
export async function uploadToS3(
  key: string,
  body: Buffer | string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
    ACL: 'public-read'
  });

  await s3Client.send(command);
  return `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;
}

// Delete file from S3
export async function deleteFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key
  });

  await s3Client.send(command);
}

// Generate presigned URL for direct upload
export async function generatePresignedUrl(
  key: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType
  });

  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

// Upload to CloudFront (deploys portfolio)
export async function uploadToCloudFront(
  username: string,
  html: string
): Promise<string> {
  // In production, this would trigger CloudFront invalidation
  // For now, just upload to S3 with proper path
  await uploadToS3(`${username}/index.html`, html, 'text/html');
  return `https://www.profolia.art/${username}`;
}

// backend/src/controllers/media.controller.ts
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { uploadToS3, deleteFromS3, generatePresignedUrl } from '../services/aws.service';
import { analyzeMedia } from '../services/ai.service';
import multer from 'multer';
import AdmZip from 'adm-zip';
import path from 'path';
import crypto from 'crypto';

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

// Upload single file
export const uploadSingleFile = [
  upload.single('file'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new AppError('No file uploaded', 400);
      }

      const userId = req.userId!;
      const profile = await prisma.profile.findFirst({ where: { userId } });
      
      if (!profile) {
        throw new AppError('Profile not found', 404);
      }

      // Generate unique filename
      const fileExt = path.extname(req.file.originalname);
      const fileKey = `media/${profile.username}/${crypto.randomUUID()}${fileExt}`;

      // Upload to S3
      const fileUrl = await uploadToS3(
        fileKey,
        req.file.buffer,
        req.file.mimetype
      );

      // Determine file type category
      let fileType = 'document';
      if (req.file.mimetype.startsWith('image/')) fileType = 'image';
      else if (req.file.mimetype.startsWith('video/')) fileType = 'video';
      else if (req.file.mimetype.startsWith('audio/')) fileType = 'audio';

      // Save to database
      const mediaAsset = await prisma.mediaAsset.create({
        data: {
          profileId: profile.id,
          fileName: req.file.originalname,
          fileType,
          fileUrl,
          fileSize: req.file.size
        }
      });

      res.json({
        message: 'File uploaded successfully',
        mediaAsset
      });
    } catch (error) {
      next(error);
    }
  }
];

// Upload and process ZIP archive
export const uploadArchive = [
  upload.single('archive'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file || req.file.mimetype !== 'application/zip') {
        throw new AppError('Please upload a ZIP file', 400);
      }

      const userId = req.userId!;
      const profile = await prisma.profile.findFirst({ where: { userId } });
      
      if (!profile) {
        throw new AppError('Profile not found', 404);
      }

      // Extract ZIP
      const zip = new AdmZip(req.file.buffer);
      const zipEntries = zip.getEntries();

      const uploadedFiles: any[] = [];
      const fileDescriptions: { fileName: string; fileType: string }[] = [];

      // Process each file in ZIP
      for (const entry of zipEntries) {
        if (entry.isDirectory) continue;

        const fileName = entry.entryName;
        const fileExt = path.extname(fileName).toLowerCase();
        
        // Determine MIME type
        let mimeType = 'application/octet-stream';
        if (['.jpg', '.jpeg'].includes(fileExt)) mimeType = 'image/jpeg';
        else if (fileExt === '.png') mimeType = 'image/png';
        else if (fileExt === '.gif') mimeType = 'image/gif';
        else if (fileExt === '.webp') mimeType = 'image/webp';
        else if (fileExt === '.mp4') mimeType = 'video/mp4';
        else if (fileExt === '.webm') mimeType = 'video/webm';
        else if (fileExt === '.mp3') mimeType = 'audio/mpeg';
        else if (fileExt === '.wav') mimeType = 'audio/wav';

        // Upload to S3
        const fileKey = `media/${profile.username}/${crypto.randomUUID()}${fileExt}`;
        const fileUrl = await uploadToS3(
          fileKey,
          entry.getData(),
          mimeType
        );

        let fileType = 'document';
        if (mimeType.startsWith('image/')) fileType = 'image';
        else if (mimeType.startsWith('video/')) fileType = 'video';
        else if (mimeType.startsWith('audio/')) fileType = 'audio';

        uploadedFiles.push({
          fileName,
          fileType,
          fileUrl,
          fileSize: entry.header.size
        });

        fileDescriptions.push({ fileName, fileType });
      }

      // Use AI to analyze and categorize files
      const analyzedFiles = await analyzeMedia(fileDescriptions, profile.professionType);

      // Save to database with AI-generated metadata
      const mediaAssets = await Promise.all(
        uploadedFiles.map(async (file, index) => {
          const analysis = analyzedFiles[index] || {};
          
          return await prisma.mediaAsset.create({
            data: {
              profileId: profile.id,
              fileName: file.fileName,
              fileType: file.fileType,
              fileUrl: file.fileUrl,
              fileSize: file.fileSize,
              category: analysis.category,
              tags: analysis.tags,
              metadata: { description: analysis.description },
              displayOrder: index
            }
          });
        })
      );

      res.json({
        message: `Successfully uploaded and analyzed ${mediaAssets.length} files`,
        mediaAssets
      });
    } catch (error) {
      next(error);
    }
  }
];

// Get presigned URL for client-side upload
export const getUploadUrl = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { fileName, contentType } = req.body;

    const profile = await prisma.profile.findFirst({ where: { userId } });
    if (!profile) {
      throw new AppError('Profile not found', 404);
    }

    const fileExt = path.extname(fileName);
    const fileKey = `media/${profile.username}/${crypto.randomUUID()}${fileExt}`;

    const uploadUrl = await generatePresignedUrl(fileKey, contentType);

    res.json({
      uploadUrl,
      fileKey,
      fileUrl: `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${fileKey}`
    });
  } catch (error) {
    next(error);
  }
};

// List user's media
export const listMedia = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    
    const profile = await prisma.profile.findFirst({ where: { userId } });
    if (!profile) {
      throw new AppError('Profile not found', 404);
    }

    const mediaAssets = await prisma.mediaAsset.findMany({
      where: { profileId: profile.id },
      orderBy: { displayOrder: 'asc' }
    });

    res.json({ mediaAssets });
  } catch (error) {
    next(error);
  }
};

// Delete media
export const deleteMedia = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { mediaId } = req.params;

    const profile = await prisma.profile.findFirst({ where: { userId } });
    if (!profile) {
      throw new AppError('Profile not found', 404);
    }

    const mediaAsset = await prisma.mediaAsset.findFirst({
      where: { id: mediaId, profileId: profile.id }
    });

    if (!mediaAsset) {
      throw new AppError('Media not found', 404);
    }

    // Delete from S3
    const urlParts = new URL(mediaAsset.fileUrl);
    const key = urlParts.pathname.substring(1);
    await deleteFromS3(key);

    // Delete from database
    await prisma.mediaAsset.delete({ where: { id: mediaId } });

    res.json({ message: 'Media deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Update media order
export const updateMediaOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { mediaOrder } = req.body; // Array of { id, displayOrder }

    const profile = await prisma.profile.findFirst({ where: { userId } });
    if (!profile) {
      throw new AppError('Profile not found', 404);
    }

    await Promise.all(
      mediaOrder.map(({ id, displayOrder }: any) =>
        prisma.mediaAsset.updateMany({
          where: { id, profileId: profile.id },
          data: { displayOrder }
        })
      )
    );

    res.json({ message: 'Media order updated successfully' });
  } catch (error) {
    next(error);
  }
};

// backend/src/routes/media.routes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  uploadSingleFile,
  uploadArchive,
  getUploadUrl,
  listMedia,
  deleteMedia,
  updateMediaOrder
} from '../controllers/media.controller';

const router = Router();

router.use(authenticate);
router.post('/upload', uploadSingleFile);
router.post('/upload-archive', uploadArchive);
router.post('/upload-url', getUploadUrl);
router.get('/list', listMedia);
router.delete('/:mediaId', deleteMedia);
router.put('/order', updateMediaOrder);

export default router;