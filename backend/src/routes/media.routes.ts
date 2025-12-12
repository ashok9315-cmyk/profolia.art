import { Router } from 'express';
import { 
  uploadMediaFile, 
  uploadZipArchive, 
  getProfileMedia, 
  deleteMediaAsset,
  uploadMiddleware,
  uploadZipMiddleware 
} from '../controllers/media.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/media/upload
 * @desc    Upload single media file
 * @access  Private
 */
router.post('/upload', authenticate, uploadMiddleware, uploadMediaFile);

/**
 * @route   POST /api/media/upload-zip
 * @desc    Upload ZIP archive with multiple media files
 * @access  Private
 */
router.post('/upload-zip', authenticate, uploadZipMiddleware, uploadZipArchive);

/**
 * @route   GET /api/media
 * @desc    Get all media for user's profile
 * @access  Private
 */
router.get('/', authenticate, getProfileMedia);

/**
 * @route   DELETE /api/media/:mediaId
 * @desc    Delete specific media asset
 * @access  Private
 */
router.delete('/:mediaId', authenticate, deleteMediaAsset);

export default router;
