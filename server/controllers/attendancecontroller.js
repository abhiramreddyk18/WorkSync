import express from 'express'
import attendancemodel from '../models/attendance.js'
import jwt from 'jsonwebtoken'
import employeemodel from '../models/employee.js'
import shiftmodel from '../models/shift.js'
import leavemodel from '../models/leave.js'
import transporter from '../nodemail.js'

const getShiftDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 8; // fallback
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    let startMins = startH * 60 + startM;
    let endMins = endH * 60 + endM;
    if (endMins < startMins) {
        endMins += 24 * 60; // spans midnight
    }
    return (endMins - startMins) / 60; // duration in hours
};

// Helper function to verify if check-in is within shift hours with a 30-minute early buffer
const verifyShiftWindow = async (employeeShift) => {
    if (!employeeShift) {
        return { valid: false, message: "No shift has been allocated to you. Please contact your Admin." };
    }

    const shiftConfig = await shiftmodel.findOne({ name: employeeShift });
    if (!shiftConfig) {
        return { valid: false, message: "Allocated shift configuration not found." };
    }

    const now = new Date();
    const currentTimeInMins = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = shiftConfig.startTime.split(':').map(Number);
    // Allow check-in up to 30 minutes before shift starts
    let bufferStartMins = (startH * 60 + startM) - 30;
    if (bufferStartMins < 0) {
        bufferStartMins += 24 * 60; // Wrap day boundary
    }

    const [endH, endM] = shiftConfig.endTime.split(':').map(Number);
    const endTimeInMins = endH * 60 + endM;

    let isWithinShift = false;
    if (endTimeInMins > bufferStartMins) {
        isWithinShift = (currentTimeInMins >= bufferStartMins && currentTimeInMins <= endTimeInMins);
    } else {
        // Shift window spans midnight
        isWithinShift = (currentTimeInMins >= bufferStartMins || currentTimeInMins <= endTimeInMins);
    }

    if (!isWithinShift) {
        return { 
            valid: false, 
            message: `Access Denied: Your shift (${employeeShift}: ${shiftConfig.startTime}-${shiftConfig.endTime}) is not active right now.` 
        };
    }

    return { valid: true, shiftConfig };
};

const sendLateEmail = async (employee, lateMinutes, shift, inTime) => {
    try {
        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: employee.email,
            subject: 'WorkSync Alert: Late Check-In recorded',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
                    <div style="text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-bottom: 20px;">
                        <h2 style="color: #1e3a8a; margin: 0;">WorkSync Attendance Alert</h2>
                    </div>
                    <p>Hello <strong>${employee.name}</strong>,</p>
                    <p>This is to notify you that you have been recorded as <strong>Late</strong> for your shift today.</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: bold; color: #4a5568;">Employee ID:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #edf2f7; color: #2d3748;">${employee.empId}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: bold; color: #4a5568;">Shift:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #edf2f7; color: #2d3748; text-transform: capitalize;">${shift}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: bold; color: #4a5568;">Check-In Time:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #edf2f7; color: #2d3748;">${new Date(inTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: bold; color: #e53e3e;">Late Minutes:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #edf2f7; color: #e53e3e; font-weight: bold;">${lateMinutes} minutes</td>
                        </tr>
                    </table>
                    <p style="color: #718096; font-size: 14px;">Please make sure to check in within the allocated shift timing to avoid penalty or loss of pay.</p>
                    <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;" />
                    <p style="text-align: center; color: #a0aec0; font-size: 12px; margin: 0;">This is an automated message from WorkSync system. Please do not reply directly to this email.</p>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);
        console.log(`Late check-in email sent successfully to ${employee.email}`);
    } catch (error) {
        console.error('Error sending late email:', error);
    }
};

