import React, { useEffect, useState } from 'react';
import Header from './Header';
import api from '../services/api';
import { Box, FormControl, InputLabel, Select, MenuItem, Chip, Button, Typography } from '@mui/material';
const roleColors = { worker: 'default', hr: 'success', manager: 'warning' };
const shiftColors = { morning: '#f59e0b', evening: '#3b82f6', night: '#8b5cf6', '': '#94a3b8' };

function Employeestable() {
    const [employees, setEmployees] = useState([]);
    const [roleFilter, setRoleFilter] = useState('');
    const [editMap, setEditMap] = useState({});
    const [msg, setMsg] = useState('');

    useEffect(() => { fetchEmployees(); }, []);

    const fetchEmployees = async () => {
        try {
            const res = await api.get('/authemp/employeedetails');
            setEmployees(res.data);
        } catch (err) {
            console.error('Failed to fetch employees:', err);
        }
    };

    const filtered = roleFilter ? employees.filter(e => e.role === roleFilter) : employees;

    const handleUpdate = async (empId) => {
        const { role, shift } = editMap[empId] || {};
        if (!role) return;
        try {
            await api.put('/authemp/updateRole', { empId, role, shift });
            setMsg(`Updated ${empId}`);
            fetchEmployees();
            setTimeout(() => setMsg(''), 3000);
        } catch {
            setMsg('Update failed');
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <Header />
            <Typography variant="h5" fontWeight="bold" sx={{ mb: 2, mt: { xs: 10, sm: 12 }, textAlign: 'center', color: '#1e293b' }}>
                Employee Management
            </Typography>
            {msg && <Typography color="success.main" textAlign="center" mb={2}>{msg}</Typography>}

            {/* Role Filter */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Filter by Role</InputLabel>
                    <Select value={roleFilter} label="Filter by Role" onChange={e => setRoleFilter(e.target.value)}>
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="worker">Worker</MenuItem>
                        <MenuItem value="hr">HR</MenuItem>
                        <MenuItem value="manager">Manager</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', boxShadow: '0px 4px 10px rgba(0,0,0,0.1)' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#1e293b', color: 'white' }}>
                            {['#', 'Emp ID', 'Name', 'Email', 'Role', 'Shift', 'Salary (₹)', 'Work Hrs', 'Active', 'Assign Role/Shift'].map(h => (
                                <th key={h} style={{ padding: '12px', border: '1px solid #ddd', fontSize: '14px', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((emp, i) => (
                            <tr key={emp._id || i}
                                style={{ backgroundColor: i % 2 === 0 ? '#f8f9fa' : '#ffffff' }}
                                onMouseOver={e => e.currentTarget.style.backgroundColor = '#e3f2fd'}
                                onMouseOut={e => e.currentTarget.style.backgroundColor = i % 2 === 0 ? '#f8f9fa' : '#ffffff'}>
                                <td style={cell}>{i + 1}</td>
                                <td style={cell}>{emp.empId}</td>
                                <td style={cell}>{emp.name}</td>
                                <td style={cell}>{emp.email}</td>
                                <td style={cell}>
                                    <Chip label={emp.role || 'worker'} size="small" color={roleColors[emp.role] || 'default'} />
                                </td>
                                <td style={cell}>
                                    {emp.shift
                                        ? <Chip label={emp.shift} size="small" sx={{ bgcolor: shiftColors[emp.shift], color: 'white', textTransform: 'capitalize' }} />
                                        : <span style={{ color: '#94a3b8' }}>None</span>}
                                </td>
                                <td style={cell}>₹{(Number(emp.salary) || 0).toFixed(2)}</td>
                                <td style={cell}>{emp.totalWorkHours?.toFixed(1) ?? '-'}</td>
                                <td style={cell}>{emp.isActive ? '✅' : '❌'}</td>
                                <td style={{ ...cell, minWidth: 260 }}>
                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                        <Select size="small" sx={{ minWidth: 100, fontSize: 13 }}
                                            value={editMap[emp.empId]?.role || emp.role || 'worker'}
                                            onChange={e => setEditMap(p => ({ ...p, [emp.empId]: { ...p[emp.empId], role: e.target.value } }))}>
                                            <MenuItem value="worker">Worker</MenuItem>
                                            <MenuItem value="hr">HR</MenuItem>
                                            <MenuItem value="manager">Manager</MenuItem>
                                        </Select>
                                        <Select size="small" sx={{ minWidth: 100, fontSize: 13 }}
                                            value={editMap[emp.empId]?.shift || emp.shift || ''}
                                            onChange={e => setEditMap(p => ({ ...p, [emp.empId]: { ...p[emp.empId], shift: e.target.value } }))}>
                                            <MenuItem value="">No Shift</MenuItem>
                                            <MenuItem value="morning">Morning</MenuItem>
                                            <MenuItem value="evening">Evening</MenuItem>
                                            <MenuItem value="night">Night</MenuItem>
                                        </Select>
                                        <Button size="small" variant="contained" onClick={() => handleUpdate(emp.empId)} sx={{ bgcolor: '#3b82f6', fontSize: 12 }}>Save</Button>
                                    </Box>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const cell = { padding: '10px', border: '1px solid #ddd', textAlign: 'center' };
export default Employeestable;
