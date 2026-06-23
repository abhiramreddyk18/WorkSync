import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null); // 'worker'|'hr'|'manager'
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const restoreSession = async () => {
            try {
                const res = await api.get('/authemp/userdetails');
                if (res.data && res.data._id) {
                    if (res.data.role === 'admin') {
                        setIsAdmin(true);
                        setUser(null);
                        setRole(null);
                    } else {
                        setUser(res.data);
                        setRole(res.data.role || 'worker');
                        setIsAdmin(false);
                    }
                }
            } catch (e) {
                // Not logged in as employee, check admin cookie presence
                const adminFlag = localStorage.getItem('isAdmin');
                if (adminFlag === 'true') setIsAdmin(true);
            } finally {
                setLoading(false);
            }
        };
        restoreSession();
    }, []);

    const loginEmployee = (userData) => {
        setUser(userData);
        setRole(userData.role || 'worker');
        setIsAdmin(false);
        localStorage.removeItem('isAdmin');
    };

    const loginAdmin = () => {
        setIsAdmin(true);
        setUser(null);
        setRole(null);
        localStorage.setItem('isAdmin', 'true');
    };

    const logout = async () => {
        try {
            if (isAdmin) {
                await api.post('/admin/logout');
            } else {
                await api.post('/authemp/logout');
            }
        } catch (e) {
            console.error("Logout failed on server:", e);
        } finally {
            setUser(null);
            setRole(null);
            setIsAdmin(false);
            localStorage.removeItem('isAdmin');
        }
    };

    return (
        <AuthContext.Provider value={{ user, role, isAdmin, loading, loginEmployee, loginAdmin, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
