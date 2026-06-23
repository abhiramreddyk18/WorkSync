import express from 'express'
import { attend, attendfilter, getattend, intime, outTime, scanner, getAbsentees, startBreak, endBreak, requestOvertime, approveOvertime, getPendingOvertime } from '../controllers/attendancecontroller.js';
import userAuth, { requireRole } from '../middleware/userauth.js';

const attendancerouter = express.Router();

attendancerouter.post('/incoming', intime);
attendancerouter.post('/outgoing', outTime);
attendancerouter.post('/scanning', scanner);

// Secure endpoints
attendancerouter.get('/attend', userAuth, attend);
attendancerouter.get('/getattend', userAuth, requireRole('admin', 'hr', 'manager'), getattend);
attendancerouter.get('/attendfilter', userAuth, requireRole('admin', 'hr', 'manager'), attendfilter);
attendancerouter.get('/absentees', userAuth, requireRole('admin', 'hr', 'manager'), getAbsentees);
attendancerouter.post('/break/start', userAuth, startBreak);
attendancerouter.post('/break/end', userAuth, endBreak);

// Overtime routes
attendancerouter.post('/overtime/request', userAuth, requestOvertime);
attendancerouter.post('/overtime/approve', userAuth, requireRole('admin', 'hr', 'manager'), approveOvertime);
attendancerouter.get('/overtime/pending', userAuth, requireRole('admin', 'hr', 'manager'), getPendingOvertime);

export default attendancerouter;

