import xlsx from 'xlsx';
import attendancemodel from '../models/attendance.js';

export const exportExcel = async (req, res) => {
    try {
        const { empId, from, to } = req.query;
        const filter = {};
        if (empId) filter.empId = empId;
        if (from || to) {
            filter.InTime = {};
            if (from) filter.InTime.$gte = new Date(from);
            if (to) filter.InTime.$lte = new Date(to + 'T23:59:59');
        }
        const records = await attendancemodel.find(filter).sort({ createdAt: -1 });
        const data = records.map(r => ({
            'Emp ID': r.empId,
            'Name': r.name,
            'Shift': r.shift || 'N/A',
            'Check In': r.InTime ? new Date(r.InTime).toLocaleString() : '-',
            'Check Out': r.OutTime ? new Date(r.OutTime).toLocaleString() : 'Still Working',
            'Hours': r.hours ? r.hours.toFixed(2) : '0',
            'Break (mins)': r.breakDurationMins || 0,
            'Overtime Hours': r.overtimeHours ? r.overtimeHours.toFixed(2) : '0.00',
            'Payment (₹)': r.payment ? r.payment.toFixed(2) : '0',
            'Late?': r.isLate ? 'Yes' : 'No',
            'Late By (mins)': r.lateMinutes || 0,
            'Status': r.active ? 'Active' : 'Completed'
        }));
        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(data);
        xlsx.utils.book_append_sheet(wb, ws, 'Attendance');
        const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename=attendance.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        return res.send(buf);
    } catch (error) {
        return res.status(500).send({ message: 'Export failed', error: error.message });
    }
};

export const exportCSV = async (req, res) => {
    try {
        const { empId, from, to } = req.query;
        const filter = {};
        if (empId) filter.empId = empId;
        if (from || to) {
            filter.InTime = {};
            if (from) filter.InTime.$gte = new Date(from);
            if (to) filter.InTime.$lte = new Date(to + 'T23:59:59');
        }
        const records = await attendancemodel.find(filter).sort({ createdAt: -1 });
        const header = 'Emp ID,Name,Shift,Check In,Check Out,Hours,Break (mins),Overtime Hours,Payment,Late?,Late By (mins),Status\n';
        const rows = records.map(r =>
            [
                r.empId, r.name, r.shift || 'N/A',
                r.InTime ? new Date(r.InTime).toLocaleString() : '-',
                r.OutTime ? new Date(r.OutTime).toLocaleString() : 'Still Working',
                r.hours ? r.hours.toFixed(2) : '0',
                r.breakDurationMins || 0,
                r.overtimeHours ? r.overtimeHours.toFixed(2) : '0.00',
                r.payment ? r.payment.toFixed(2) : '0',
                r.isLate ? 'Yes' : 'No',
                r.lateMinutes || 0,
                r.active ? 'Active' : 'Completed'
            ].join(',')
        ).join('\n');
        res.setHeader('Content-Disposition', 'attachment; filename=attendance.csv');
        res.setHeader('Content-Type', 'text/csv');
        return res.send(header + rows);
    } catch (error) {
        return res.status(500).send({ message: 'CSV export failed', error: error.message });
    }
};
