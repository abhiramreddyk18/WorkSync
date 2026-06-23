import React, { useState } from "react";
import { TextField, Button, Container, Box, Typography, Paper } from "@mui/material";
import api from "../services/api";
const SendOut = ({ page, setPage }) => {
  const [userId, setUserId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = async(e) => {
    e.preventDefault();
    setMessage("");
    setError(false);
    
    try {
      const result = await api.post('/attendance/outgoing', { empId: userId });
      setMessage(result.data.message || "Exit recorded successfully!");
      setUserId("");
    } catch (err) {
      setMessage(err.response?.data?.message || "Check-out failed. Please check User ID.");
      setError(true);
    }
  };

  return (
    <Container maxWidth="xs"  sx={{height:"90vh",width:'100dvw',display:'flex',justifyContent:'center',alignItems:'center'}} >
      <Paper elevation={3} sx={{ padding: 3, mt: 8, textAlign: "center", borderRadius: 2 }}>
        <Typography variant="h5" gutterBottom>
          SendOut (Check Out)
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="User ID"
            variant="outlined"
            fullWidth
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
          />
          {message && (
            <Typography color={error ? "error" : "success.main"} fontWeight="bold">
              {message}
            </Typography>
          )}
          <Button type="submit" variant="contained" color="primary" fullWidth>
            Submit Exit
          </Button>
          <Button variant="outlined" color="secondary" fullWidth onClick={() => setPage("scanner")}>
            Go to Scanner
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default SendOut;
