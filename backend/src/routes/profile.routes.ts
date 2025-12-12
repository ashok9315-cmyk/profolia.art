import { Router } from 'express';
import { 
  suggestUsernames, 
  checkUsername,
  getCurrentProfile,
  getProfessionCustomFields,
  upsertProfile,
  deleteProfile,
  getPublicProfile,
  togglePublishProfile
} from '../controllers/profile.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   GET /api/profiles/suggestions?name=John%20Doe
 * @desc    Get username suggestions based on name
 * @access  Private
 */
router.get('/suggestions', authenticate, suggestUsernames);

/**
 * @route   GET /api/profiles/check/:username
 * @desc    Check if username is available
 * @access  Public
 */
router.get('/check/:username', checkUsername);

/**
 * @route   GET /api/profiles/me
 * @desc    Get current user's profile
 * @access  Private
 */
router.get('/me', authenticate, getCurrentProfile);

/**
 * @route   GET /api/profiles/fields/:professionType
 * @desc    Get profession-specific custom fields
 * @access  Private
 */
router.get('/fields/:professionType', authenticate, getProfessionCustomFields);

/**
 * @route   GET /api/profiles/public/:username
 * @desc    Get public profile by username
 * @access  Public
 */
router.get('/public/:username', getPublicProfile);

/**
 * @route   POST /api/profiles
 * @desc    Create or update user profile
 * @access  Private
 */
router.post('/', authenticate, upsertProfile);

/**
 * @route   PATCH /api/profiles/:profileId/publish
 * @desc    Publish or unpublish profile
 * @access  Private
 */
router.patch('/:profileId/publish', authenticate, togglePublishProfile);

/**
 * @route   DELETE /api/profiles/:profileId
 * @desc    Delete user profile
 * @access  Private
 */
router.delete('/:profileId', authenticate, deleteProfile);

export default router;
