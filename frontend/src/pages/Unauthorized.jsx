import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const Unauthorized = () => {
    const navigate = useNavigate();
    return (
        <Box sx={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', bgcolor:'#0f172a', color:'white', gap:2 }}>
            <Typography sx={{ fontSize: 80, lineHeight: 1 }}>🔒</Typography>
            <Typography variant="h3" fontWeight="bold">403</Typography>
            <Typography variant="h6" color="#94a3b8">You don't have permission to access this page.</Typography>
            <Button variant="contained" onClick={() => navigate(-1)} sx={{ mt: 2, bgcolor: '#3b82f6' }}>Go Back</Button>
        </Box>
    );
};
export default Unauthorized;