export const intime=async(req,res)=>{
    const{empId}=req.body;
    try {
        const user=await employeemodel.findOne({empId});
        if(!user)
        {
            return res.status(400).send({message:"user not exist"});
        }

        const activeSession = await attendancemodel.findOne({ empId, active: true });
        if (activeSession) {
            return res.status(400).send({ message: "Employee is already checked in!" });
        }

        const employeeShift = user.shift || '';
        // Enforce shift checks
        const shiftCheck = await verifyShiftWindow(employeeShift);
        if (!shiftCheck.valid) {
            return res.status(400).send({ message: shiftCheck.message });
        }

        const { shiftConfig } = shiftCheck;
        let isLate = false;
        let lateMinutes = 0;

        const now = new Date();
        const [shiftHour, shiftMin] = shiftConfig.startTime.split(':').map(Number);
        const shiftStart = new Date(now);
        shiftStart.setHours(shiftHour, shiftMin, 0, 0);
        const cutoff = new Date(shiftStart.getTime() + shiftConfig.gracePeriodMinutes * 60 * 1000);
        if (now > cutoff) {
            isLate = true;
            lateMinutes = Math.floor((now - cutoff) / 60000);
        }

        const attendance={
            empId, name: user.name,
            InTime: Date.now(),
            shift: employeeShift,
            isLate,
            lateMinutes
        }
        const Data=new attendancemodel(attendance);
        await Data.save()

        if (isLate) {
            sendLateEmail(user, lateMinutes, employeeShift, attendance.InTime);
        }

        return res.status(200).send({message:"Entry information added"})
    } catch (error) {
        console.log("error occur in intime", error);
        return res.status(500).send({message:"Error during check-in"})
    }
}

export const outTime=async(req,res)=>{
    const{empId}=req.body;
    try {
        const user=await employeemodel.findOne({empId});
        if(!user)
        {
            return res.status(402).send({message:"user not found"})
        }
        const data=await attendancemodel.findOne({empId: empId, active: true});
        if(!data)
        {
            return res.status(400).send({message:"employee was not in the Industry"})
        }
        data.OutTime = Date.now();
        
        let accumulatedBreakMins = data.breakDurationMins || 0;
        if (data.isOnBreak && data.breakStart) {
            const extraMins = Math.floor((data.OutTime - new Date(data.breakStart)) / 60000);
            accumulatedBreakMins += extraMins;
            data.breakDurationMins = accumulatedBreakMins;
            data.isOnBreak = false;
            data.breakStart = null;
        }

        const totalHours = (data.OutTime - data.InTime) / (1000 * 60 * 60);  
        const breakHours = accumulatedBreakMins / 60;
        const productiveHours = Math.max(0, totalHours - breakHours);
        
        // Apply 15-minute rounding (nearest 0.25 hour)
        const roundedHours = Math.round(productiveHours * 4) / 4;
        data.hours = roundedHours;

        let shiftDuration = 8; // fallback
        let multiplier = 1.5;
        if (data.shift) {
            const shiftConfig = await shiftmodel.findOne({ name: data.shift });
            if (shiftConfig) {
                shiftDuration = getShiftDuration(shiftConfig.startTime, shiftConfig.endTime);
                multiplier = shiftConfig.overtimeMultiplier || 1.5;
            }
        }

        // Determine workStatus based on roundedHours relative to shiftDuration
        let workStatus = "Short Hours";
        if (roundedHours >= shiftDuration - 1) {
            workStatus = "Full Day";
        } else if (roundedHours >= shiftDuration / 2) {
            workStatus = "Half Day";
        }
        data.workStatus = workStatus;

        let overtimeHours = 0;
        let pendingOvertimeHours = 0;
        let overtimeStatus = 'none';
        let payment = 0;

        if (roundedHours > shiftDuration) {
            const extraHours = roundedHours - shiftDuration;
            if (extraHours > 0.5) { // 30-minute grace buffer
                pendingOvertimeHours = Math.min(extraHours, 2.0); // cap at 2 hours max daily overtime
                overtimeStatus = 'pending';
            }
            payment = shiftDuration * user.hourlyRate;
        } else {
            payment = roundedHours * user.hourlyRate;
        }
        
        data.overtimeHours = 0;
        data.pendingOvertimeHours = pendingOvertimeHours;
        data.approvedOvertimeHours = 0;
        data.overtimeStatus = overtimeStatus;
        data.payment = payment;
        data.active = false;
        data.out = true;
        await data.save();

        const workedShiftHours = Math.min(roundedHours, shiftDuration);
        user.totalWorkHours += workedShiftHours;
        user.salary += payment;
        await user.save();

        return res.status(200).send({message:"employee go to outside"})

    } catch (error) {
        console.log("error occur in the attendance", error)
        return res.status(500).send({message:"Error during check-out"})
    }
}

export const attend=async(req,res)=>{
    const{empId}=req.body;
    try {
        const user =await employeemodel.findOne({empId})
        if(!user)
        {
            return res.status(400).send({message:"user not found"});
        }
        const attendancedata=await attendancemodel.find({empId}).sort({ createdAt: -1 });
        if(attendancedata.length===0)
        {
            return res.status(400).send({message:"he is new employee"})
        }
        return res.status(200).send(attendancedata);
        
    } catch (error) {
        console.log("error in the get attendance", error)
        return res.status(400).send({message:"error in the get attendance"})
    }
}

