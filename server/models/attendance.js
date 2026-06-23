import mongoose from 'mongoose';

const attendanceschema=mongoose.Schema({
    empId:{
        type:String,
        require:true
    },
    name:{
        type:String,
        require:true
    },
    OutTime:{
       
        type: Date, 
    },
    InTime:{
        type: Date, 
        default: Date.now
    },
    hours:{
        type:Number,
        default:0
    },
    payment:{
        type:Number,
        default:0
    },
    out:{
        type:Boolean,
        default:false
    },
    active:{
        type:Boolean,
        default:true
    },
    shift: { type: String, default: '' },
    isLate: { type: Boolean, default: false },
    lateMinutes: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    pendingOvertimeHours: { type: Number, default: 0 },
    approvedOvertimeHours: { type: Number, default: 0 },
    overtimeReason: { type: String, default: '' },
    overtimeStatus: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },
    isOnBreak: { type: Boolean, default: false },
    breakStart: { type: Date, default: null },
    breakDurationMins: { type: Number, default: 0 },
    workStatus: { type: String, enum: ['Active', 'Full Day', 'Half Day', 'Short Hours'], default: 'Active' },

},{ timestamps: true })

const attendancemodel=mongoose.model('attendance',attendanceschema);

export default attendancemodel