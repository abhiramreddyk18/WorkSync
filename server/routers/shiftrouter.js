import express from 'express';
import { getShifts, updateShift, assignShift, getLateReport } from '../controllers/shiftcontroller.js';
import userAuth, { requireRole } from '../middleware/userauth.js';

const shiftrouter = express.Router();

shiftrouter.get('/', userAuth, getShifts);
shiftrouter.put('/:name', userAuth, requireRole('admin'), updateShift);
shiftrouter.post('/assign', userAuth, requireRole('admin', 'hr', 'manager'), assignShift);
shiftrouter.get('/late-report', userAuth, requireRole('admin', 'hr', 'manager'), getLateReport);

export default shiftrouter;
