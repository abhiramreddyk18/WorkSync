import express from 'express';
import { applyLeave, getEmployeeLeaves, getAllLeaves, updateLeaveStatus } from '../controllers/leavecontroller.js';
import userAuth, { requireRole } from '../middleware/userauth.js';

const leaverouter = express.Router();

leaverouter.post('/apply', userAuth, applyLeave);
leaverouter.get('/employee/:empId', userAuth, getEmployeeLeaves);
leaverouter.get('/all', userAuth, requireRole('admin', 'hr', 'manager'), getAllLeaves);
leaverouter.put('/status', userAuth, requireRole('admin', 'hr', 'manager'), updateLeaveStatus);

export default leaverouter;
