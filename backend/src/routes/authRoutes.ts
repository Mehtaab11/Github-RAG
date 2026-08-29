import express from 'express';
import {
  register,
  login,
  logout,
  oauthCallback,
  getProfile,
  updateProfile,
  deleteAccount,
} from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/oauth-callback', oauthCallback);
router.get('/me', requireAuth, getProfile);
router.put('/profile', requireAuth, updateProfile);
router.delete('/account', requireAuth, deleteAccount);

export default router;