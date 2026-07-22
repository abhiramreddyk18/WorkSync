import shiftmodel from '../models/shift.js';
import employeemodel from '../models/employee.js';
import attendancemodel from '../models/attendance.js';
import adminmodel from '../models/admin.js';
import transporter from '../nodemail.js';

const DEFAULT_SHIFTS = [
    { name: 'morning', startTime: '08:00', endTime: '16:00', gracePeriodMinutes: 15, overtimeMultiplier: 1.5 },
    { name: 'evening', startTime: '16:00', endTime: '00:00', gracePeriodMinutes: 15, overtimeMultiplier: 1.5 },
    { name: 'night', startTime: '00:00', endTime: '08:00', gracePeriodMinutes: 15, overtimeMultiplier: 1.5 },
];

export const initShifts = async () => {
    try {
        for (const s of DEFAULT_SHIFTS) {
            const exists = await shiftmodel.findOne({ name: s.name });
            if (!exists) await shiftmodel.create(s);
        }
    } catch (error) {
        console.error("⚠️ Skipping shift initialization (Database offline or unreachable).");
    }
};

export const getShifts = async (req, res) => {
    try {
        const shifts = await shiftmodel.find();
        return res.status(200).send(shifts);
    } catch (error) {
        return res.status(500).send({ message: 'Error fetching shifts' });
    }
};

export const updateShift = async (req, res) => {
    const { name } = req.params;
    const { startTime, endTime, gracePeriodMinutes, overtimeMultiplier } = req.body;
    try {
        const shift = await shiftmodel.findOneAndUpdate(
            { name },
            { startTime, endTime, gracePeriodMinutes, overtimeMultiplier },
            { new: true }
        );
        if (!shift) return res.status(404).send({ message: 'Shift not found' });
        return res.status(200).send({ message: 'Shift updated', shift });
    } catch (error) {
        return res.status(500).send({ message: 'Error updating shift' });
    }
};

export const assignShift = async (req, res) => {
    const { empId, shift } = req.body;
    if (!['morning', 'evening', 'night', ''].includes(shift)) {
        return res.status(400).send({ message: 'Invalid shift name' });
    }
    try {
        const shiftTimes = { morning: '08:00', evening: '16:00', night: '00:00' };
        const user = await employeemodel.findOneAndUpdate(
            { empId },
            { shift, shiftStartTime: shiftTimes[shift] || '' },
            { new: true }
        );
        if (!user) return res.status(404).send({ message: 'Employee not found' });

        // Notify admins of the shift change
        try {
            const admins = await adminmodel.find();
            const managers = await employeemodel.find({ role: { $in: ['hr', 'manager'] } });
            
            const recipientEmails = new Set();
            admins.forEach(a => { if (a.email) recipientEmails.add(a.email); });
            managers.forEach(m => { if (m.email) recipientEmails.add(m.email); });
            if (user.email) recipientEmails.add(user.email);

            if (recipientEmails.size > 0) {
                const shiftMail = {
                    from: process.env.SENDER_EMAIL,
                    to: Array.from(recipientEmails).join(', '),
                    subject: `WorkSync Alert: Shift Assigned - ${user.name}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
                            <div style="text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-bottom: 20px;">
                                <h2 style="color: #1e3a8a; margin: 0;">Employee Shift Updated</h2>
                            </div>
                            <p>Hello Admin/Manager,</p>
                            <p>A new shift assignment has been processed:</p>
                            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: bold; color: #4a5568;">Name:</td>
                                    <td style="padding: 8px; border-bottom: 1px solid #edf2f7; color: #2d3748;">${user.name}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: bold; color: #4a5568;">Employee ID:</td>
                                    <td style="padding: 8px; border-bottom: 1px solid #edf2f7; color: #2d3748;">${user.empId}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: bold; color: #4a5568;">Shift:</td>
                                    <td style="padding: 8px; border-bottom: 1px solid #edf2f7; color: #2d3748; text-transform: capitalize;">${user.shift || 'Unassigned (None)'}</td>
                                </tr>
                            </table>
                            <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;" />
                            <p style="text-align: center; color: #a0aec0; font-size: 12px; margin: 0;">WorkSync System</p>
                        </div>
                    `
                };
                transporter.sendMail(shiftMail).catch(err => console.error('Error sending shift assignment email:', err));
            }
        } catch (emailErr) {
            console.error('Error sending shift assignment email:', emailErr);
        }

        return res.status(200).send({ message: 'Shift assigned', user });
    } catch (error) {
        return res.status(500).send({ message: 'Error assigning shift' });
    }
};

export const getLateReport = async (req, res) => {
    try {
        const { from, to, shift } = req.query;
        const filter = { isLate: true };
        
        if (shift) {
            filter.shift = shift;
        }
        
        if (from || to) {
            filter.InTime = {};
            if (from) filter.InTime.$gte = new Date(from);
            if (to) filter.InTime.$lte = new Date(to + 'T23:59:59');
        }
        
        // Default rule: If no filters are provided, only show current shift for today
        if (!shift && !from && !to) {
            const hour = new Date().getHours();
            let currentShift = 'night';
            if (hour >= 8 && hour < 16) {
                currentShift = 'morning';
            } else if (hour >= 16 && hour < 24) {
                currentShift = 'evening';
            }
            filter.shift = currentShift;
            
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            const end = new Date();
            end.setHours(23, 59, 59, 999);
            filter.InTime = { $gte: start, $lte: end };
        }
        
        const records = await attendancemodel.find(filter).sort({ createdAt: -1 });
        return res.status(200).send(records);
    } catch (error) {
        return res.status(500).send({ message: 'Error fetching late report' });
    }
};
