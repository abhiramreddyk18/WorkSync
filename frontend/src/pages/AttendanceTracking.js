import React, { useEffect, useState } from 'react';
import {
    Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Typography,
    Container, TextField, Button, Box, Chip,
    Tabs, Tab, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import Header from '../pages/Header';
import api from '../services/api';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';

const Dashboard = () => {
    const [workers, setWorkers] = useState([]);
    const [empIdFilter, setEmpIdFilter] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    // Absent state
    const [tabIndex, setTabIndex] = useState(0); // 0 = Present, 1 = Absent
    const [absentDate, setAbsentDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [absentShift, setAbsentShift] = useState('');
    const [absentWorkers, setAbsentWorkers] = useState([]);

    useEffect(() => { fetchWorkers(); }, []);

    useEffect(() => {
        if (tabIndex === 1) {
            fetchAbsentees();
        }
    }, [tabIndex, absentDate, absentShift]); // eslint-disable-line react-hooks/exhaustive-deps

    const buildParams = () => {
        const filters = {};
        if (empIdFilter.trim()) filters.empId = empIdFilter.trim();
        if (fromDate) filters.from = fromDate;
        if (toDate) filters.to = toDate;
        return filters;
    };

    const fetchWorkers = async (filters = {}) => {
        try {
            const response = await api.get('/attendance/attendfilter', { params: filters });
            if (Array.isArray(response.data)) {
                // By default (no date filters), show only workers who are currently checked in (active)
                const displayData = (!filters.from && !filters.to)
                    ? response.data.filter(w => w.active)
                    : response.data;
                setWorkers(displayData);
            }
        } catch (error) { console.error('Error fetching workers:', error); }
    };

    const fetchAbsentees = async () => {
        try {
            const params = {};
            if (absentDate) params.date = absentDate;
            if (absentShift) params.shift = absentShift;
            const response = await api.get('/attendance/absentees', { params });
            if (Array.isArray(response.data)) {
                setAbsentWorkers(response.data);
            }
        } catch (error) {
            console.error('Error fetching absentees:', error);
        }
    };

    const handleSearch = () => fetchWorkers(buildParams());

    const handleExport = (type) => {
        const params = new URLSearchParams(buildParams());
        window.open(`${BASE_URL}/export/attendance/${type}${params.toString() ? '?' + params : ''}`, '_blank');
    };

    const formatDate = (iso) => iso ? new Date(iso).toLocaleString() : '-';
    const shiftColor = { morning: '#f59e0b', evening: '#3b82f6', night: '#8b5cf6', '': '#94a3b8' };

    return (
        <Container maxWidth="xl" sx={{ mt: 5, px: { xs: 1, sm: 3 } }}>
            <Header />
            <Typography variant="h4" align="center" gutterBottom sx={{ mb: 4, mt: { xs: 10, sm: 12 }, fontWeight: 'bold', color: '#1e293b' }}>
                Attendance Tracking
            </Typography>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={tabIndex} onChange={(e, newIdx) => setTabIndex(newIdx)} centered>
                    <Tab label="Present Employees" />
                    <Tab label="Absent Employees" />
                </Tabs>
            </Box>

            {tabIndex === 0 ? (
                <>
                    {/* Filters + Export Row */}
                    <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={3}>
                        <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
                            <TextField label="Filter by Emp ID" variant="outlined" size="small"
                                value={empIdFilter} onChange={e => setEmpIdFilter(e.target.value)} />
                            <TextField label="From" type="date" size="small" InputLabelProps={{ shrink: true }}
                                value={fromDate} onChange={e => setFromDate(e.target.value)} />
                            <TextField label="To" type="date" size="small" InputLabelProps={{ shrink: true }}
                                value={toDate} onChange={e => setToDate(e.target.value)} />
                            <Button variant="contained" onClick={handleSearch} sx={{ bgcolor: '#3b82f6' }}>Search</Button>
                            <Button variant="outlined" onClick={() => { setEmpIdFilter(''); setFromDate(''); setToDate(''); fetchWorkers(); }}>Clear</Button>
                        </Box>
                        <Box display="flex" gap={1}>
                            <Button variant="contained" onClick={() => handleExport('excel')} sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}>⬇ Excel</Button>
                            <Button variant="contained" onClick={() => handleExport('csv')} sx={{ bgcolor: '#8b5cf6', '&:hover': { bgcolor: '#7c3aed' } }}>⬇ CSV</Button>
                        </Box>
                    </Box>

                    <TableContainer component={Paper} elevation={3} sx={{ overflowX: 'auto' }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: '#1e293b' }}>
                                    {['Emp ID', 'Name', 'Shift', 'Check-In', 'Check-Out', 'Hours', 'Status', 'Break (mins)', 'Overtime (hrs)', 'Payment', 'Late?', 'Active', 'Created At'].map(h => (
                                        <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{h}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {workers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={13} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                                            No attendance records found.
                                        </TableCell>
                                    </TableRow>
                                ) : workers.map((w, i) => (
                                    <TableRow key={i} hover>
                                        <TableCell>{w.empId}</TableCell>
                                        <TableCell>{w.name}</TableCell>
                                        <TableCell>
                                            {w.shift
                                                ? <Chip label={w.shift} size="small" sx={{ bgcolor: shiftColor[w.shift] || '#94a3b8', color: 'white', textTransform: 'capitalize' }} />
                                                : <Chip label="-" size="small" />}
                                        </TableCell>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(w.InTime)}</TableCell>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{w.OutTime ? formatDate(w.OutTime) : 'Active'}</TableCell>
                                        <TableCell>{typeof w.hours === 'number' ? w.hours.toFixed(2) : w.hours}</TableCell>
                                        <TableCell>
                                            {w.workStatus ? (
                                                <Chip 
                                                    label={w.workStatus} 
                                                    size="small" 
                                                    color={
                                                        w.workStatus === 'Full Day' ? 'success' : 
                                                        w.workStatus === 'Half Day' ? 'info' : 
                                                        w.workStatus === 'Short Hours' ? 'warning' : 'primary'
                                                    } 
                                                />
                                            ) : (
                                                <Chip label={w.active ? 'Active' : 'Checked Out'} size="small" color={w.active ? 'primary' : 'default'} />
                                            )}
                                        </TableCell>
                                        <TableCell>{w.breakDurationMins || 0}</TableCell>
                                        <TableCell>{typeof w.overtimeHours === 'number' ? w.overtimeHours.toFixed(2) : w.overtimeHours || '0.00'}</TableCell>
                                        <TableCell>₹{w.payment}</TableCell>
                                        <TableCell>
                                            {w.isLate
                                                ? <Chip label={`${w.lateMinutes || 0} min`} size="small" color="error" />
                                                : <Chip label="On time" size="small" color="success" />}
                                        </TableCell>
                                        <TableCell>{w.active ? <Chip label="Yes" size="small" color="warning" /> : 'No'}</TableCell>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(w.createdAt)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </>
            ) : (
                <>
                    {/* Absent Filters */}
                    <Box display="flex" gap={2} flexWrap="wrap" alignItems="center" mb={3}>
                        <TextField label="Select Date" type="date" size="small" InputLabelProps={{ shrink: true }}
                            value={absentDate} onChange={e => setAbsentDate(e.target.value)} />
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Filter by Shift</InputLabel>
                            <Select value={absentShift} label="Filter by Shift" onChange={e => setAbsentShift(e.target.value)}>
                                <MenuItem value="">All Shifts</MenuItem>
                                <MenuItem value="morning">Morning</MenuItem>
                                <MenuItem value="evening">Evening</MenuItem>
                                <MenuItem value="night">Night</MenuItem>
                            </Select>
                        </FormControl>
                        <Button variant="contained" onClick={fetchAbsentees} sx={{ bgcolor: '#3b82f6' }}>Refresh</Button>
                    </Box>

                    <TableContainer component={Paper} elevation={3} sx={{ overflowX: 'auto' }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: '#fef2f2' }}>
                                    {['Emp ID', 'Name', 'Email', 'Role', 'Assigned Shift'].map(h => (
                                        <TableCell key={h} sx={{ color: '#ef4444', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{h}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {absentWorkers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                                            No absent employees found for this date.
                                        </TableCell>
                                    </TableRow>
                                ) : absentWorkers.map((emp, i) => (
                                    <TableRow key={i} hover>
                                        <TableCell>{emp.empId}</TableCell>
                                        <TableCell>{emp.name}</TableCell>
                                        <TableCell>{emp.email}</TableCell>
                                        <TableCell>
                                            <Chip label={emp.role || 'worker'} size="small"
                                                color={emp.role === 'hr' ? 'success' : emp.role === 'manager' ? 'warning' : 'default'} />
                                        </TableCell>
                                        <TableCell>
                                            {emp.shift
                                                ? <Chip label={emp.shift} size="small" sx={{ bgcolor: shiftColor[emp.shift] || '#94a3b8', color: 'white', textTransform: 'capitalize' }} />
                                                : <Chip label="Unassigned" size="small" />}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </>
            )}
        </Container>
    );
};

export default Dashboard;
