import mongoose from 'mongoose'
import dotenv from 'dotenv/config'

const mongoURI = process.env.MONGOURI || 'mongodb://localhost:27017/org'

const mongodb = async () => {
    try {
        await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 5000
        });
        console.log("✅ Database is connected successfully");
        return true;
    } catch (error) {
        console.error(`⚠️ MongoDB Connection Failed (${mongoURI}): ${error.message}`);
        console.error("👉 Please make sure MongoDB is running or update MONGOURI in server/.env.");
        return false;
    }
}

export default mongodb;