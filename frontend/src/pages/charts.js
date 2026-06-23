import React, { useEffect, useState } from 'react';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Box, Typography, Paper, Grid, CircularProgress, Select, MenuItem, FormControl } from '@mui/material';
import Header from './Header';
import api from '../services/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const StatCard = ({ label, value, color }) => (
    <Paper elevation={3} sx={{
        p: 3, borderRadius: 3, textAlign: 'center',
        background: `linear-gradient(135deg, ${color}22, ${color}44)`,
        border: `1px solid ${color}55`,
    }}>
        <Typography variant="h4" fontWeight="bold" color={color}>{value}</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>{label}</Typography>
    </Paper>
);

function Charts() {
    const [dailyData, setDailyData] = useState([]);
    const [salaryData, setSalaryData] = useState([]);
    const [deptData, setDeptData] = useState([]);
    const [shiftData, setShiftData] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dailyDays, setDailyDays] = useState(7);
    const [salaryDays, setSalaryDays] = useState(30);

    const fetchDailyData = async (daysVal) => {
        try {
            const res = await api.get('/analytics/daily', { params: { days: daysVal } });
            setDailyData(res.data);
        } catch (e) {
            console.error('Error fetching daily analytics', e);
        }
    };

    const fetchSalaryData = async (daysVal) => {
        try {
            const res = await api.get('/analytics/salary', { params: { days: daysVal } });
            setSalaryData(res.data);
        } catch (e) {
            console.error('Error fetching salary analytics', e);
        }
    };

    const handleDailyDaysChange = (daysVal) => {
        setDailyDays(daysVal);
        fetchDailyData(daysVal);
    };

    const handleSalaryDaysChange = (daysVal) => {
        setSalaryDays(daysVal);
        fetchSalaryData(daysVal);
    };

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [daily, salary, dept, shift, stat] = await Promise.all([
                    api.get('/analytics/daily', { params: { days: dailyDays } }),
                    api.get('/analytics/salary', { params: { days: salaryDays } }),
                    api.get('/analytics/departments'),
                    api.get('/analytics/shifts'),
                    api.get('/analytics/stats'),
                ]);
                setDailyData(daily.data);
                setSalaryData(salary.data);
                setDeptData(dept.data);
                setShiftData(shift.data);
                setStats(stat.data);
            } catch (e) {
                console.error('Analytics fetch error', e);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    if (loading) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <CircularProgress />
        </Box>
    );

    return (
        <Box sx={{ bgcolor: '#f1f5f9', minHeight: '100vh', pb: 6 }}>
            <Header />
            <Box sx={{ pt: { xs: 10, sm: 12 }, px: { xs: 2, sm: 4 } }}>
                <Typography variant="h4" fontWeight="bold" mb={3} color="#1e293b">Analytics Dashboard</Typography>

                {/* Stat Cards */}
                {stats && (
                    <Grid container spacing={2} mb={4}>
                        <Grid item xs={6} sm={3}><StatCard label="Total Employees" value={stats.totalEmployees} color="#3b82f6" /></Grid>
                        <Grid item xs={6} sm={3}><StatCard label="Today's Check-ins" value={stats.todayCheckins} color="#10b981" /></Grid>
                        <Grid item xs={6} sm={3}><StatCard label="Active Now" value={stats.activeNow} color="#f59e0b" /></Grid>
                        <Grid item xs={6} sm={3}><StatCard label="Monthly Salary (₹)" value={`₹${stats.monthlySalary?.toLocaleString()}`} color="#8b5cf6" /></Grid>
                    </Grid>
                )}

                <Grid container spacing={3}>
                    {/* Daily Attendance Bar Chart */}
                    <Grid item xs={12} md={8}>
                        <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="h6" fontWeight="bold" color="#1e293b">Daily Attendance</Typography>
                                <FormControl size="small" sx={{ minWidth: 140 }}>
                                    <Select
                                        value={dailyDays}
                                        onChange={(e) => handleDailyDaysChange(e.target.value)}
                                    >
                                        <MenuItem value={7}>Last 7 Days</MenuItem>
                                        <MenuItem value={15}>Last 15 Days</MenuItem>
                                        <MenuItem value={30}>Last 30 Days</MenuItem>
                                    </Select>
                                </FormControl>
                            </Box>
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={dailyData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip />
                                    <Bar dataKey="count" name="Check-ins" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>

                    {/* Department Pie Chart */}
                    <Grid item xs={12} md={4}>
                        <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
                            <Typography variant="h6" fontWeight="bold" mb={2} color="#1e293b">Dept. Distribution</Typography>
                            <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                    <Pie data={deptData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                                        {deptData.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>

                    {/* Salary Trend Line Chart */}
                    <Grid item xs={12} md={8}>
                        <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="h6" fontWeight="bold" color="#1e293b">Salary Expenditure</Typography>
                                <FormControl size="small" sx={{ minWidth: 140 }}>
                                    <Select
                                        value={salaryDays}
                                        onChange={(e) => handleSalaryDaysChange(e.target.value)}
                                    >
                                        <MenuItem value={15}>Last 15 Days</MenuItem>
                                        <MenuItem value={30}>Last 30 Days</MenuItem>
                                        <MenuItem value={90}>Last 90 Days</MenuItem>
                                        <MenuItem value={180}>Last 180 Days</MenuItem>
                                    </Select>
                                </FormControl>
                            </Box>
                            <ResponsiveContainer width="100%" height={280}>
                                <LineChart data={salaryData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={Math.ceil(salaryDays / 8)} />
                                    <YAxis />
                                    <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
                                    <Line type="monotone" dataKey="salary" name="Salary (₹)" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>

                    {/* Shift Bar Chart */}
                    <Grid item xs={12} md={4}>
                        <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
                            <Typography variant="h6" fontWeight="bold" mb={2} color="#1e293b">Shift-wise Attendance</Typography>
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={shiftData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" allowDecimals={false} />
                                    <YAxis type="category" dataKey="shift" width={80} />
                                    <Tooltip />
                                    <Bar dataKey="count" name="Sessions" radius={[0, 4, 4, 0]}>
                                        {shiftData.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>
                </Grid>
            </Box>
        </Box>
    );
}

export default Charts;
