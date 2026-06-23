import mongoose from 'mongoose';

const shiftschema = mongoose.Schema({
    name: { type: String, enum: ['morning', 'evening', 'night'], required: true, unique: true },
    startTime: { type: String, default: '08:00' }, // HH:MM format
    endTime: { type: String, default: '16:00' },
    gracePeriodMinutes: { type: Number, default: 15 },
    overtimeMultiplier: { type: Number, default: 1.5 }
});

const shiftmodel = mongoose.model('shift', shiftschema);
export default shiftmodel;
