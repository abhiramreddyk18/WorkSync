import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import employeemodel from './models/employee.js';
import adminmodel from './models/admin.js';
import dotenv from 'dotenv';

dotenv.config();

const mongoURI = process.env.MONGOURI || 'mongodb://localhost:27017/org';

async function seed() {
    try {
        await mongoose.connect(mongoURI);
        console.log("Connected to MongoDB for seeding...");

        // Define users to seed
        const rawPassword = 'password123';
        const hashPassword = await bcrypt.hash(rawPassword, 10);

        const employeesToSeed = [
            {
                empId: '10001',
                name: 'Aarav Sharma',
                email: 'aarav@worksync.com',
                password: hashPassword,
                role: 'worker',
                shift: 'morning',
                shiftStartTime: '08:00',
                isActive: true
            },
            {
                empId: '10002',
                name: 'Priya Patel',
                email: 'priya@worksync.com',
                password: hashPassword,
                role: 'worker',
                shift: 'evening',
                shiftStartTime: '16:00',
                isActive: true
            },
            {
                empId: '10003',
                name: 'Rohan Verma',
                email: 'rohan@worksync.com',
                password: hashPassword,
                role: 'hr',
                shift: 'morning',
                shiftStartTime: '08:00',
                isActive: true
            },
            {
                empId: '10004',
                name: 'Neha Gupta',
                email: 'neha@worksync.com',
                password: hashPassword,
                role: 'manager',
                shift: 'evening',
                shiftStartTime: '16:00',
                isActive: true
            },
            {
                empId: '10005',
                name: 'Vikram Singh',
                email: 'vikram@worksync.com',
                password: hashPassword,
                role: 'worker',
                shift: 'night',
                shiftStartTime: '00:00',
                isActive: true
            }
        ];

        for (const emp of employeesToSeed) {
            // Delete existing test user if present to prevent duplicate accumulation
            await employeemodel.deleteOne({ empId: emp.empId });
            const user = new employeemodel(emp);
            await user.save();
            console.log(`Seeded employee: ${emp.name} (ID: ${emp.empId})`);
        }

        // Also check if admin exists
        const adminExists = await adminmodel.findOne({ adminId: 'admin123' });
        if (!adminExists) {
            const admin = new adminmodel({
                adminId: 'admin123',
                email: 'admin@worksync.com'
            });
            await admin.save();
            console.log("Seeded default admin: admin@worksync.com / admin123");
        } else {
            console.log("Admin admin123 already exists.");
        }

        console.log("Seeding completed successfully.");
    } catch (err) {
        console.error("Seeding error:", err);
    } finally {
        await mongoose.disconnect();
    }
}

seed();
