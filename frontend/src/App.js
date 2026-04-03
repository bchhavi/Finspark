import React, { createContext, useContext, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Import all your pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import LoanForm from "./pages/LoanForm";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard"; // Make sure to import this!

export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // Keep user logged in even if they refresh the page
  useEffect(() => {
    const savedUser = localStorage.getItem("nexlend_user");
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem("nexlend_user", JSON.stringify(userData));
  };
  
  const logout = () => {
    setUser(null);
    localStorage.removeItem("nexlend_user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// --------------------------------------------------------
// SECURITY WRAPPER 1: Keeps logged-in users AWAY from Login
// --------------------------------------------------------
function PublicRoute({ children }) {
  const { user } = useAuth();
  
  // If already logged in, redirect them to their correct dashboard
  if (user) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  
  // If NOT logged in, let them see the Login/Register page
  return children;
}

// --------------------------------------------------------
// SECURITY WRAPPER 2: Enforces Role-Based Access Control
// --------------------------------------------------------
function ProtectedRoute({ children, requiredRole }) {
  const { user } = useAuth();

  // If NOT logged in, kick them to the login page
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // If logged in, but they have the WRONG role, kick them back to their own dashboard
  if (requiredRole && user.role !== requiredRole) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// --------------------------------------------------------
// MAIN APP ROUTER
// --------------------------------------------------------
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          
          {/* Public Routes (Only visible if NOT logged in) */}
          <Route path="/" element={
            <PublicRoute><Login /></PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute><Register /></PublicRoute>
          } />
          
          {/* Customer Routes (Protected) */}
          <Route path="/apply" element={
            <ProtectedRoute requiredRole="customer"><LoanForm /></ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute requiredRole="customer"><Dashboard /></ProtectedRoute>
          } />
          
          {/* Admin Route (Protected) */}
          <Route path="/admin" element={
            <ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>
          } />

          {/* Catch-all route for unknown URLs */}
          <Route path="*" element={<Navigate to="/" replace />} />
          
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}