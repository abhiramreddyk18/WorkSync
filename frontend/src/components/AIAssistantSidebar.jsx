import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Drawer, Fab, TextField, IconButton, Typography,
    CircularProgress, Chip, Paper, Zoom, Tooltip
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const formatMessage = (text) => {
    if (!text) return "";
    
    // Parse Markdown tables if present
    if (text.includes('|') && text.includes('\n')) {
        const lines = text.split('\n');
        let inTable = false;
        let tableHTML = [];
        let output = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('|') && line.endsWith('|')) {
                if (!inTable) {
                    inTable = true;
                    tableHTML.push('<div class="ai-table-container"><table class="ai-table">');
                }
                
                const cells = line.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
                
                // Skip separator rows e.g. |---|---|
                if (cells.every(c => c.match(/^:-*-?:*$/) || c.match(/^-+$/))) {
                    continue;
                }

                const isHeader = tableHTML.length === 1; // first row after table tag
                tableHTML.push('<tr>');
                cells.forEach(cell => {
                    const formattedCell = cell.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    if (isHeader) {
                        tableHTML.push(`<th>${formattedCell}</th>`);
                    } else {
                        tableHTML.push(`<td>${formattedCell}</td>`);
                    }
                });
                tableHTML.push('</tr>');
            } else {
                if (inTable) {
                    inTable = false;
                    tableHTML.push('</table></div>');
                    output.push(tableHTML.join(''));
                    tableHTML = [];
                }
                // Format lines and bold tags
                const formattedLine = line
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/^- (.*)$/g, '<li>$1</li>');
                output.push(formattedLine);
            }
        }
        if (inTable) {
            tableHTML.push('</table></div>');
            output.push(tableHTML.join(''));
        }
        return output.join('<br />');
    }

    // Standard markdown styling (bolding, lists, breaks)
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/^- (.*)$/mg, '<li>$1</li>')
        .replace(/\n/g, '<br />');
};

