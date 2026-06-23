import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, Button,
    Select, MenuItem, FormControl, InputLabel, Chip
} from '@mui/material';
import Header from './Header';
import api from '../services/api';

function ShiftManagement() {
    const [shifts, setShifts] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [lateReport, setLateReport] = useState([]);
    const [editShift, setEditShift] = useState({});
    const [assignEmpId, setAssignEmpId] = useState('');
    const [assignShift, setAssignShiftVal] = useState('morning');
    const [lateFilter, setLateFilter] = useState({ from: '', to: '', shift: '' });
    const [msg, setMsg] = useState('');

    useEffect(() => {
        fetchShifts();
        fetchEmployees();
        fetchLateReport();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchShifts = async () => {
        try {
            const res = await api.get('/shifts');
            setShifts(res.data);
            const map = {};
            res.data.forEach(s => { map[s.name] = { startTime: s.startTime, endTime: s.endTime, gracePeriodMinutes: s.gracePeriodMinutes, overtimeMultiplier: s.overtimeMultiplier || 1.5 }; });
            setEditShift(map);
        } catch (e) {
            console.error('Failed to fetch shifts', e);
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await api.get('/authemp/employeedetails');
            setEmployees(res.data);
        } catch (e) {
            console.error('Failed to fetch employees', e);
        }
    };

    const fetchLateReport = async () => {
        try {
            const params = {};
            if (lateFilter.from) params.from = lateFilter.from;
            if (lateFilter.to) params.to = lateFilter.to;
            if (lateFilter.shift) params.shift = lateFilter.shift;
            const res = await api.get('/shifts/late-report', { params });
            setLateReport(res.data);
        } catch (e) {
            console.error('Failed to fetch late report', e);
        }
    };

    const handleShiftUpdate = async (name) => {
        try {
            await api.put(`/shifts/${name}`, editShift[name]);
            setMsg(`${name} shift updated!`);
            setTimeout(() => setMsg(''), 3000);
        } catch {
            setMsg('Update failed');
        }
    };

    const handleAssign = async () => {
        try {
            await api.post(`/shifts/assign`, { empId: assignEmpId, shift: assignShift });
            setMsg(`Shift assigned to ${assignEmpId}`);
            fetchEmployees();
            setTimeout(() => setMsg(''), 3000);
        } catch {
            setMsg('Assignment failed');
        }
    };

    const shiftColor = { morning: '#f59e0b', evening: '#3b82f6', night: '#8b5cf6', '': '#94a3b8' };

    return (
        <Box sx={{ bgcolor: '#f1f5f9', minHeight: '100vh', pb: 6 }}>
            <Header />
            <Box sx={{ pt: { xs: 10, sm: 12 }, px: { xs: 2, sm: 4 } }}>
                <Typography variant="h4" fontWeight="bold" mb={3} color="#1e293b">Shift Management</Typography>
                {msg && <Typography color="success.main" mb={2}>{msg}</Typography>}

                {/* Shift Config */}
                <Paper elevation={2} sx={{ p: 3, borderRadius: 3, mb: 4 }}>
                    <Typography variant="h6" fontWeight="bold" mb={2}>Configure Shifts</Typography>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ bgcolor: '#1e293b' }}>
                                    {['Shift', 'Start Time', 'End Time', 'Grace (mins)', 'OT Multiplier', 'Action'].map(h => (
                                        <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold' }}>{h}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {shifts.map(shift => (
                                    <TableRow key={shift.name}>
                                        <TableCell>
                                            <Chip label={shift.name} size="small" sx={{ bgcolor: shiftColor[shift.name], color: 'white', textTransform: 'capitalize' }} />
                                        </TableCell>
                                        <TableCell>
                                            <TextField type="time" size="small" value={editShift[shift.name]?.startTime || ''}
                                                onChange={e => setEditShift(p => ({ ...p, [shift.name]: { ...p[shift.name], startTime: e.target.value } }))} />
                                        </TableCell>
                                        <TableCell>
                                            <TextField type="time" size="small" value={editShift[shift.name]?.endTime || ''}
                                                onChange={e => setEditShift(p => ({ ...p, [shift.name]: { ...p[shift.name], endTime: e.target.value } }))} />
                                        </TableCell>
                                        <TableCell>
                                            <TextField type="number" size="small" sx={{ width: 80 }} value={editShift[shift.name]?.gracePeriodMinutes || 15}
                                                onChange={e => setEditShift(p => ({ ...p, [shift.name]: { ...p[shift.name], gracePeriodMinutes: Number(e.target.value) } }))} />
                                        </TableCell>
                                        <TableCell>
                                            <TextField type="number" size="small" sx={{ width: 80 }} inputProps={{ step: 0.1 }} value={editShift[shift.name]?.overtimeMultiplier || 1.5}
                                                onChange={e => setEditShift(p => ({ ...p, [shift.name]: { ...p[shift.name], overtimeMultiplier: Number(e.target.value) } }))} />
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="contained" size="small" onClick={() => handleShiftUpdate(shift.name)} sx={{ bgcolor: '#3b82f6' }}>Save</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>

                {/* Assign Shift */}
                <Paper elevation={2} sx={{ p: 3, borderRadius: 3, mb: 4 }}>
                    <Typography variant="h6" fontWeight="bold" mb={2}>Assign Shift to Employee</Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                        <FormControl size="small" sx={{ minWidth: 200 }}>
                            <InputLabel>Employee</InputLabel>
                            <Select value={assignEmpId} label="Employee" onChange={e => setAssignEmpId(e.target.value)}>
                                {employees.map(emp => (
                                    <MenuItem key={emp.empId} value={emp.empId}>{emp.name} ({emp.empId})</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Shift</InputLabel>
                            <Select value={assignShift} label="Shift" onChange={e => setAssignShiftVal(e.target.value)}>
                                <MenuItem value="morning">Morning (8am-4pm)</MenuItem>
                                <MenuItem value="evening">Evening (4pm-12am)</MenuItem>
                                <MenuItem value="night">Night (12am-8am)</MenuItem>
                            </Select>
                        </FormControl>
                        <Button variant="contained" onClick={handleAssign} sx={{ bgcolor: '#10b981' }}>Assign</Button>
                    </Box>

                    {/* Employee shift table */}
                    <TableContainer sx={{ mt: 3 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                    {['Emp ID', 'Name', 'Role', 'Current Shift'].map(h => (
                                        <TableCell key={h} sx={{ fontWeight: 'bold' }}>{h}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {employees.map(emp => (
                                    <TableRow key={emp.empId} hover>
                                        <TableCell>{emp.empId}</TableCell>
                                        <TableCell>{emp.name}</TableCell>
                                        <TableCell>
                                            <Chip label={emp.role || 'worker'} size="small"
                                                color={emp.role === 'hr' ? 'success' : emp.role === 'manager' ? 'warning' : 'default'} />
                                        </TableCell>
                                        <TableCell>
                                            {emp.shift
                                                ? <Chip label={emp.shift} size="small" sx={{ bgcolor: shiftColor[emp.shift], color: 'white', textTransform: 'capitalize' }} />
                                                : <Chip label="Unassigned" size="small" />}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>

                {/* Late Arrival Report */}
                <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
                    <Typography variant="h6" fontWeight="bold" mb={2}>Late Arrival Report</Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2, alignItems: 'center' }}>
                        <TextField label="From" type="date" size="small" InputLabelProps={{ shrink: true }}
                            value={lateFilter.from} onChange={e => setLateFilter(p => ({ ...p, from: e.target.value }))} />
                        <TextField label="To" type="date" size="small" InputLabelProps={{ shrink: true }}
                            value={lateFilter.to} onChange={e => setLateFilter(p => ({ ...p, to: e.target.value }))} />
                        <FormControl size="small" sx={{ minWidth: 130 }}>
                            <InputLabel>Shift</InputLabel>
                            <Select value={lateFilter.shift} label="Shift" onChange={e => setLateFilter(p => ({ ...p, shift: e.target.value }))}>
                                <MenuItem value="">All</MenuItem>
                                <MenuItem value="morning">Morning</MenuItem>
                                <MenuItem value="evening">Evening</MenuItem>
                                <MenuItem value="night">Night</MenuItem>
                            </Select>
                        </FormControl>
                        <Button variant="contained" onClick={fetchLateReport}>Filter</Button>
                    </Box>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: '#fef2f2' }}>
                                    {['Emp ID', 'Name', 'Shift', 'Check-In Time', 'Late By (mins)'].map(h => (
                                        <TableCell key={h} sx={{ fontWeight: 'bold', color: '#ef4444' }}>{h}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {lateReport.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ color: '#94a3b8', py: 4 }}>
                                            No late arrivals found for selected filters.
                                        </TableCell>
                                    </TableRow>
                                ) : lateReport.map(r => (
                                    <TableRow key={r._id} hover>
                                        <TableCell>{r.empId}</TableCell>
                                        <TableCell>{r.name}</TableCell>
                                        <TableCell>
                                            <Chip label={r.shift || 'N/A'} size="small"
                                                sx={{ bgcolor: shiftColor[r.shift] || '#94a3b8', color: 'white', textTransform: 'capitalize' }} />
                                        </TableCell>
                                        <TableCell>{r.InTime ? new Date(r.InTime).toLocaleString() : '-'}</TableCell>
                                        <TableCell sx={{ color: '#ef4444', fontWeight: 'bold' }}>{r.lateMinutes} mins</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Box>
        </Box>
    );
}

export default ShiftManagement;
