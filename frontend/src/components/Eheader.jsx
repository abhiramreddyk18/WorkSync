import React, { useState } from 'react';
import {
    AppBar, Toolbar, Typography, Box, IconButton,
    Drawer, List, ListItem, ListItemText, useMediaQuery, useTheme
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AIAssistantSidebar from './AIAssistantSidebar';

const navItems = [
    { label: 'My Profile', path: '/employee' },
];

function Eheader() {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/home');
    };

    return (
        <>
            <AppBar position="fixed" sx={{ bgcolor: '#1c1e21', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ color: '#fff', letterSpacing: 1 }}>WorkSync</Typography>
                    {isMobile ? (
                        <IconButton onClick={() => setDrawerOpen(true)} sx={{ color: 'white' }}>
                            <MenuIcon />
                        </IconButton>
                    ) : (
                        <Box sx={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                            {navItems.map(item => (
                                <Typography key={item.path} component={Link} to={item.path}
                                    sx={{ textDecoration: 'none', color: '#f1f1f1', fontSize: '15px', fontWeight: 500, transition: 'color 0.2s', '&:hover': { color: '#ffcc00' } }}>
                                    {item.label}
                                </Typography>
                            ))}
                            <Typography onClick={handleLogout}
                                sx={{ cursor: 'pointer', textDecoration: 'none', color: '#ff4444', fontSize: '15px', fontWeight: 600, transition: 'color 0.2s', '&:hover': { color: '#ff6666' } }}>
                                Logout
                            </Typography>
                        </Box>
                    )}
                </Toolbar>
            </AppBar>

            <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}
                PaperProps={{ sx: { width: 240, bgcolor: '#1c1e21' } }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
                    <IconButton onClick={() => setDrawerOpen(false)} sx={{ color: 'white' }}><CloseIcon /></IconButton>
                </Box>
                <List>
                    {navItems.map(item => (
                        <ListItem key={item.path} component={Link} to={item.path} onClick={() => setDrawerOpen(false)}
                            sx={{ color: '#f1f1f1', textDecoration: 'none', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                            <ListItemText primary={item.label} />
                        </ListItem>
                    ))}
                    <ListItem onClick={() => { setDrawerOpen(false); handleLogout(); }}
                        sx={{ color: '#ff4444', cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                        <ListItemText primary="Logout" />
                    </ListItem>
                </List>
            </Drawer>
            <AIAssistantSidebar />
        </>
    );
}

export default Eheader;
