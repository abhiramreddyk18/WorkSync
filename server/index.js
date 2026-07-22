import express from 'express'
import dotenv from 'dotenv'
import mongodb from './db.js'
import cors from 'cors';

import employeerouter from './routers/employeerouter.js'
import cookieParser from 'cookie-parser'
import attendancerouter from './routers/attendancerouter.js';
import adminrouter from './routers/adminrouter.js';
import analyticsrouter from './routers/analyticsrouter.js';
import exportrouter from './routers/exportrouter.js';
import shiftrouter from './routers/shiftrouter.js';
import leaverouter from './routers/leaverouter.js';
import emailrouter from './routers/emailrouter.js';
import airouter from './routers/airouter.js';
import { initShifts } from './controllers/shiftcontroller.js';
import { initScheduler } from './services/emailscheduler.js';


const app=express()
dotenv.config()

const allowedOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:3000",
    "http://localhost:3001"
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            callback(null, true);
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json())
app.use(cookieParser())

app.use('/api/authemp',employeerouter);
app.use('/api/attendance',attendancerouter);
app.use('/api/admin',adminrouter);
app.use('/api/analytics', analyticsrouter);
app.use('/api/export', exportrouter);
app.use('/api/shifts', shiftrouter);
app.use('/api/leaves', leaverouter);
app.use('/api/emails', emailrouter);
app.use('/api/ai', airouter);


const port = process.env.PORT || 8000;

const startServer = async () => {
    const isConnected = await mongodb();
    if (isConnected) {
        await initShifts();
    } else {
        console.log("⚠️ Server started in offline-database mode. Connect MongoDB to activate full API features.");
    }
    initScheduler();
    
    app.listen(port, () => {
        console.log(`🚀 Server is running on Port ${port}`);
    });
};

startServer();