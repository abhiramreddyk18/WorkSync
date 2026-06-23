import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import rbg from "../assets/registerbg.jpg";
import api from "../services/api";

const Register = () => {
  const Navigate=useNavigate()
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleRegister = async(e) => {
    e.preventDefault();
    setErrMsg("");
    setSuccessMsg("");
    try {
      const result=await api.post('/authemp/register', { name, email, password });
      console.log(result.data);
      setSuccessMsg("Registration successful! Redirecting to login...");

      setTimeout(()=>{
        Navigate("/login")
      },2000)
    } catch (error) {
      console.log("error in registration", error);
      setErrMsg(error.response?.data?.message || "Registration failed. Please try again.");
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
      }}
    >
      <div
        style={{
          background: "rgba(255, 255, 255, 0.9)",
          padding: "30px",
          borderRadius: "8px",
          boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)",
          width: "380px",
          textAlign: "center",
        }}
      >
        <h2 style={{ marginBottom: "20px", fontSize: "24px", color: "#333" }}>
          Register
        </h2>
        <form onSubmit={handleRegister}>
          <input
            type="text"
            placeholder="Enter Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "12px",
              margin: "10px 0",
              border: "1px solid #ccc",
              borderRadius: "5px",
              fontSize: "16px",
            }}
          />
          <input
            type="email"
            placeholder="Enter Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "12px",
              margin: "10px 0",
              border: "1px solid #ccc",
              borderRadius: "5px",
              fontSize: "16px",
            }}
          />
          <input
            type="password"
            placeholder="Enter Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "12px",
              margin: "10px 0",
              border: "1px solid #ccc",
              borderRadius: "5px",
              fontSize: "16px",
            }}
          />
          {errMsg && (
            <div style={{ color: "#ff4444", fontWeight: "bold", margin: "10px 0", fontSize: "14px" }}>
              {errMsg}
            </div>
          )}
          {successMsg && (
            <div style={{ color: "#28a745", fontWeight: "bold", margin: "10px 0", fontSize: "14px" }}>
              {successMsg}
            </div>
          )}
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "12px",
              background: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "5px",
              fontSize: "18px",
              cursor: "pointer",
              transition: "0.3s",
            }}
            onMouseOver={(e) => (e.target.style.background = "#0056b3")}
            onMouseOut={(e) => (e.target.style.background = "#007bff")}
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;
