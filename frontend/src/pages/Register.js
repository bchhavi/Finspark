import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../App"; // <-- Added for Auto-Login
import { initSession } from "../components/SDKMock"; // <-- Added for Telemetry

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth(); // <-- Added to log the user in immediately
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "customer" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:4000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const data = await response.json();

      if (data.success) {
        // --------------------------------------------------
        // THE AUTO-LOGIN MAGIC HAPPENS HERE
        // --------------------------------------------------
        // 1. Start Telemetry Session
        initSession({ tenant_id: data.user.tenant_id, user_id: data.user.user_id });
        
        // 2. Log them into React context instantly
        login(data.user, data.token);
        
        // 3. Send them directly to their correct dashboard
        if (data.user.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/dashboard");
        }
      } else {
        setError(data.message || "Registration failed. Try again.");
      }
    } catch (err) {
      setError("Server error. Is the backend running?");
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-10 shadow-2xl">
        
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">N</div>
          <div>
            <div className="text-white font-semibold text-lg leading-none">NexLend</div>
            <div className="text-gray-500 text-xs">Create your account</div>
          </div>
        </div>

        <h1 className="text-white text-2xl font-bold mb-1">Join NexLend</h1>
        <p className="text-gray-400 text-sm mb-6">Sign up to apply for loans</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-medium">Full Name</label>
            <input type="text" placeholder="John Doe" required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-blue-500 transition"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} 
            />
          </div>

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

          {/* HACKATHON TRICK: Let you pick the role for demo purposes */}
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-medium">Account Role (Demo Only)</label>
            <select 
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-blue-500 transition"
              value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="customer">Regular Customer</option>
              <option value="admin">Bank Admin</option>
            </select>
          </div>

          {error && <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-3 text-red-400 text-xs">⚠️ {error}</div>}

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-medium py-3 rounded-lg text-sm transition mt-2">
            {loading ? "Creating Account..." : "Create Account →"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Already have an account? <Link to="/" className="text-blue-400 hover:text-blue-300">Sign in here</Link>
        </div>
      </div>
    </div>
  );
}