export const scanner=async(req,res)=>{
    const{empId}=req.body;
    try {
        const user=await employeemodel.findOne({empId});
        if(!user)
        {
            return res.status(402).send({message:"user not found"})
        }
        const data=await attendancemodel.findOne({empId: empId, active: true});
        if(!data)
        {
            const employeeShift = user.shift || '';
            // Enforce shift checks
            const shiftCheck = await verifyShiftWindow(employeeShift);
            if (!shiftCheck.valid) {
                return res.status(400).send({ message: shiftCheck.message });
            }

            const { shiftConfig } = shiftCheck;
            let isLate = false;
            let lateMinutes = 0;

            const now = new Date();
            const [shiftHour, shiftMin] = shiftConfig.startTime.split(':').map(Number);
            const shiftStart = new Date(now);
            shiftStart.setHours(shiftHour, shiftMin, 0, 0);
            const cutoff = new Date(shiftStart.getTime() + shiftConfig.gracePeriodMinutes * 60 * 1000);
            if (now > cutoff) {
                isLate = true;
                lateMinutes = Math.floor((now - cutoff) / 60000);
            }

            const attendance={
                empId, name: user.name,
                InTime: Date.now(),
                shift: employeeShift,
                isLate,
                lateMinutes
            }
            const Data=new attendancemodel(attendance);
            await Data.save()

            if (isLate) {
                sendLateEmail(user, lateMinutes, employeeShift, attendance.InTime);
            }

            return res.status(200).send({message:"Entry information added"})
        }
        data.OutTime = Date.now();
        
        let accumulatedBreakMins = data.breakDurationMins || 0;
        if (data.isOnBreak && data.breakStart) {
            const extraMins = Math.floor((data.OutTime - new Date(data.breakStart)) / 60000);
            accumulatedBreakMins += extraMins;
            data.breakDurationMins = accumulatedBreakMins;
            data.isOnBreak = false;
            data.breakStart = null;
        }

        const totalHours = (data.OutTime - data.InTime) / (1000 * 60 * 60);  
        const breakHours = accumulatedBreakMins / 60;
        const productiveHours = Math.max(0, totalHours - breakHours);
        
        // Apply 15-minute rounding (nearest 0.25 hour)
        const roundedHours = Math.round(productiveHours * 4) / 4;
        data.hours = roundedHours;

        let shiftDuration = 8; // fallback
        let multiplier = 1.5;
        if (data.shift) {
            const shiftConfig = await shiftmodel.findOne({ name: data.shift });
            if (shiftConfig) {
                shiftDuration = getShiftDuration(shiftConfig.startTime, shiftConfig.endTime);
                multiplier = shiftConfig.overtimeMultiplier || 1.5;
            }
        }

        // Determine workStatus based on roundedHours relative to shiftDuration
        let workStatus = "Short Hours";
        if (roundedHours >= shiftDuration - 1) {
            workStatus = "Full Day";
        } else if (roundedHours >= shiftDuration / 2) {
            workStatus = "Half Day";
        }
        data.workStatus = workStatus;

        let overtimeHours = 0;
        let pendingOvertimeHours = 0;
        let overtimeStatus = 'none';
        let payment = 0;

        if (roundedHours > shiftDuration) {
            const extraHours = roundedHours - shiftDuration;
            if (extraHours > 0.5) { // 30-minute grace buffer
                pendingOvertimeHours = Math.min(extraHours, 2.0); // cap at 2 hours max daily overtime
                overtimeStatus = 'pending';
            }
            payment = shiftDuration * user.hourlyRate;
        } else {
            payment = roundedHours * user.hourlyRate;
        }
        
        data.overtimeHours = 0;
        data.pendingOvertimeHours = pendingOvertimeHours;
        data.approvedOvertimeHours = 0;
        data.overtimeStatus = overtimeStatus;
        data.payment = payment;
        data.active = false;
        data.out = true;
        await data.save();

        const workedShiftHours = Math.min(roundedHours, shiftDuration);
        user.totalWorkHours += workedShiftHours;
        user.salary += payment;
        await user.save();

        return res.status(200).send({message:"employee go to outside"})

    } catch (error) {
        console.log("error occur in the attendance", error)
        return res.status(500).send({message:"Error during scanning"})
    }
}

