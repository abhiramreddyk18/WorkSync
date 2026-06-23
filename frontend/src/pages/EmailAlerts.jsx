import React, { useEffect, useState } from 'react';
import Header from './Header';
import api from '../services/api';
import {
  Container, Grid, Card, CardContent, Typography, Button, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  CircularProgress, Box, Chip, Divider, Alert, Tooltip, IconButton
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import RefreshIcon from '@mui/icons-material/Refresh';
import SendIcon from '@mui/icons-material/Send';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TimerIcon from '@mui/icons-material/Timer';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

function EmailAlerts() {
  const [stats, setStats] = useState({
    totalSent: 0,
    lastDailySent: null,
    lastWeeklySent: null,
    logs: []
  });
  const [loading, setLoading] = useState(true);
  const [testEmail, setTestEmail] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', severity: 'success' });

  const fetchStats = async () => {
    try {
      const res = await api.get('/emails/stats');
      setStats(res.data);
    } catch (err) {
      console.error("Error fetching email statistics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Auto refresh stats logs every 10 seconds
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const showNotification = (message, severity = 'success') => {
    setNotification({ show: true, message, severity });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  const handleSendTest = async (e) => {
    e.preventDefault();
    if (!testEmail) return;
    setTestLoading(true);
    try {
      const res = await api.post('/emails/test', { toEmail: testEmail });
      showNotification(res.data.message, 'success');
      setStats(res.data.stats);
      setTestEmail('');
    } catch (err) {
      console.error("Test email failed:", err);
      showNotification(err.response?.data?.message || "Failed to send test email.", "error");
    } finally {
      setTestLoading(false);
    }
  };

  const handleTriggerDaily = async () => {
    setDailyLoading(true);
    try {
      const res = await api.post('/emails/trigger-daily');
      showNotification(res.data.message, 'success');
      setStats(res.data.stats);
    } catch (err) {
      console.error("Daily summary trigger failed:", err);
      showNotification(err.response?.data?.message || "Failed to send daily summary.", "error");
    } finally {
      setDailyLoading(false);
    }
  };

  const handleTriggerWeekly = async () => {
    setWeeklyLoading(true);
    try {
      const res = await api.post('/emails/trigger-weekly');
      showNotification(res.data.message, 'success');
      setStats(res.data.stats);
    } catch (err) {
      console.error("Weekly summary trigger failed:", err);
      showNotification(err.response?.data?.message || "Failed to send weekly summary.", "error");
    } finally {
      setWeeklyLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: '#f1f5f9' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <div style={containerStyle}>
      <Header />
      <Container maxWidth="xl" sx={{ mt: 13, mb: 4 }}>
        {/* Page Title & Refresh */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" sx={{ color: '#1e293b' }}>
              Automated Email Alerts
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
              Monitor background automated reports, check SMTP status, and trigger summaries manually.
            </Typography>
          </Box>
          <Tooltip title="Refresh Logs">
            <IconButton onClick={fetchStats} sx={{ bgcolor: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', '&:hover': { bgcolor: '#f8fafc' } }}>
              <RefreshIcon sx={{ color: '#007bff' }} />
            </IconButton>
          </Tooltip>
        </Box>

        {notification.show && (
          <Alert severity={notification.severity} sx={{ mb: 3, borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            {notification.message}
          </Alert>
        )}

        {/* Stats Section */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card sx={statCardStyle('#3b82f6')}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                <Box sx={iconWrapperStyle('#eff6ff')}>
                  <EmailIcon sx={{ color: '#3b82f6', fontSize: 30 }} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.8 }}>
                    Total Emails Sent (Session)
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" sx={{ color: '#1e293b', mt: 0.5 }}>
                    {stats.totalSent}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card sx={statCardStyle('#10b981')}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                <Box sx={iconWrapperStyle('#ecfdf5')}>
                  <TimerIcon sx={{ color: '#10b981', fontSize: 30 }} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.8 }}>
                    Last Daily Summary Sent
                  </Typography>
                  <Typography variant="body1" fontWeight="bold" sx={{ color: '#1e293b', mt: 1, fontSize: 15 }}>
                    {formatDate(stats.lastDailySent)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={statCardStyle('#8b5cf6')}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                <Box sx={iconWrapperStyle('#f5f3ff')}>
                  <AssessmentIcon sx={{ color: '#8b5cf6', fontSize: 30 }} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.8 }}>
                    Last Weekly Summary Sent
                  </Typography>
                  <Typography variant="body1" fontWeight="bold" sx={{ color: '#1e293b', mt: 1, fontSize: 15 }}>
                    {formatDate(stats.lastWeeklySent)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={4}>
          {/* Controls & Manual Triggers */}
          <Grid item xs={12} lg={4}>
            <Grid container spacing={3}>
              {/* Trigger Cards */}
              <Grid item xs={12}>
                <Card sx={panelCardStyle}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" sx={{ color: '#1e293b', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PlayArrowIconWrapper /> Manual Email Triggers
                    </Typography>
                    <Divider sx={{ mb: 2.5 }} />
                    <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
                      Force-send the absentee summary emails immediately to all configured Admin, HR, and Manager emails.
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleTriggerDaily}
                        disabled={dailyLoading}
                        fullWidth
                        startIcon={dailyLoading ? <CircularProgress size={20} color="inherit" /> : <EmailIcon />}
                        sx={{ py: 1.2, fontWeight: 'bold', borderRadius: '8px', textTransform: 'none' }}
                      >
                        {dailyLoading ? 'Sending Daily Summary...' : 'Send Daily Absentee Summary Now'}
                      </Button>

                      <Button
                        variant="contained"
                        color="secondary"
                        onClick={handleTriggerWeekly}
                        disabled={weeklyLoading}
                        fullWidth
                        startIcon={weeklyLoading ? <CircularProgress size={20} color="inherit" /> : <AssessmentIcon />}
                        sx={{ py: 1.2, fontWeight: 'bold', borderRadius: '8px', textTransform: 'none', bgcolor: '#8b5cf6', '&:hover': { bgcolor: '#7c3aed' } }}
                      >
                        {weeklyLoading ? 'Sending Weekly Summary...' : 'Send Weekly Summary Now'}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* SMTP test tool */}
              <Grid item xs={12}>
                <Card sx={panelCardStyle}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" sx={{ color: '#1e293b', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircleIcon sx={{ color: '#10b981' }} /> SMTP Health & Connection Test
                    </Typography>
                    <Divider sx={{ mb: 2.5 }} />
                    <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
                      Verify that Nodemailer and SMTP relay configurations are functioning by sending a test email.
                    </Typography>

                    <form onSubmit={handleSendTest}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                          type="email"
                          label="Recipient Email Address"
                          variant="outlined"
                          required
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                          placeholder="e.g. manager@example.com"
                          fullWidth
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                        />
                        <Button
                          type="submit"
                          variant="outlined"
                          color="success"
                          disabled={testLoading || !testEmail}
                          fullWidth
                          startIcon={testLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                          sx={{ py: 1.2, fontWeight: 'bold', borderRadius: '8px', textTransform: 'none', borderWidth: '2px', '&:hover': { borderWidth: '2px' } }}
                        >
                          {testLoading ? 'Sending Test...' : 'Send Test Email'}
                        </Button>
                      </Box>
                    </form>
                  </CardContent>
                </Card>
              </Grid>

              {/* Alert policies information */}
              <Grid item xs={12}>
                <Card sx={panelCardStyle}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" sx={{ color: '#1e293b', mb: 2 }}>
                      Notification Automations
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <ul style={{ paddingLeft: '20px', margin: 0, color: '#475569', fontSize: '13.5px', lineHeight: '2.2' }}>
                      <li>⚡ <strong>Late Alerts</strong>: Triggered immediately when an employee checks in late, alerting them of their check-in details.</li>
                      <li>📅 <strong>Leave Requests</strong>: Notifies all Admins/HR/Managers when an employee requests a leave.</li>
                      <li>👤 <strong>Profile & Shift Updates</strong>: Sends details changes (role & shift allocations) directly to management.</li>
                      <li>⏰ <strong>Daily Scheduler</strong>: Automated absentee summary sent every evening at 8:00 PM.</li>
                      <li>📈 <strong>Weekly Performance</strong>: Comprehensive attendance overview sent every Sunday at 8:00 PM.</li>
                    </ul>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>

          {/* Activity Logs */}
          <Grid item xs={12} lg={8}>
            <Card sx={{ ...panelCardStyle, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 3 }}>
                <Typography variant="h6" fontWeight="bold" sx={{ color: '#1e293b', mb: 2 }}>
                  Email Dispatch Activity Logs
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <TableContainer component={Paper} elevation={0} sx={{ flexGrow: 1, border: '1px solid #f1f5f9', borderRadius: '8px', overflow: 'hidden' }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 'bold', color: '#64748b' }}>Time</TableCell>
                        <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 'bold', color: '#64748b' }}>Alert Type</TableCell>
                        <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 'bold', color: '#64748b' }}>Status</TableCell>
                        <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 'bold', color: '#64748b' }}>Recipient(s)</TableCell>
                        <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 'bold', color: '#64748b' }}>Subject Line</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stats.logs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 6, color: '#94a3b8', fontStyle: 'italic' }}>
                            No email dispatch history recorded in this session.
                          </TableCell>
                        </TableRow>
                      ) : (
                        stats.logs.map((log, index) => (
                          <TableRow key={index} hover>
                            <TableCell sx={{ fontSize: '13px', color: '#334155' }}>
                              {formatDate(log.time)}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={log.type}
                                size="small"
                                sx={{
                                  textTransform: 'uppercase',
                                  fontSize: '10px',
                                  fontWeight: 'bold',
                                  bgcolor: getTypeBgColor(log.type),
                                  color: getTypeTextColor(log.type)
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={log.status === 'Success' ? 'SUCCESS' : 'FAILED'}
                                size="small"
                                color={log.status === 'Success' ? 'success' : 'error'}
                                sx={{ fontSize: '10px', fontWeight: 'bold' }}
                              />
                            </TableCell>
                            <TableCell sx={{ fontSize: '13px', color: '#475569', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <Tooltip title={log.recipients}>
                                <span>{log.recipients}</span>
                              </Tooltip>
                            </TableCell>
                            <TableCell sx={{ fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>
                              {log.subject}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </div>
  );
}

// Inline Icon Helper
function PlayArrowIconWrapper() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="#007bff">
      <path d="M320-203v-554l440 277-440 277Z"/>
    </svg>
  );
}

const getTypeBgColor = (type) => {
  switch (type) {
    case 'daily': return '#dbeafe';
    case 'weekly': return '#f3e8ff';
    case 'test': return '#dcfce7';
    case 'leave': return '#ffedd5';
    case 'shift': return '#fce7f3';
    case 'registration': return '#e0f2fe';
    default: return '#f1f5f9';
  }
};

const getTypeTextColor = (type) => {
  switch (type) {
    case 'daily': return '#1e40af';
    case 'weekly': return '#6b21a8';
    case 'test': return '#166534';
    case 'leave': return '#c2410c';
    case 'shift': return '#9d174d';
    case 'registration': return '#0369a1';
    default: return '#475569';
  }
};

// Styling variables
const containerStyle = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  backgroundColor: "#f8fafc",
  minHeight: "100vh",
  paddingBottom: "40px"
};

const statCardStyle = (borderColor) => ({
  borderRadius: '12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
  borderLeft: `5px solid ${borderColor}`,
  transition: 'transform 0.2s',
  '&:hover': {
    transform: 'translateY(-2px)'
  }
});

const iconWrapperStyle = (bgColor) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '56px',
  height: '56px',
  borderRadius: '12px',
  bgcolor: bgColor
});

const panelCardStyle = {
  borderRadius: '12px',
  boxShadow: '0 4px 15px rgba(0,0,0,0.04)',
  bgcolor: '#ffffff',
  border: '1px solid #f1f5f9'
};

export default EmailAlerts;
