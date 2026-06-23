import express from 'express';
import { queryAI } from '../controllers/aicontroller.js';
import userAuth from '../middleware/userauth.js';

const airouter = express.Router();

// Router endpoint for AI queries
airouter.post('/query', userAuth, queryAI);

export default airouter;
