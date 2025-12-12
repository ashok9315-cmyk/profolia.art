import { Router } from 'express';
import { 
  generatePortfolio, 
  getPublicPortfolio, 
  getPortfolioHistory, 
  deletePortfolio 
} from '../controllers/portfolio.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/portfolios/generate
 * @desc    Generate portfolio using AI
 * @access  Private
 */
router.post('/generate', authenticate, generatePortfolio);

/**
 * @route   GET /api/portfolios/history/:profileId
 * @desc    Get portfolio generation history
 * @access  Private
 */
router.get('/history/:profileId', authenticate, getPortfolioHistory);

/**
 * @route   GET /api/portfolios/:username
 * @desc    Get public portfolio by username
 * @access  Public
 */
router.get('/:username', getPublicPortfolio);

/**
 * @route   DELETE /api/portfolios/:portfolioId
 * @desc    Delete specific portfolio
 * @access  Private
 */
router.delete('/:portfolioId', authenticate, deletePortfolio);

export default router;
