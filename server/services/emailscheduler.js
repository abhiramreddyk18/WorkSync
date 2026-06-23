import cron from 'node-cron';
import transporter from '../nodemail.js';
import adminmodel from '../models/admin.js';
import employeemodel from '../models/employee.js';
import attendancemodel from '../models/attendance.js';
import leavemodel from '../models/leave.js';

// Session-level stats log
export const emailStats = {
    totalSent: 0,
    lastDailySent: null,
    lastWeeklySent: null,
    logs: []
};

// Helper to log and send email
export const logAndSendMail = async (mailOptions, type) => {
    try {
        const result = await transporter.sendMail(mailOptions);
        emailStats.totalSent += 1;
        if (type === 'daily') emailStats.lastDailySent = new Date();
        if (type === 'weekly') emailStats.lastWeeklySent = new Date();
        
        emailStats.logs.unshift({
            time: new Date(),
            type,
            status: 'Success',
            recipients: mailOptions.to,
            subject: mailOptions.subject
        });
        
        if (emailStats.logs.length > 50) emailStats.logs.pop();
        return result;
    } catch (error) {
        emailStats.logs.unshift({
            time: new Date(),
            type,
            status: `Error: ${error.message}`,
            recipients: mailOptions.to,
            subject: mailOptions.subject
        });
        if (emailStats.logs.length > 50) emailStats.logs.pop();
        throw error;
    }
};

// Query list of absentees and employees on leave for a target date
export const getAttendanceSummaryData = async (targetDate) => {
    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(targetDate);
    end.setHours(23, 59, 59, 999);

    // Get checked in employees
    const checkins = await attendancemodel.find({
        InTime: { $gte: start, $lte: end }
    });
    const checkedInEmpIds = checkins.map(c => c.empId);

    // Get all active employees
    const allEmployees = await employeemodel.find({ isActive: true });
    
    // Get all approved leaves for today
    const leavesToday = await leavemodel.find({
        status: 'approved',
        startDate: { $lte: end },
        endDate: { $gte: start }
    });
    const leaveEmpMap = new Map(leavesToday.map(l => [l.empId, l]));

    const presentList = [];
    const absentList = [];
    const leaveList = [];

    allEmployees.forEach(emp => {
        if (checkedInEmpIds.includes(emp.empId)) {
            presentList.push(emp);
        } else if (leaveEmpMap.has(emp.empId)) {
            const leave = leaveEmpMap.get(emp.empId);
            leaveList.push({
                empId: emp.empId,
                name: emp.name,
                role: emp.role,
                shift: emp.shift || 'Unassigned',
                leaveType: leave.type,
                reason: leave.reason
            });
        } else {
            absentList.push(emp);
        }
    });

    return {
        dateStr: start.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        totalEmployees: allEmployees.length,
        presentCount: presentList.length,
        absentCount: absentList.length,
        leaveCount: leaveList.length,
        absentList,
        leaveList
    };
};

