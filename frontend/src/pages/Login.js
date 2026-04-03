import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../App";
import { initSession, trackClick, trackPageView } from "../components/SDKMock";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { trackPageView("login"); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    trackClick("btn_login", "Login Submit", { username: form.email });

    try {
      // Fetch from your MongoDB backend!
      const response = await fetch("http://localhost:4000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const data = await response.json();

      if (data.success) {
        // Init telemetry session
        initSession({ tenant_id: data.user.tenant_id, user_id: data.user.user_id });
        
        // Log them into the React context
        login(data.user, data.token);
        
        // RBAC Routing: Admins go to Command Center, Customers go to Loan Dashboard
        if (data.user.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/dashboard");
        }
      } else {
        setError(data.message || "Invalid credentials.");
        trackClick("login_failed", "Login Failed");
      }
    } catch (err) {
      setError("Server error. Is the backend running?");
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-10 shadow-2xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">N</div>
          <div>
            <div className="text-white font-semibold text-lg leading-none">NexLend</div>
            <div className="text-gray-500 text-xs">Smart Lending Platform</div>
          </div>
        </div>

        <h1 className="text-white text-2xl font-bold mb-1">Welcome back</h1>
        <p className="text-gray-400 text-sm mb-6">Sign in to your account</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-medium">Email Address</label>
            <input type="email" placeholder="you@company.com" required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-blue-500 transition"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} 
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1 font-medium">Password</label>
            <input type="password" placeholder="••••••••" required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-blue-500 transition"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} 
            />
          </div>

          {error && <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-3 text-red-400 text-xs">⚠️ {error}</div>}

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-medium py-3 rounded-lg text-sm transition flex items-center justify-center gap-2">
            {loading ? "Signing In..." : "Sign In →"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Don't have an account? <Link to="/register" className="text-blue-400 hover:text-blue-300">Register here</Link>
        </div>
      </div>
    </div>
  );
}