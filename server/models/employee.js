import mongoose from 'mongoose'

const employeeschema=mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    empId:{
        type:String,
        required:true
    },
    
    email:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    role:{
        type:String,
        enum:['worker','hr','manager'],
        default:"worker"
    },
    otpsend:{
        type:String,
        default:""
    },
    otp_expiry_time:{
        type:Number,
        default:0
    },
    department:{
        type:String
    },
    salary:{type:Number,default:0},
    hourlyRate: { type: Number, default: 100 },
    totalWorkHours: { type: Number, default: 0 },
    totalLeaves: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    shift: { type: String, enum: ['morning', 'evening', 'night', ''], default: '' },
    shiftStartTime: { type: String, default: '' },

})

const employeemodel=mongoose.model('employee',employeeschema)

export default employeemodel;