function AIAssistantSidebar() {
    const { user, role, isAdmin } = useAuth();
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: "Hello! I am **WorkSync AI**, your virtual co-pilot. How can I help you manage shifts, track attendance, or draft leave requests today?"
        }
    ]);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const activeRole = isAdmin ? 'admin' : (role || 'worker');

    // Quick action templates depending on role
    const quickActions = activeRole === 'admin' || activeRole === 'hr' || activeRole === 'manager'
        ? [
            "Who is absent today?",
            "Check leave conflicts for today",
            "List active employees",
            "Summarize weekly payroll metrics"
        ]
        : [
            "Summarize my attendance",
            "Draft a sick leave request for tomorrow",
            "What shifts do I have?",
            "How many leaves do I have left?"
        ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    const handleSend = async (textToSend) => {
        const query = textToSend || message;
        if (!query.trim()) return;

        if (!textToSend) setMessage('');
        
        const userMsg = { role: 'user', content: query };
        const updatedHistory = [...messages, userMsg];
        setMessages(updatedHistory);
        setLoading(true);

        try {
            // Send search query along with history
            const res = await api.post('/ai/query', {
                message: query,
                history: messages
            });

            if (res.data && res.data.response) {
                setMessages([...updatedHistory, { role: 'assistant', content: res.data.response }]);
            } else {
                setMessages([...updatedHistory, { role: 'assistant', content: "Received an empty response from the AI gateway. Please try again." }]);
            }
        } catch (error) {
            console.error("AI chatbot error:", error);
            setMessages([...updatedHistory, { role: 'assistant', content: "⚠️ **Connection Error**\n\nCould not query the AI gateway. Make sure your server and database are running." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Embedded styles for markdown rendering */}
            <style>{`
                .ai-table-container {
                    overflow-x: auto;
                    margin: 10px 0;
                    border-radius: 8px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                .ai-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 13px;
                    text-align: left;
                }
                .ai-table th {
                    background-color: rgba(255, 204, 0, 0.15);
                    color: #ffcc00;
                    padding: 8px 10px;
                    font-weight: bold;
                    border-bottom: 2px solid rgba(255, 255, 255, 0.1);
                }
                .ai-table td {
                    padding: 8px 10px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    color: #e1e1e1;
                }
                .ai-table tr:nth-of-type(even) {
                    background-color: rgba(255, 255, 255, 0.02);
                }
                .ai-message-bubble li {
                    margin-left: 15px;
                    margin-top: 4px;
                }
            `}</style>

            {/* Floating Action Button */}
            <Tooltip title="WorkSync AI Copilot" placement="left">
                <Fab
                    onClick={() => setOpen(true)}
                    sx={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        bgcolor: '#ffcc00',
                        color: '#1c1e21',
                        boxShadow: '0 4px 15px rgba(255, 204, 0, 0.4)',
                        zIndex: 1000,
                        '&:hover': { bgcolor: '#e6b800' }
                    }}
                >
                    <AutoAwesomeIcon />
                </Fab>
            </Tooltip>

            {/* AI Assistant Drawer */}
            <Drawer
                anchor="right"
                open={open}
                onClose={() => setOpen(false)}
                PaperProps={{
                    sx: {
                        width: { xs: '100%', sm: 380 },
                        bgcolor: '#1c1e21',
                        borderLeft: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        color: 'white',
                        boxShadow: '-4px 0 25px rgba(0,0,0,0.5)'
                    }
                }}
            >
                {/* Header */}
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    background: 'linear-gradient(135deg, #1c1e21 0%, #2a2e33 100%)'
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SmartToyIcon sx={{ color: '#ffcc00' }} />
                        <Typography variant="h6" fontWeight="bold">WorkSync AI</Typography>
                    </Box>
                    <IconButton onClick={() => setOpen(false)} sx={{ color: 'white' }}>
                        <CloseIcon />
                    </IconButton>
                </Box>

                {/* Messages Container */}
                <Box sx={{
                    flex: 1,
                    overflowY: 'auto',
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    '&::-webkit-scrollbar': { width: '6px' },
                    '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '4px' }
                }}>
                    {messages.map((msg, index) => {
                        const isAI = msg.role === 'assistant';
                        const text = msg.content || '';
                        
                        return (
                            <Box
                                key={index}
                                sx={{
                                    display: 'flex',
                                    justifyContent: isAI ? 'flex-start' : 'flex-end',
                                    width: '100%'
                                }}
                            >
                                <Box sx={{
                                    display: 'flex',
                                    gap: 1,
                                    maxWidth: '85%',
                                    flexDirection: isAI ? 'row' : 'row-reverse'
                                }}>
                                    {isAI && (
                                        <Box sx={{
                                            bgcolor: 'rgba(255, 204, 0, 0.1)',
                                            borderRadius: '50%',
                                            width: 32,
                                            height: 32,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            mt: 0.5
                                        }}>
                                            <SmartToyIcon sx={{ color: '#ffcc00', fontSize: 18 }} />
                                        </Box>
                                    )}
                                    <Paper
                                        elevation={0}
                                        className="ai-message-bubble"
                                        sx={{
                                            p: 1.5,
                                            borderRadius: 2,
                                            bgcolor: isAI ? 'rgba(255,255,255,0.05)' : '#ffcc00',
                                            color: isAI ? '#f1f1f1' : '#1c1e21',
                                            border: isAI ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                            fontSize: '14px',
                                            lineHeight: 1.5,
                                            wordBreak: 'break-word'
                                        }}
                                        dangerouslySetInnerHTML={{ __html: formatMessage(text) }}
                                    />
                                </Box>
                            </Box>
                        );
                    })}

                    {loading && (
                        <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 1 }}>
                            <Box sx={{
                                bgcolor: 'rgba(255, 204, 0, 0.1)',
                                borderRadius: '50%',
                                width: 32,
                                height: 32,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <SmartToyIcon sx={{ color: '#ffcc00', fontSize: 18 }} />
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'rgba(255,255,255,0.03)', p: 1.5, borderRadius: 2, border: '1px solid rgba(255,255,255,0.05)' }}>
                                <CircularProgress size={16} sx={{ color: '#ffcc00' }} />
                                <Typography variant="caption" sx={{ color: '#aaa', ml: 1 }}>AI is thinking...</Typography>
                            </Box>
                        </Box>
                    )}
                    <div ref={messagesEndRef} />
                </Box>

                {/* Quick Actions Panel */}
                <Box sx={{
                    px: 2,
                    pb: 1.5,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1,
                    borderTop: '1px solid rgba(255,255,255,0.04)',
                    pt: 1.5
                }}>
                    {quickActions.map((action, i) => (
                        <Chip
                            key={i}
                            label={action}
                            onClick={() => handleSend(action)}
                            disabled={loading}
                            sx={{
                                bgcolor: 'rgba(255,255,255,0.03)',
                                color: '#e1e1e1',
                                border: '1px solid rgba(255,255,255,0.08)',
                                height: 'auto',
                                '& .MuiChip-label': {
                                    py: 0.75,
                                    px: 1,
                                    whiteSpace: 'normal',
                                    fontSize: '12px'
                                },
                                '&:hover': {
                                    bgcolor: 'rgba(255, 204, 0, 0.1)',
                                    color: '#ffcc00',
                                    borderColor: 'rgba(255, 204, 0, 0.3)'
                                }
                            }}
                        />
                    ))}
                </Box>

                {/* Input Area */}
                <Box sx={{
                    p: 2,
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    bgcolor: 'rgba(0,0,0,0.1)'
                }}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Ask anything..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleSend();
                            }
                        }}
                        disabled={loading}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                color: 'white',
                                bgcolor: 'rgba(255,255,255,0.03)',
                                '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
                                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                                '&.Mui-focused fieldset': { borderColor: '#ffcc00' }
                            }
                        }}
                    />
                    <IconButton
                        color="primary"
                        onClick={() => handleSend()}
                        disabled={loading || !message.trim()}
                        sx={{
                            color: '#ffcc00',
                            bgcolor: 'rgba(255,204,0,0.1)',
                            '&:hover': { bgcolor: 'rgba(255,204,0,0.2)' },
                            '&.Mui-disabled': { color: 'rgba(255,255,255,0.1)', bgcolor: 'transparent' }
                        }}
                    >
                        <SendIcon fontSize="small" />
                    </IconButton>
                </Box>
            </Drawer>
        </>
    );
}

export default AIAssistantSidebar;
