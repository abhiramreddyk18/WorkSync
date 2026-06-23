import leavemodel from '../models/leave.js';
import employeemodel from '../models/employee.js';
import adminmodel from '../models/admin.js';
import transporter from '../nodemail.js';

// Apply for leave (Employee only)
export const applyLeave = async (req, res) => {
    try {
        const { startDate, endDate, reason, type } = req.body;
        const employeeId = req.body.USER_ID; // populated by userAuth middleware

        const employee = await employeemodel.findById(employeeId);
        if (!employee) {
            return res.status(404).send({ message: "Employee not found." });
        }

        const leave = new leavemodel({
            empId: employee.empId,
            name: employee.name,
            startDate,
            endDate,
            reason,
            type,
            status: 'pending'
        });

        await leave.save();

        // Notify admins and HR/managers about the leave request
        try {
            const admins = await adminmodel.find();
            const managers = await employeemodel.find({ role: { $in: ['hr', 'manager'] } });
            
            const recipientEmails = new Set();
            admins.forEach(a => { if (a.email) recipientEmails.add(a.email); });
            managers.forEach(m => { if (m.email) recipientEmails.add(m.email); });

            if (recipientEmails.size > 0) {
                const mailOptions = {
                    from: process.env.SENDER_EMAIL,
                    to: Array.from(recipientEmails).join(', '),
                    subject: `WorkSync Alert: New Leave Request from ${employee.name}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
                            <div style="text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-bottom: 20px;">
                                <h2 style="color: #1e3a8a; margin: 0;">New Leave Request</h2>
                            </div>
                            <p>Hello Admin/Manager,</p>
                            <p>A new leave request has been submitted by <strong>${employee.name}</strong> and is pending approval.</p>
                            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: bold; color: #4a5568;">Employee Name:</td>
                                    <td style="padding: 8px; border-bottom: 1px solid #edf2f7; color: #2d3748;">${employee.name}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: bold; color: #4a5568;">Employee ID:</td>
                                    <td style="padding: 8px; border-bottom: 1px solid #edf2f7; color: #2d3748;">${employee.empId}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: bold; color: #4a5568;">Leave Type:</td>
                                    <td style="padding: 8px; border-bottom: 1px solid #edf2f7; color: #2d3748; text-transform: capitalize;">${type}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: bold; color: #4a5568;">Start Date:</td>
                                    <td style="padding: 8px; border-bottom: 1px solid #edf2f7; color: #2d3748;">${new Date(startDate).toLocaleDateString('en-IN')}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: bold; color: #4a5568;">End Date:</td>
                                    <td style="padding: 8px; border-bottom: 1px solid #edf2f7; color: #2d3748;">${new Date(endDate).toLocaleDateString('en-IN')}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: bold; color: #4a5568;">Reason:</td>
                                    <td style="padding: 8px; border-bottom: 1px solid #edf2f7; color: #2d3748;">${reason}</td>
                                </tr>
                            </table>
                            <p>Please log in to the WorkSync Admin dashboard to approve or reject this request.</p>
                            <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;" />
                            <p style="text-align: center; color: #a0aec0; font-size: 12px; margin: 0;">WorkSync Worker Management System</p>
                        </div>
                    `
                };
                transporter.sendMail(mailOptions).catch(err => console.error('Error sending leave request email:', err));
            }
        } catch (emailErr) {
            console.error('Error gathering emails for leave notification:', emailErr);
        }

        return res.status(201).send({ message: "Leave request submitted successfully.", leave });
    } catch (error) {
        console.error("Error in applyLeave:", error);
        return res.status(500).send({ message: "Error applying for leave." });
    }
};

// Fetch leave history of an employee (Employee / Admin / HR / Manager)
export const getEmployeeLeaves = async (req, res) => {
    try {
        const { empId } = req.params;
        const leaves = await leavemodel.find({ empId }).sort({ createdAt: -1 });
        return res.status(200).send(leaves);
    } catch (error) {
        console.error("Error in getEmployeeLeaves:", error);
        return res.status(500).send({ message: "Error fetching employee leaves." });
    }
};

// Fetch all leaves (Admin / HR / Manager)
export const getAllLeaves = async (req, res) => {
    try {
        const leaves = await leavemodel.find().sort({ createdAt: -1 });
        return res.status(200).send(leaves);
    } catch (error) {
        console.error("Error in getAllLeaves:", error);
        return res.status(500).send({ message: "Error fetching all leaves." });
    }
};

// Update leave status (Admin / HR / Manager)
export const updateLeaveStatus = async (req, res) => {
    try {
        const { leaveId, status } = req.body; // status: 'approved' or 'rejected'
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).send({ message: "Invalid status value." });
        }

        const leave = await leavemodel.findByIdAndUpdate(leaveId, { status }, { new: true });
        if (!leave) {
            return res.status(404).send({ message: "Leave request not found." });
        }

        // If approved, increment employee's totalLeaves count by leave duration in days
        if (status === 'approved') {
            const days = Math.round((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1;
            await employeemodel.findOneAndUpdate({ empId: leave.empId }, { $inc: { totalLeaves: days } });
        }

        return res.status(200).send({ message: `Leave request status updated to ${status}.`, leave });
    } catch (error) {
        console.error("Error in updateLeaveStatus:", error);
        return res.status(500).send({ message: "Error updating leave status." });
    }
};
