import express from 'express';
import { triggerDailySummary, triggerWeeklySummary, sendTestEmail, getEmailStats } from '../controllers/emailcontroller.js';
import userAuth, { requireRole } from '../middleware/userauth.js';

const emailrouter = express.Router();

emailrouter.post('/trigger-daily', userAuth, requireRole('admin', 'hr', 'manager'), triggerDailySummary);
emailrouter.post('/trigger-weekly', userAuth, requireRole('admin', 'hr', 'manager'), triggerWeeklySummary);
emailrouter.post('/test', userAuth, requireRole('admin'), sendTestEmail);
emailrouter.get('/stats', userAuth, requireRole('admin', 'hr', 'manager'), getEmailStats);

export default emailrouter;
