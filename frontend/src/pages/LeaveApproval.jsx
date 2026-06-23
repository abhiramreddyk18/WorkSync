import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Button, Chip, Tabs, Tab
} from '@mui/material';
import Header from './Header';
import api from '../services/api';

function LeaveApproval() {
    const [leaves, setLeaves] = useState([]);
    const [tabIndex, setTabIndex] = useState(0); // 0 = Pending, 1 = All
    const [msg, setMsg] = useState('');

    useEffect(() => {
        fetchLeaves();
    }, []);

    const fetchLeaves = async () => {
        try {
            const res = await api.get('/leaves/all');
            setLeaves(res.data);
        } catch (e) {
            console.error('Failed to fetch leaves:', e);
        }
    };

    const handleAction = async (leaveId, status) => {
        try {
            await api.put('/leaves/status', { leaveId, status });
            setMsg(`Request successfully ${status}!`);
            fetchLeaves();
            setTimeout(() => setMsg(''), 3000);
        } catch (error) {
            setMsg(error.response?.data?.message || 'Action failed');
            setTimeout(() => setMsg(''), 3000);
        }
    };

    const filteredLeaves = tabIndex === 0
        ? leaves.filter(l => l.status === 'pending')
        : leaves;

    const shiftColors = { morning: '#f59e0b', evening: '#3b82f6', night: '#8b5cf6', '': '#94a3b8' };

    return (
        <Box sx={{ bgcolor: '#f1f5f9', minHeight: '100vh', pb: 6 }}>
            <Header />
            <Box sx={{ pt: { xs: 10, sm: 12 }, px: { xs: 2, sm: 4 } }}>
                <Typography variant="h4" fontWeight="bold" mb={3} color="#1e293b">Leave Approvals</Typography>
                {msg && <Typography color="success.main" mb={2} sx={{ fontWeight: 'bold' }}>{msg}</Typography>}

                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                    <Tabs value={tabIndex} onChange={(e, newIdx) => setTabIndex(newIdx)}>
                        <Tab label={`Pending (${leaves.filter(l => l.status === 'pending').length})`} />
                        <Tab label="All Leave Requests" />
                    </Tabs>
                </Box>

                <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 3 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#1e293b' }}>
                                {['Emp ID', 'Name', 'Type', 'Start Date', 'End Date', 'Days', 'Reason', 'Status', 'Actions'].map(h => (
                                    <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold', py: 1.5 }}>{h}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredLeaves.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                                        No leave requests found.
                                    </TableCell>
                                </TableRow>
                            ) : filteredLeaves.map((l) => {
                                const days = Math.round((new Date(l.endDate) - new Date(l.startDate)) / (1000 * 60 * 60 * 24)) + 1;
                                return (
                                    <TableRow key={l._id} hover>
                                        <TableCell>{l.empId}</TableCell>
                                        <TableCell>{l.name}</TableCell>
                                        <TableCell sx={{ textTransform: 'capitalize' }}>{l.type}</TableCell>
                                        <TableCell>{new Date(l.startDate).toLocaleDateString()}</TableCell>
                                        <TableCell>{new Date(l.endDate).toLocaleDateString()}</TableCell>
                                        <TableCell>{days}</TableCell>
                                        <TableCell sx={{ maxWidth: 200, wordWrap: 'break-word' }}>{l.reason}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={l.status}
                                                size="small"
                                                color={l.status === 'approved' ? 'success' : l.status === 'rejected' ? 'error' : 'warning'}
                                                sx={{ textTransform: 'capitalize' }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {l.status === 'pending' ? (
                                                <Box sx={{ display: 'flex', gap: 1 }}>
                                                    <Button
                                                        variant="contained"
                                                        color="success"
                                                        size="small"
                                                        onClick={() => handleAction(l._id, 'approved')}
                                                        sx={{ fontSize: '11px', py: 0.5 }}
                                                    >
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        variant="contained"
                                                        color="error"
                                                        size="small"
                                                        onClick={() => handleAction(l._id, 'rejected')}
                                                        sx={{ fontSize: '11px', py: 0.5 }}
                                                    >
                                                        Reject
                                                    </Button>
                                                </Box>
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">-</Typography>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </Box>
    );
}

export default LeaveApproval;
