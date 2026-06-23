import React, { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Container } from "@mui/material";
import Header from "../pages/Header";
import api from "../services/api";

const Dashboard = () => {
  const [workers, setWorkers] = useState([]);

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      const response = await api.get("/attendance/getattend");
      const data = response.data;
      if (Array.isArray(data)) {
        // Filter to only show employees who are currently checked in (active shifts)
        const activeWorkers = data.filter(worker => worker.active === true);
        setWorkers(activeWorkers);
      } else {
        console.error("Expected an array but got:", data);
      }
    } catch (error) {
      console.error("Error fetching workers:", error);
    }
  };

  // Function to format date/time for better readability
  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleString(); // Converts to local date and time format
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 5 }}>
      <Header />
      <Typography variant="h4" align="center" gutterBottom sx={{ marginBottom: "40px" }}>
        Worker Dashboard
      </Typography>
      <TableContainer component={Paper} elevation={3}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#007bff" }}>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>ID</TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>Name</TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>Check-In Time</TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>Hours</TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>Payment</TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>Checked Out</TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>Active</TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>Created At</TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>Updated At</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {workers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 3, color: "#94a3b8" }}>
                  No attendance records found.
                </TableCell>
              </TableRow>
            ) : (
              workers.map((worker, index) => (
                <TableRow key={index} hover>
                  <TableCell>{worker.empId}</TableCell>
                  <TableCell>{worker.name}</TableCell>
                  <TableCell>{formatDate(worker.InTime)}</TableCell>
                  <TableCell>{typeof worker.hours === 'number' ? worker.hours.toFixed(2) : worker.hours}</TableCell>
                  <TableCell>₹{typeof worker.payment === 'number' ? worker.payment.toFixed(2) : worker.payment}</TableCell>
                  <TableCell>{worker.out ? "Yes" : "No"}</TableCell>
                  <TableCell>{worker.active ? "Yes" : "No"}</TableCell>
                  <TableCell>{formatDate(worker.createdAt)}</TableCell>
                  <TableCell>{formatDate(worker.updatedAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default Dashboard;
