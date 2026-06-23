import React, { useState } from "react";
import rbg from "../assets/registerbg.jpg";
import api from "../services/api";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const Navigate=useNavigate()
  const { loginEmployee } = useAuth();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async(e) => {
    e.preventDefault();
    setErrMsg("");
    setSuccessMsg("");
    console.log("User ID:", userId, "Password:", password);
    try {
      const result=await api.post('/authemp/login', { empId: userId, password });
      console.log(result.data);
      
      // Fetch user details immediately to populate the AuthContext state
      const userRes = await api.get('/authemp/userdetails');
      loginEmployee(userRes.data);

      setSuccessMsg("Logged in successfully! Redirecting...");

      setTimeout(()=>{
        Navigate("/employee")
      },2000)
    } catch (error) {
      console.log("error in employee login", error);
      setErrMsg(error.response?.data?.message || "Invalid credentials. Please try again.");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        width: "100vw",
        backgroundImage: `url(${rbg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundBlendMode: "darken",
        backgroundColor: "rgba(10, 10, 10, 0.85)",
        flexDirection:"column"
      }}
    >
      <div
        style={{
          background: "rgba(20, 20, 20, 0.9)", // Dark card with transparency
          padding: "30px",
          borderRadius: "12px",
          boxShadow: "0 5px 15px rgba(0, 0, 0, 0.6)",
          width: "350px",
          textAlign: "center",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          backdropFilter: "blur(8px)", // Smooth blur effect
        }}
      >
        <h2
          style={{
            marginBottom: "20px",
            fontSize: "24px",
            color: "#f0f0f0", // Light gray text
          }}
        >
          Login
        </h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Enter User ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Enter Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
          {errMsg && (
            <div style={{ color: "#ff4444", fontWeight: "bold", margin: "10px 0", fontSize: "14px" }}>
              {errMsg}
            </div>
          )}
          {successMsg && (
            <div style={{ color: "#00ff66", fontWeight: "bold", margin: "10px 0", fontSize: "14px" }}>
              {successMsg}
            </div>
          )}
          <button
            type="submit"
            style={buttonStyle}
            onMouseOver={(e) => (e.target.style.background = "#ffbb00")}
            onMouseOut={(e) => (e.target.style.background = "#ff9900")}
          >
            Submit
          </button>
          
        </form>
      
      </div>
      <Link style={{ padding: "15px 30px", backgroundColor: "#007bff", color: "white", textDecoration: "none", borderRadius: "5px", fontWeight: "bold",marginTop:"40px" }} to="/register">
  SignUp
</Link>

    </div>
  );
};

// **Styles**
const inputStyle = {
  width: "100%",
  padding: "12px",
  margin: "10px 0",
  border: "1px solid rgba(255, 255, 255, 0.3)",
  borderRadius: "5px",
  fontSize: "16px",
  background: "rgba(255, 255, 255, 0.1)", // Dark translucent input
  color: "#f0f0f0",
  outline: "none",
  transition: "0.3s",
};

const buttonStyle = {
  width: "100%",
  padding: "12px",
  background: "#ff9900", // Neon orange
  color: "white",
  border: "none",
  borderRadius: "5px",
  fontSize: "18px",
  cursor: "pointer",
  transition: "0.3s",
};

export default Login;