export const getattend = async (req, res) => {
    try {
        const { empId, date, shift } = req.query;
        const query = {};
        
        if (empId) {
            query.empId = empId;
        }
        
        if (shift) {
            query.shift = shift;
        }
        
        if (date) {
            const start = new Date(date + 'T00:00:00');
            const end = new Date(date + 'T23:59:59.999');
            query.InTime = { $gte: start, $lte: end };
        }
        
        // Default rule: If no filters are provided, only show current shift for today
        if (!empId && !date && !shift) {
            const hour = new Date().getHours();
            let currentShift = 'night';
            if (hour >= 8 && hour < 16) {
                currentShift = 'morning';
            } else if (hour >= 16 && hour < 24) {
                currentShift = 'evening';
            }
            query.shift = currentShift;
            
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            const end = new Date();
            end.setHours(23, 59, 59, 999);
            query.InTime = { $gte: start, $lte: end };
        }
        
        const user = await attendancemodel.find(query).sort({ createdAt: -1 });
        return res.status(200).send(user);
        
    } catch (error) {
        console.log("error in the get attendance", error);
        return res.status(400).send({ message: "error in the get attendance" });
    }
};

export const attendfilter = async (req, res) => {
    try {
        const { empId, from, to } = req.query;
        const query = {};
        if (empId) {
            query.empId = empId;
        }
        if (from || to) {
            query.InTime = {};
            if (from) query.InTime.$gte = new Date(from);
            if (to) query.InTime.$lte = new Date(to + 'T23:59:59.999');
        }
        
        // Default rule: If no filters are provided, only show current shift for today
        if (!empId && !from && !to) {
            const hour = new Date().getHours();
            let currentShift = 'night';
            if (hour >= 8 && hour < 16) {
                currentShift = 'morning';
            } else if (hour >= 16 && hour < 24) {
                currentShift = 'evening';
            }
            query.shift = currentShift;
            
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            const end = new Date();
            end.setHours(23, 59, 59, 999);
            query.InTime = { $gte: start, $lte: end };
        }
        
        const Data = await attendancemodel.find(query).sort({ createdAt: -1 });
        return res.status(200).send(Data);
    } catch (error) {
        console.error("Error fetching attendance:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const analyticsDaily = async (req, res) => {
    try {
        const limitDays = parseInt(req.query.days) || 7;
        const days = [];
        for (let i = limitDays - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const start = new Date(date.setHours(0,0,0,0));
            const end = new Date(date.setHours(23,59,59,999));
            const count = await attendancemodel.countDocuments({ InTime: { $gte: start, $lte: end } });
            days.push({ date: start.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }), count });
        }
        return res.status(200).send(days);
    } catch (error) {
        return res.status(500).send({ message: 'Error fetching analytics' });
    }
};

export const analyticsSalary = async (req, res) => {
    try {
        const limitDays = parseInt(req.query.days) || 30;
        const days = [];
        for (let i = limitDays - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const start = new Date(date.setHours(0,0,0,0));
            const end = new Date(date.setHours(23,59,59,999));
            const records = await attendancemodel.find({ createdAt: { $gte: start, $lte: end }, active: false });
            const total = records.reduce((sum, r) => sum + (r.payment || 0), 0);
            days.push({ date: start.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }), salary: Math.round(total) });
        }
        return res.status(200).send(days);
    } catch (error) {
        return res.status(500).send({ message: 'Error fetching salary analytics' });
    }
};

export const analyticsDepartments = async (req, res) => {
    try {
        const employees = await employeemodel.find();
        const deptMap = {};
        employees.forEach(emp => {
            const dept = emp.department || 'Unassigned';
            deptMap[dept] = (deptMap[dept] || 0) + 1;
        });
        const data = Object.entries(deptMap).map(([name, value]) => ({ name, value }));
        return res.status(200).send(data);
    } catch (error) {
        return res.status(500).send({ message: 'Error fetching department analytics' });
    }
};

export const analyticsShifts = async (req, res) => {
    try {
        const shifts = ['morning', 'evening', 'night', ''];
        const data = await Promise.all(shifts.map(async (s) => {
            const count = await attendancemodel.countDocuments({ shift: s });
            return { shift: s || 'Unassigned', count };
        }));
        return res.status(200).send(data);
    } catch (error) {
        return res.status(500).send({ message: 'Error fetching shift analytics' });
    }
};

