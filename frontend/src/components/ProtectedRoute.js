import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CircularProgress, Box } from '@mui/material';

const ProtectedRoute = ({ children, requireAdmin = false, allowedRoles = [] }) => {
    const { user, isAdmin, role, loading } = useAuth();

    if (loading) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <CircularProgress />
        </Box>
    );

    if (requireAdmin && !isAdmin) return <Navigate to="/adminlogin" replace />;
    if (!requireAdmin && !user && !isAdmin) return <Navigate to="/home" replace />;
    if (allowedRoles.length > 0 && !isAdmin && !allowedRoles.includes(role)) return <Navigate to="/unauthorized" replace />;

    return children;
};

export default ProtectedRoute;