// Send Daily Absentee Summary
export const sendDailySummary = async (date = new Date()) => {
    try {
        const data = await getAttendanceSummaryData(date);
        
        // Find recipient emails
        const admins = await adminmodel.find();
        const managers = await employeemodel.find({ role: { $in: ['hr', 'manager'] } });
        
        const recipientEmails = new Set();
        admins.forEach(a => { if (a.email) recipientEmails.add(a.email); });
        managers.forEach(m => { if (m.email) recipientEmails.add(m.email); });

        if (recipientEmails.size === 0) {
            console.log('No recipients configured for daily attendance summary.');
            return;
        }

        const recipients = Array.from(recipientEmails).join(', ');

        // Format HTML email
        const absentRows = data.absentList.length > 0 
            ? data.absentList.map(emp => `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #2d3748;">${emp.name}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #4a5568;">${emp.empId}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #4a5568; text-transform: capitalize;">${emp.role}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #4a5568; text-transform: capitalize;">${emp.shift || 'None'}</td>
                </tr>
            `).join('')
            : `<tr><td colspan="4" style="padding: 15px; text-align: center; color: #a0aec0; font-style: italic;">All active employees checked in or are on approved leave today!</td></tr>`;

        const leaveRows = data.leaveList.length > 0
            ? data.leaveList.map(emp => `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #2d3748;">${emp.name}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #4a5568;">${emp.empId}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #e28743; font-weight: bold; text-transform: capitalize;">${emp.leaveType} Leave</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #718096; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${emp.reason}</td>
                </tr>
            `).join('')
            : `<tr><td colspan="4" style="padding: 15px; text-align: center; color: #a0aec0; font-style: italic;">No employees are on leave today.</td></tr>`;

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: recipients,
            subject: `WorkSync Daily Summary: ${data.dateStr}`,
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 700px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc;">
                    <div style="text-align: center; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 20px; border-radius: 8px 8px 0 0; margin-bottom: 25px; color: #ffffff;">
                        <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">WorkSync Daily Summary</h1>
                        <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Report for ${data.dateStr}</p>
                    </div>

                    <!-- Summary Stats Grid -->
                    <div style="display: table; width: 100%; margin-bottom: 25px; border-collapse: separate; border-spacing: 10px;">
                        <div style="display: table-row;">
                            <div style="display: table-cell; width: 25%; background-color: #ffffff; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid #3b82f6;">
                                <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Employees</div>
                                <div style="font-size: 20px; font-weight: 700; color: #1e293b; margin-top: 5px;">${data.totalEmployees}</div>
                            </div>
                            <div style="display: table-cell; width: 25%; background-color: #ffffff; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid #10b981;">
                                <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Present</div>
                                <div style="font-size: 20px; font-weight: 700; color: #047857; margin-top: 5px;">${data.presentCount}</div>
                            </div>
                            <div style="display: table-cell; width: 25%; background-color: #ffffff; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid #ef4444;">
                                <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Absent</div>
                                <div style="font-size: 20px; font-weight: 700; color: #b91c1c; margin-top: 5px;">${data.absentCount}</div>
                            </div>
                            <div style="display: table-cell; width: 25%; background-color: #ffffff; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid #f59e0b;">
                                <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">On Leave</div>
                                <div style="font-size: 20px; font-weight: 700; color: #b45309; margin-top: 5px;">${data.leaveCount}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Absent Employees List -->
                    <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; margin-bottom: 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                        <h2 style="color: #b91c1c; font-size: 18px; margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
                            <span>⚠️ Absentees Today (${data.absentCount})</span>
                        </h2>
                        <table style="width: 100%; border-collapse: collapse; text-align: left;">
                            <thead>
                                <tr style="background-color: #fef2f2;">
                                    <th style="padding: 10px; border-bottom: 2px solid #fee2e2; font-size: 13px; color: #991b1b; font-weight: bold;">Name</th>
                                    <th style="padding: 10px; border-bottom: 2px solid #fee2e2; font-size: 13px; color: #991b1b; font-weight: bold;">Emp ID</th>
                                    <th style="padding: 10px; border-bottom: 2px solid #fee2e2; font-size: 13px; color: #991b1b; font-weight: bold;">Role</th>
                                    <th style="padding: 10px; border-bottom: 2px solid #fee2e2; font-size: 13px; color: #991b1b; font-weight: bold;">Shift</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${absentRows}
                            </tbody>
                        </table>
                    </div>

                    <!-- On Leave List -->
                    <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                        <h2 style="color: #d97706; font-size: 18px; margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
                            📅 Approved Leaves Today (${data.leaveCount})
                        </h2>
                        <table style="width: 100%; border-collapse: collapse; text-align: left;">
                            <thead>
                                <tr style="background-color: #fef3c7;">
                                    <th style="padding: 10px; border-bottom: 2px solid #fde68a; font-size: 13px; color: #92400e; font-weight: bold;">Name</th>
                                    <th style="padding: 10px; border-bottom: 2px solid #fde68a; font-size: 13px; color: #92400e; font-weight: bold;">Emp ID</th>
                                    <th style="padding: 10px; border-bottom: 2px solid #fde68a; font-size: 13px; color: #92400e; font-weight: bold;">Type</th>
                                    <th style="padding: 10px; border-bottom: 2px solid #fde68a; font-size: 13px; color: #92400e; font-weight: bold;">Reason</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${leaveRows}
                            </tbody>
                        </table>
                    </div>

                    <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #94a3b8;">
                        <p>This report is automatically generated and sent by the WorkSync scheduler.</p>
                        <p style="margin-top: 5px;">WorkSync Admin Console &copy; 2026</p>
                    </div>
                </div>
            `
        };

        await logAndSendMail(mailOptions, 'daily');
        console.log(`Daily summary sent successfully to ${recipients}`);
    } catch (error) {
        console.error('Error running daily absentee summary cron:', error);
    }
};

// Send Weekly Attendance Summary
export const sendWeeklySummary = async () => {
    try {
        const today = new Date();
        const daysStats = [];
        const absentTracking = {}; // Maps empId -> count of absences

        // Fetch data for the last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const summaryData = await getAttendanceSummaryData(date);
            
            daysStats.push({
                dayLabel: date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
                present: summaryData.presentCount,
                absent: summaryData.absentCount,
                leave: summaryData.leaveCount
            });

            // Track persistent absences
            summaryData.absentList.forEach(emp => {
                if (!absentTracking[emp.empId]) {
                    absentTracking[emp.empId] = {
                        name: emp.name,
                        empId: emp.empId,
                        role: emp.role,
                        absentCount: 0
                    };
                }
                absentTracking[emp.empId].absentCount += 1;
            });
        }

        // Get persistent absentees (absent >= 3 days)
        const persistentAbsentees = Object.values(absentTracking)
            .filter(emp => emp.absentCount >= 3)
            .sort((a, b) => b.absentCount - a.absentCount);

        // Fetch aggregate weekly stats (salary paid, overtime hours)
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const recentRecords = await attendancemodel.find({
            createdAt: { $gte: sevenDaysAgo },
            active: false
        });

        const weeklyPayment = recentRecords.reduce((sum, r) => sum + (r.payment || 0), 0);
        const weeklyOvertime = recentRecords.reduce((sum, r) => sum + (r.overtimeHours || 0), 0);

        // Recipients
        const admins = await adminmodel.find();
        const managers = await employeemodel.find({ role: { $in: ['hr', 'manager'] } });
        
        const recipientEmails = new Set();
        admins.forEach(a => { if (a.email) recipientEmails.add(a.email); });
        managers.forEach(m => { if (m.email) recipientEmails.add(m.email); });

        if (recipientEmails.size === 0) {
            console.log('No recipients configured for weekly summary.');
            return;
        }

        const recipients = Array.from(recipientEmails).join(', ');

        // Format HTML
        const statRows = daysStats.map(stat => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #1e293b; font-weight: 500;">${stat.dayLabel}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #10b981; font-weight: bold; text-align: center;">${stat.present}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #ef4444; font-weight: bold; text-align: center;">${stat.absent}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #f59e0b; font-weight: bold; text-align: center;">${stat.leave}</td>
            </tr>
        `).join('');

        const persistentRows = persistentAbsentees.length > 0
            ? persistentAbsentees.map(emp => `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #2d3748;">${emp.name}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #4a5568;">${emp.empId}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #4a5568; text-transform: capitalize;">${emp.role}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #ef4444; font-weight: bold; text-align: center;">${emp.absentCount} / 7 days</td>
                </tr>
            `).join('')
            : `<tr><td colspan="4" style="padding: 15px; text-align: center; color: #64748b; font-style: italic;">No employees were absent for 3 or more days this week. Excellent!</td></tr>`;

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: recipients,
            subject: `WorkSync Weekly Attendance Summary: Past 7 Days`,
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 700px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc;">
                    <div style="text-align: center; background: linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 100%); padding: 20px; border-radius: 8px 8px 0 0; margin-bottom: 25px; color: #ffffff;">
                        <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">Weekly Performance Summary</h1>
                        <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Past 7 Days Attendance, Overtime & Pay analysis</p>
                    </div>

                    <!-- Aggregates Card -->
                    <div style="display: table; width: 100%; margin-bottom: 25px; border-collapse: separate; border-spacing: 10px;">
                        <div style="display: table-row;">
                            <div style="display: table-cell; width: 50%; background-color: #ffffff; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-top: 4px solid #3b82f6;">
                                <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Weekly Payroll Generated</div>
                                <div style="font-size: 22px; font-weight: 700; color: #1e3a8a; margin-top: 5px;">₹${Math.round(weeklyPayment).toLocaleString('en-IN')}</div>
                            </div>
                            <div style="display: table-cell; width: 50%; background-color: #ffffff; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-top: 4px solid #f59e0b;">
                                <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Total Overtime Approved</div>
                                <div style="font-size: 22px; font-weight: 700; color: #d97706; margin-top: 5px;">${weeklyOvertime.toFixed(1)} Hrs</div>
                            </div>
                        </div>
                    </div>

                    <!-- 7-Day Performance Grid -->
                    <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; margin-bottom: 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                        <h2 style="color: #1e3a8a; font-size: 18px; margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
                            📊 Daily Attendance Chart
                        </h2>
                        <table style="width: 100%; border-collapse: collapse; text-align: left;">
                            <thead>
                                <tr style="background-color: #f1f5f9;">
                                    <th style="padding: 10px; border-bottom: 2px solid #e2e8f0; font-size: 13px; color: #475569; font-weight: bold;">Day</th>
                                    <th style="padding: 10px; border-bottom: 2px solid #e2e8f0; font-size: 13px; color: #475569; font-weight: bold; text-align: center;">Present</th>
                                    <th style="padding: 10px; border-bottom: 2px solid #e2e8f0; font-size: 13px; color: #475569; font-weight: bold; text-align: center;">Absent</th>
                                    <th style="padding: 10px; border-bottom: 2px solid #e2e8f0; font-size: 13px; color: #475569; font-weight: bold; text-align: center;">On Leave</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${statRows}
                            </tbody>
                        </table>
                    </div>

                    <!-- Persistent Absentees -->
                    <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                        <h2 style="color: #ef4444; font-size: 18px; margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
                            ⚠️ High Absenteeism Alert (Absent &ge; 3 days)
                        </h2>
                        <p style="font-size: 13px; color: #64748b; margin-top: -5px; margin-bottom: 15px;">Employees who missed three or more shifts over the past 7 days without approved leaves.</p>
                        <table style="width: 100%; border-collapse: collapse; text-align: left;">
                            <thead>
                                <tr style="background-color: #fef2f2;">
                                    <th style="padding: 10px; border-bottom: 2px solid #fee2e2; font-size: 13px; color: #b91c1c; font-weight: bold;">Name</th>
                                    <th style="padding: 10px; border-bottom: 2px solid #fee2e2; font-size: 13px; color: #b91c1c; font-weight: bold;">Emp ID</th>
                                    <th style="padding: 10px; border-bottom: 2px solid #fee2e2; font-size: 13px; color: #b91c1c; font-weight: bold;">Role</th>
                                    <th style="padding: 10px; border-bottom: 2px solid #fee2e2; font-size: 13px; color: #b91c1c; font-weight: bold; text-align: center;">Absences</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${persistentRows}
                            </tbody>
                        </table>
                    </div>

                    <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #94a3b8;">
                        <p>This report is automatically compiled and sent by the WorkSync scheduler.</p>
                        <p style="margin-top: 5px;">WorkSync Admin Console &copy; 2026</p>
                    </div>
                </div>
            `
        };

        await logAndSendMail(mailOptions, 'weekly');
        console.log(`Weekly performance summary sent successfully to ${recipients}`);
    } catch (error) {
        console.error('Error running weekly attendance summary cron:', error);
    }
};

// Start background cron scheduler
export const initScheduler = () => {
    // Schedule Daily Absentee Summary: Runs every day at 8:00 PM (20:00)
    cron.schedule('0 20 * * *', () => {
        console.log('Starting scheduled job: Daily Absentee Summary...');
        sendDailySummary();
    });

    // Schedule Weekly Performance Summary: Runs every Sunday at 8:00 PM (20:00)
    cron.schedule('0 20 * * 0', () => {
        console.log('Starting scheduled job: Weekly Attendance Summary...');
        sendWeeklySummary();
    });

    console.log('WorkSync automated email cron jobs scheduled successfully (Daily: 8PM, Weekly: Sunday 8PM).');
};
