import { Router } from 'express';
import {
  getSession,
  login,
  logout,
  register,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getSession);

export default router;
