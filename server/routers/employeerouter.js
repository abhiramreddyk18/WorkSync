import express from 'express'
import { attendancedetails, employeedetails, login, logout, otp_Send, register, resetpassword, userdetails, updateRole} from '../controllers/authemployee.js'
import userAuth, { requireRole } from '../middleware/userauth.js'
import { validateLogin, validateSignup } from '../middleware/validate.js'

const employeerouter=express.Router()

employeerouter.post('/register', register)
employeerouter.post('/login', login)
employeerouter.post('/logout', logout)
employeerouter.post('/otpSend', otp_Send)
employeerouter.post('/resetPassword', resetpassword)
employeerouter.get('/userdetails', userAuth, userdetails)
employeerouter.get('/attenddetails', userAuth, attendancedetails)
employeerouter.get('/attendancedetails', userAuth, attendancedetails)
employeerouter.get('/employeedetails', userAuth, requireRole('admin', 'hr', 'manager'), employeedetails)
employeerouter.put('/updateRole', userAuth, requireRole('admin'), updateRole);

export default employeerouter;
