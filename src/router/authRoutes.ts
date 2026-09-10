import { Router } from "express";
import { login, logout, signup, me, invite } from '../controllers/authController.js';
import {getCurrentUser} from '../middleware/getCurrentUser.js'

const router = Router();

router.post('/login', login)
router.post('/logout', getCurrentUser, logout);
router.post('/signup/:token', signup);
router.get('/me', getCurrentUser, me);
router.post('/invite', getCurrentUser, invite);

export default router;