import express from 'express';
import { analyticsDaily, analyticsSalary, analyticsDepartments, analyticsShifts, analyticsStats } from '../controllers/attendancecontroller.js';
import userAuth, { requireRole } from '../middleware/userauth.js';

const analyticsrouter = express.Router();

// Only admin and manager can see detailed analytics
analyticsrouter.get('/daily', userAuth, requireRole('admin', 'manager'), analyticsDaily);
analyticsrouter.get('/salary', userAuth, requireRole('admin', 'manager'), analyticsSalary);
analyticsrouter.get('/departments', userAuth, requireRole('admin', 'manager'), analyticsDepartments);
analyticsrouter.get('/shifts', userAuth, requireRole('admin', 'manager'), analyticsShifts);
analyticsrouter.get('/stats', userAuth, requireRole('admin', 'manager'), analyticsStats);

export default analyticsrouter;
