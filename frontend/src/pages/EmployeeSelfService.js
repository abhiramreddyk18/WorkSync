import React, { useEffect, useState } from "react";
import api from "../services/api";
import Eheader from "../components/Eheader";
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress,
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, MenuItem, FormControl, InputLabel, Chip
} from "@mui/material";
import { useAuth } from "../context/AuthContext";

const EmployeeSelfService = () => {
  const { user, loading: authLoading } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  // Leave Form State
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    startDate: '',
    endDate: '',
    type: 'casual',
    reason: ''
  });
  const [leaveMsg, setLeaveMsg] = useState('');

  const fetchAttendanceHistory = async () => {
    try {
      const res = await api.get('/authemp/attenddetails');
      setAttendance(res.data);
    } catch (err) {
      console.error("Error fetching attendance:", err);
    }
  };

  const fetchLeaves = async () => {
    if (!user) return;
    try {
      const res = await api.get(`/leaves/employee/${user.empId}`);
      setLeaves(res.data);
    } catch (err) {
      console.error("Error fetching leaves:", err);
    }
  };

  const handleStartBreak = async () => {
    if (!user) return;
    try {
      await api.post('/attendance/break/start', { empId: user.empId });
      await fetchAttendanceHistory();
    } catch (err) {
      console.error("Error starting break:", err);
      alert(err.response?.data?.message || "Failed to start break");
    }
  };

  const handleEndBreak = async () => {
    if (!user) return;
    try {
      await api.post('/attendance/break/end', { empId: user.empId });
      await fetchAttendanceHistory();
    } catch (err) {
      console.error("Error ending break:", err);
      alert(err.response?.data?.message || "Failed to end break");
    }
  };

  useEffect(() => {
    if (authLoading) return; // wait until auth context resolves

    const initData = async () => {
      try {
        await Promise.all([
          fetchAttendanceHistory(),
          fetchLeaves()
        ]);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [authLoading, user]);

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/leaves/apply', leaveForm);
      setLeaveMsg('Leave applied successfully!');
      setLeaveModalOpen(false);
      setLeaveForm({ startDate: '', endDate: '', type: 'casual', reason: '' });
      fetchLeaves();
      setTimeout(() => setLeaveMsg(''), 3000);
    } catch (error) {
      setLeaveMsg(error.response?.data?.message || 'Failed to apply leave');
      setTimeout(() => setLeaveMsg(''), 3000);
    }
  };

  // Show spinner while auth context or data is loading
  if (authLoading || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const activeSession = Array.isArray(attendance) ? attendance.find(record => !record.out) : null;

  return (
    <div style={containerStyle}>
      <Eheader />
      <h2 style={titleStyle}>Employee Self-Service Portal</h2>

      {user ? (
        <>
          {/* Employee Details */}
          <div style={cardStyle}>
            <h3 style={subtitleStyle}>Welcome, {user.name}</h3>
            <div style={infoGridStyle}>
              <p><strong>Employee ID:</strong> {user.empId}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Role:</strong> {user.role}</p>
              <p><strong>Shift:</strong> {user.shift || 'Unassigned'}</p>
              <p><strong>Hourly Rate:</strong> ₹{user.hourlyRate}</p>
              <p><strong>Total Work Hours:</strong> {user.totalWorkHours?.toFixed(1) ?? '-'}</p>
              <p><strong>Total Leaves:</strong> {user.totalLeaves}</p>
              <p><strong>Overtime Hours:</strong> {user.overtimeHours}</p>
              <p><strong>Active:</strong> {user.isActive ? "Yes" : "No"}</p>
            </div>
          </div>

          {/* Active Session & Break Control */}
          {activeSession && (
            <div style={pageCardStyle}>
              <h3 style={subtitleStyle}>Current Shift Status</h3>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mt: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body1">
                    <strong>Check-in Time:</strong> {new Date(activeSession.InTime).toLocaleTimeString()}
                  </Typography>
                  <Chip
                    label={activeSession.isOnBreak ? "On Break" : "Working"}
                    color={activeSession.isOnBreak ? "warning" : "success"}
                    sx={{ fontWeight: "bold" }}
                  />
                </Box>
                {activeSession.isOnBreak && activeSession.breakStart && (
                  <Typography variant="body2" color="text.secondary">
                    Break started at: {new Date(activeSession.breakStart).toLocaleTimeString()}
                  </Typography>
                )}
                {activeSession.breakDurationMins > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Total Break Duration (this shift): {activeSession.breakDurationMins} mins
                  </Typography>
                )}
                <Box sx={{ mt: 1 }}>
                  {activeSession.isOnBreak ? (
                    <Button
                      variant="contained"
                      color="warning"
                      size="large"
                      onClick={handleEndBreak}
                      sx={{ minWidth: 150, fontWeight: "bold" }}
                    >
                      End Break
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      color="primary"
                      size="large"
                      onClick={handleStartBreak}
                      sx={{ minWidth: 150, fontWeight: "bold" }}
                    >
                      Start Break
                    </Button>
                  )}
                </Box>
              </Box>
            </div>
          )}

          {/* Attendance Table */}
          <div style={pageCardStyle}>
            <h3 style={cardTitleStyle}>Attendance History</h3>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Date</strong></TableCell>
                    <TableCell><strong>In Time</strong></TableCell>
                    <TableCell><strong>Out Time</strong></TableCell>
                    <TableCell><strong>Hours Worked</strong></TableCell>
                    <TableCell><strong>Break Duration (mins)</strong></TableCell>
                    <TableCell><strong>Overtime Hours</strong></TableCell>
                    <TableCell><strong>Payment</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attendance.length > 0 ? (
                    attendance.map((record) => (
                      <TableRow key={record._id}>
                        <TableCell>{new Date(record.InTime).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(record.InTime).toLocaleTimeString()}</TableCell>
                        <TableCell>{record.OutTime ? new Date(record.OutTime).toLocaleTimeString() : "Still Working"}</TableCell>
                        <TableCell>{record.hours?.toFixed(2)}</TableCell>
                        <TableCell>{record.breakDurationMins || 0}</TableCell>
                        <TableCell>{record.overtimeHours ? record.overtimeHours.toFixed(2) : "0.00"}</TableCell>
                        <TableCell>₹{record.payment?.toFixed(2)}</TableCell>
                        <TableCell>
                          <Chip 
                            label={record.workStatus || (record.out ? "Checked Out" : "Active")}
                            size="small" 
                            color={
                              record.workStatus === 'Full Day' ? 'success' : 
                              record.workStatus === 'Half Day' ? 'info' : 
                              record.workStatus === 'Short Hours' ? 'warning' : 'primary'
                            } 
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} style={{ textAlign: "center" }}>No attendance records found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </div>

          {/* Leaves Management */}
          <div style={pageCardStyle}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <h3 style={{ ...cardTitleStyle, margin: 0 }}>Leaves History</h3>
              <Button variant="contained" color="primary" onClick={() => setLeaveModalOpen(true)}>
                Apply for Leave
              </Button>
            </Box>
            {leaveMsg && <Typography color="success.main" mb={2} sx={{ fontWeight: 'bold' }}>{leaveMsg}</Typography>}

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Start Date</strong></TableCell>
                    <TableCell><strong>End Date</strong></TableCell>
                    <TableCell><strong>Type</strong></TableCell>
                    <TableCell><strong>Reason</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Requested On</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leaves.length > 0 ? (
                    leaves.map((leave) => (
                      <TableRow key={leave._id}>
                        <TableCell>{new Date(leave.startDate).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(leave.endDate).toLocaleDateString()}</TableCell>
                        <TableCell style={{ textTransform: 'capitalize' }}>{leave.type}</TableCell>
                        <TableCell>{leave.reason}</TableCell>
                        <TableCell>
                          <Chip 
                            label={leave.status} 
                            size="small" 
                            color={leave.status === 'approved' ? 'success' : leave.status === 'rejected' ? 'error' : 'warning'} 
                          />
                        </TableCell>
                        <TableCell>{new Date(leave.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} style={{ textAlign: "center" }}>No leave requests found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </div>

          {/* Leave Application Dialog */}
          <Dialog open={leaveModalOpen} onClose={() => setLeaveModalOpen(false)} fullWidth maxWidth="sm">
            <form onSubmit={handleLeaveSubmit}>
              <DialogTitle>Apply for Leave</DialogTitle>
              <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
                  <TextField
                    label="Start Date"
                    type="date"
                    required
                    InputLabelProps={{ shrink: true }}
                    value={leaveForm.startDate}
                    onChange={e => setLeaveForm(p => ({ ...p, startDate: e.target.value }))}
                  />
                  <TextField
                    label="End Date"
                    type="date"
                    required
                    InputLabelProps={{ shrink: true }}
                    value={leaveForm.endDate}
                    onChange={e => setLeaveForm(p => ({ ...p, endDate: e.target.value }))}
                  />
                  <FormControl fullWidth>
                    <InputLabel>Leave Type</InputLabel>
                    <Select
                      label="Leave Type"
                      value={leaveForm.type}
                      onChange={e => setLeaveForm(p => ({ ...p, type: e.target.value }))}
                    >
                      <MenuItem value="casual">Casual Leave</MenuItem>
                      <MenuItem value="sick">Sick Leave</MenuItem>
                      <MenuItem value="earned">Earned Leave</MenuItem>
                      <MenuItem value="unpaid">Unpaid Leave</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label="Reason"
                    multiline
                    rows={3}
                    required
                    value={leaveForm.reason}
                    onChange={e => setLeaveForm(p => ({ ...p, reason: e.target.value }))}
                  />
                </Box>
              </DialogContent>
              <DialogActions sx={{ p: 2 }}>
                <Button onClick={() => setLeaveModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="contained" color="primary">Submit Request</Button>
              </DialogActions>
            </form>
          </Dialog>
        </>
      ) : (
        <Typography sx={{ textAlign: 'center', fontSize: '18px', color: '#666', mt: 4 }}>
          Employee not found. Please log in.
        </Typography>
      )}
    </div>
  );
};

// Layout & Styling
const containerStyle = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  backgroundColor: "#ECEFF1",
  padding: "20px",
  minHeight: "100vh",
  marginTop: "100px",
};

const cardStyle = {
  width: "90%",
  maxWidth: "1000px",
  backgroundColor: "#FFFFFF",
  padding: "20px",
  borderRadius: "12px",
  boxShadow: "0px 5px 15px rgba(0, 0, 0, 0.2)",
  textAlign: "center",
  marginBottom: "30px",
};

const pageCardStyle = {
  width: "90%",
  maxWidth: "1200px",
  backgroundColor: "#FFFFFF",
  padding: "25px",
  borderRadius: "12px",
  boxShadow: "0px 5px 20px rgba(0, 0, 0, 0.2)",
  textAlign: "center",
  marginBottom: "40px",
};

const titleStyle = {
  fontSize: "26px",
  fontWeight: "bold",
  color: "#263238",
  marginBottom: "20px",
};

const subtitleStyle = {
  fontSize: "22px",
  color: "#4DB6AC",
  marginBottom: "15px",
};

const cardTitleStyle = {
  fontSize: "20px",
  color: "#37474F",
  marginBottom: "15px",
};

const infoGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
  textAlign: "left",
  fontSize: "16px",
  color: "#444",
  padding: "12px",
  backgroundColor: "#f9f9f9",
  borderRadius: "10px",
  boxShadow: "0px 2px 6px rgba(0, 0, 0, 0.1)",
};

export default EmployeeSelfService;
