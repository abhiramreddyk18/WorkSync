import express from 'express';
import { exportExcel, exportCSV } from '../controllers/exportcontroller.js';
import userAuth, { requireRole } from '../middleware/userauth.js';

const exportrouter = express.Router();

exportrouter.get('/attendance/excel', userAuth, requireRole('admin', 'hr', 'manager'), exportExcel);
exportrouter.get('/attendance/csv', userAuth, requireRole('admin', 'hr', 'manager'), exportCSV);

export default exportrouter;