export const analyticsStats = async (req, res) => {
    try {
        const totalEmployees = await employeemodel.countDocuments();
        const today = new Date();
        const startOfDay = new Date(today.setHours(0,0,0,0));
        const endOfDay = new Date(today.setHours(23,59,59,999));
        const todayCheckins = await attendancemodel.countDocuments({ InTime: { $gte: startOfDay, $lte: endOfDay } });
        const activeNow = await attendancemodel.countDocuments({ active: true });
        const thisMonth = new Date();
        thisMonth.setDate(1); thisMonth.setHours(0,0,0,0);
        const monthlyRecords = await attendancemodel.find({ createdAt: { $gte: thisMonth }, active: false });
        const monthlySalary = monthlyRecords.reduce((sum, r) => sum + (r.payment || 0), 0);
        return res.status(200).send({ totalEmployees, todayCheckins, activeNow, monthlySalary: Math.round(monthlySalary) });
    } catch (error) {
        return res.status(500).send({ message: 'Error fetching stats' });
    }
};

export const getAbsentees = async (req, res) => {
    try {
        const { date, shift } = req.query; // date format: YYYY-MM-DD
        
        let start, end;
        if (date) {
            start = new Date(date + 'T00:00:00');
            end = new Date(date + 'T23:59:59.999');
        } else {
            const today = new Date();
            start = new Date(today.setHours(0,0,0,0));
            end = new Date(today.setHours(23,59,59,999));
        }

        const checkinFilter = {
            InTime: { $gte: start, $lte: end }
        };
        if (shift) {
            checkinFilter.shift = shift;
        }
        
        const checkins = await attendancemodel.find(checkinFilter).select('empId');
        const checkedInEmpIds = checkins.map(c => c.empId);

        const employeeFilter = { isActive: true };
        if (shift) {
            employeeFilter.shift = shift;
        } else if (!date) {
            // Default to current shift when no filter is provided
            const hour = new Date().getHours();
            let currentShift = 'night';
            if (hour >= 8 && hour < 16) {
                currentShift = 'morning';
            } else if (hour >= 16 && hour < 24) {
                currentShift = 'evening';
            }
            employeeFilter.shift = currentShift;
            checkinFilter.shift = currentShift; // Filter checkins by current shift too
        } else {
            // Only count employees who are assigned to a valid work shift (morning, evening, night)
            employeeFilter.shift = { $in: ['morning', 'evening', 'night'] };
        }
        
        const allEmployees = await employeemodel.find(employeeFilter).select('empId name email role shift');
        const absentees = allEmployees.filter(emp => !checkedInEmpIds.includes(emp.empId));

        // Filter out employees who have an approved leave request spanning the target date
        const targetDate = new Date(start);
        targetDate.setHours(0, 0, 0, 0);

        const leavesOnDate = await leavemodel.find({
            status: 'approved',
            startDate: { $lte: targetDate },
            endDate: { $gte: targetDate }
        }).select('empId');
        
        const leaveEmpIds = new Set(leavesOnDate.map(l => l.empId));
        const activeAbsentees = absentees.filter(emp => !leaveEmpIds.has(emp.empId));

        return res.status(200).send(activeAbsentees);
    } catch (error) {
        console.error("Error fetching absentees:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const startBreak = async (req, res) => {
    const { empId } = req.body;
    try {
        let employeeId = empId;
        if (!employeeId && req.body.USER_ID) {
            const employee = await employeemodel.findById(req.body.USER_ID);
            employeeId = employee.empId;
        }

        const data = await attendancemodel.findOne({ empId: employeeId, active: true });
        if (!data) {
            return res.status(400).send({ message: "Employee is not checked in." });
        }
        if (data.isOnBreak) {
            return res.status(400).send({ message: "Employee is already on break." });
        }

        data.isOnBreak = true;
        data.breakStart = Date.now();
        await data.save();

        return res.status(200).send({ message: "Break started.", data });
    } catch (error) {
        console.error("Error in startBreak:", error);
        return res.status(500).send({ message: "Error starting break." });
    }
};

export const endBreak = async (req, res) => {
    const { empId } = req.body;
    try {
        let employeeId = empId;
        if (!employeeId && req.body.USER_ID) {
            const employee = await employeemodel.findById(req.body.USER_ID);
            employeeId = employee.empId;
        }

        const data = await attendancemodel.findOne({ empId: employeeId, active: true });
        if (!data) {
            return res.status(400).send({ message: "Employee is not checked in." });
        }
        if (!data.isOnBreak || !data.breakStart) {
            return res.status(400).send({ message: "Employee is not on break." });
        }

        const elapsedMins = Math.floor((Date.now() - new Date(data.breakStart)) / 60000);
        data.breakDurationMins = (data.breakDurationMins || 0) + elapsedMins;
        data.isOnBreak = false;
        data.breakStart = null;
        await data.save();

        return res.status(200).send({ message: "Break ended.", data });
    } catch (error) {
        console.error("Error in endBreak:", error);
        return res.status(500).send({ message: "Error ending break." });
    }

};

// Request overtime approval (called by Employee)
export const requestOvertime = async (req, res) => {
    const { attendanceId, reason } = req.body;
    try {
        const attendance = await attendancemodel.findById(attendanceId);
        if (!attendance) {
            return res.status(404).send({ message: "Attendance record not found." });
        }
        
        // Ensure this belongs to the logged-in employee (unless manager/admin)
        if (attendance.empId !== req.body.USER_ID && req.body.USER_ROLE === 'worker') {
            // Find the employee by USER_ID to check their empId
            const emp = await employeemodel.findById(req.body.USER_ID);
            if (!emp || emp.empId !== attendance.empId) {
                return res.status(403).send({ message: "Access denied: cannot request overtime for other employees." });
            }
        }
        
        if (attendance.overtimeStatus !== 'pending') {
            return res.status(400).send({ message: `Cannot request overtime for record with status '${attendance.overtimeStatus}'.` });
        }
        
        attendance.overtimeReason = reason;
        await attendance.save();
        
        return res.status(200).send({ message: "Overtime request reason submitted successfully.", attendance });
    } catch (error) {
        console.error("Error in requestOvertime:", error);
        return res.status(500).send({ message: "Error requesting overtime." });
    }
};

// Approve/Reject overtime (called by Admin/HR/Manager)
export const approveOvertime = async (req, res) => {
    const { attendanceId, status, approvedHours } = req.body; // status: 'approved' or 'rejected'
    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).send({ message: "Invalid status value." });
    }
    try {
        const attendance = await attendancemodel.findById(attendanceId);
        if (!attendance) {
            return res.status(404).send({ message: "Attendance record not found." });
        }
        
        if (attendance.overtimeStatus !== 'pending') {
            return res.status(400).send({ message: `Overtime status is already '${attendance.overtimeStatus}'.` });
        }
        
        const user = await employeemodel.findOne({ empId: attendance.empId });
        if (!user) {
            return res.status(404).send({ message: "Employee not found." });
        }
        
        if (status === 'rejected') {
            attendance.overtimeStatus = 'rejected';
            attendance.approvedOvertimeHours = 0;
            await attendance.save();
            return res.status(200).send({ message: "Overtime request rejected.", attendance });
        }
        
        // If approved:
        const hoursToApprove = approvedHours !== undefined ? parseFloat(approvedHours) : attendance.pendingOvertimeHours;
        if (hoursToApprove <= 0 || hoursToApprove > attendance.pendingOvertimeHours) {
            return res.status(400).send({ message: `Approved hours must be between 0 and pending hours (${attendance.pendingOvertimeHours}).` });
        }
        
        let multiplier = 1.5;
        if (attendance.shift) {
            const shiftConfig = await shiftmodel.findOne({ name: attendance.shift });
            if (shiftConfig) {
                multiplier = shiftConfig.overtimeMultiplier || 1.5;
            }
        }
        
        const overtimePayment = hoursToApprove * user.hourlyRate * multiplier;
        
        attendance.overtimeHours = hoursToApprove;
        attendance.approvedOvertimeHours = hoursToApprove;
        attendance.overtimeStatus = 'approved';
        attendance.payment += overtimePayment;
        await attendance.save();
        
        user.totalWorkHours += hoursToApprove;
        user.overtimeHours = (user.overtimeHours || 0) + hoursToApprove;
        user.salary += overtimePayment;
        await user.save();
        
        return res.status(200).send({ message: "Overtime request approved successfully.", attendance });
    } catch (error) {
        console.error("Error in approveOvertime:", error);
        return res.status(500).send({ message: "Error approving overtime." });
    }
};

// Get all pending overtime requests
export const getPendingOvertime = async (req, res) => {
    try {
        const records = await attendancemodel.find({ overtimeStatus: 'pending' }).sort({ createdAt: -1 });
        return res.status(200).send(records);
    } catch (error) {
        console.error("Error in getPendingOvertime:", error);
        return res.status(500).send({ message: "Error fetching pending overtime records." });
    }
};
