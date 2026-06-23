import mongoose from 'mongoose';

const leaveschema = mongoose.Schema({
    empId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['sick', 'casual', 'earned', 'unpaid'],
        default: 'casual'
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    }
}, { timestamps: true });

const leavemodel = mongoose.model('leave', leaveschema);

export default leavemodel;
