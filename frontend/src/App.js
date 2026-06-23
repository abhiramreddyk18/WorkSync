
import './App.css';
import Dashboard from './components/Dashboard';
import Login from './pages/Login';
import { Routes, Route, Navigate } from "react-router-dom";

import EmployeeSelfService from './pages/EmployeeSelfService';
import Register from './pages/Register';
import AttendanceTracking from './pages/AttendanceTracking';
import Admin from './pages/Admin';
import Charts from './pages/charts';
import Home from './pages/Home';
import Alogin from './pages/Alogin';
import Employeestable from './pages/Employeestable';
import ShiftManagement from './pages/ShiftManagement';
import LeaveApproval from './pages/LeaveApproval';
import Unauthorized from './pages/Unauthorized';
import EmailAlerts from './pages/EmailAlerts';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/home" />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/adminlogin" element={<Alogin />} />
        <Route path="/employeelogin" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Protected: admin-only routes */}
        <Route path="/admin" element={<ProtectedRoute requireAdmin={true}><Admin /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute requireAdmin={true}><Dashboard /></ProtectedRoute>} />
        <Route path="/charts" element={<ProtectedRoute requireAdmin={true}><Charts /></ProtectedRoute>} />
        <Route path="/attendanceTracking" element={<ProtectedRoute requireAdmin={true}><AttendanceTracking /></ProtectedRoute>} />
        <Route path="/attendancetracking" element={<ProtectedRoute requireAdmin={true}><AttendanceTracking /></ProtectedRoute>} />
        <Route path="/attendenceTracking" element={<ProtectedRoute requireAdmin={true}><AttendanceTracking /></ProtectedRoute>} />
        <Route path="/attendencetracking" element={<ProtectedRoute requireAdmin={true}><AttendanceTracking /></ProtectedRoute>} />
        <Route path="/employeestable" element={<ProtectedRoute requireAdmin={true}><Employeestable /></ProtectedRoute>} />
        <Route path="/shifts" element={<ProtectedRoute requireAdmin={true}><ShiftManagement /></ProtectedRoute>} />
        <Route path="/leaves" element={<ProtectedRoute requireAdmin={true}><LeaveApproval /></ProtectedRoute>} />
        <Route path="/email-alerts" element={<ProtectedRoute requireAdmin={true}><EmailAlerts /></ProtectedRoute>} />

        {/* Protected: employee routes */}
        <Route path="/employself" element={<ProtectedRoute><EmployeeSelfService /></ProtectedRoute>} />
        <Route path="/employee" element={<ProtectedRoute><EmployeeSelfService /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
