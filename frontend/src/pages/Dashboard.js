import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { trackPageView, trackClick, trackFeatureIgnored, clearSession } from "../components/SDKMock";

const FEATURES = [
  { id: "calc_emi",          label: "Calculate EMI",            icon: "🧮", color: "blue"   },
  { id: "download_report",   label: "Download Report",          icon: "📥", color: "green"  },
  { id: "req_manager",       label: "Request Manager Override", icon: "🔑", color: "yellow" },
  { id: "track_application", label: "Track Application",        icon: "📍", color: "blue"   },
  { id: "credit_score",      label: "Check Credit Score",       icon: "📊", color: "purple" },
  { id: "refer_friend",      label: "Refer a Friend",           icon: "🤝", color: "green"  },
  { id: "loan_insurance",    label: "Add Loan Insurance",       icon: "🛡️", color: "yellow" },
  { id: "schedule_call",     label: "Schedule a Call",          icon: "📞", color: "purple" },
];

const colorMap = {
  blue:   "border-blue-800 hover:border-blue-500 hover:bg-blue-950/30",
  green:  "border-green-800 hover:border-green-500 hover:bg-green-950/30",
  yellow: "border-yellow-800 hover:border-yellow-500 hover:bg-yellow-950/30",
  purple: "border-purple-800 hover:border-purple-500 hover:bg-purple-950/30",
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // UI State
  const [clicked, setClicked] = useState({});
  const [showEmi, setShowEmi] = useState(false);
  const [emi, setEmi] = useState({ amount: "500000", rate: "9.2", tenure: "48" });
  const [emiResult, setEmiResult] = useState(null);

  // TELEMETRY FIX: Create a "hit list" of all features using a Set in a Ref
  const unclickedFeatures = useRef(new Set(FEATURES.map(f => f.id)));

  // Track Page View on load
  useEffect(() => { 
    trackPageView("dashboard"); 
  }, []);

  // TELEMETRY FIX: Only fire "ignored" events when the user LEAVES the dashboard
  useEffect(() => {
    return () => {
      // This cleanup function runs when the component unmounts
      unclickedFeatures.current.forEach(featureId => {
        trackFeatureIgnored(featureId);
      });
    };
  }, []);

  const handleFeature = (f) => {
    // 1. Update UI to show it was clicked
    setClicked((p) => ({ ...p, [f.id]: true }));
    
    // 2. Remove it from the "hit list" so it isn't marked as ignored later
    unclickedFeatures.current.delete(f.id);
    
    // 3. Track the actual click
    trackClick(`feature_${f.id}`, f.label);
    
    // 4. Feature Logic
    if (f.id === "calc_emi") setShowEmi(true);
    // if (f.id === "track_application") navigate("/apply");
  };

  const handleLogout = () => {
    trackClick("btn_logout", "Logout");
    clearSession(); 
    logout(); 
    navigate("/");
  };

  const calcEmi = () => {
    const P = parseFloat(emi.amount);
    const r = parseFloat(emi.rate) / 12 / 100;
    const n = parseFloat(emi.tenure);
    const result = Math.round(P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1));
    
    setEmiResult(result);
    trackClick("emi_calculated", "EMI Calculated", emi);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col p-4 shrink-0">
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center text-white text-sm font-bold">N</div>
          <span className="text-white font-semibold">NexLend</span>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {[
            ["🏠", "Dashboard", true],
            ["📋", "My Loans", false],
            ["📁", "Documents", false],
            ["💬", "Support", false],
            ["⚙️", "Settings", false]
          ].map(([icon, label, active]) => (
            <button key={label} onClick={() => trackClick(`nav_${label.toLowerCase()}`, label)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition
                ${active ? "bg-blue-950 text-blue-400" : "text-gray-500 hover:bg-gray-800 hover:text-white"}`}>
              <span>{icon}</span>{label}
            </button>
          ))}
        </nav>
        
        {/* User Profile Area */}
        <div className="border-t border-gray-800 pt-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-900 border border-blue-700 rounded-full flex items-center justify-center text-blue-400 font-bold text-sm shrink-0">
            {user?.name?.[0] || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-medium truncate">{user?.name || "Guest User"}</div>
            <div className="text-gray-500 text-xs truncate">{user?.tenant_id || "System"}</div>
          </div>
          <button onClick={handleLogout} title="Logout"
            className="text-gray-500 hover:text-red-400 border border-gray-700 hover:border-red-800 rounded-md w-7 h-7 flex items-center justify-center text-xs transition">
            ⏻
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-white text-2xl font-bold mb-1">
              Good morning, {user?.name?.split(" ")[0] || "there"} 👋
            </h1>
            <p className="text-gray-400 text-sm">Here's your loan summary and available actions.</p>
          </div>
          <button onClick={() => { trackClick("btn_new_app","New Application"); navigate("/apply"); }}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition">
            + New Application
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { icon: "💰", value: "₹5,00,000", label: "Loan Amount",    sub: "Requested" },
            { icon: "📅", value: "₹10,900",   label: "Monthly EMI",    sub: "Per month" },
            { icon: "⏳", value: "48 months", label: "Tenure",          sub: "Repayment period" },
            { icon: "📈", value: "9.2% p.a.", label: "Interest Rate",  sub: "Floating" },
          ].map((s) => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="text-2xl mb-3">{s.icon}</div>
              <div className="text-white text-xl font-bold mb-0.5">{s.value}</div>
              <div className="text-gray-400 text-sm">{s.label}</div>
              <div className="text-gray-600 text-xs">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Feature Buttons Grid */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-white text-lg font-semibold">Quick Actions</h2>
            <span className="bg-gray-800 border border-gray-700 rounded-full px-3 py-0.5 text-xs text-gray-400">
              {Object.keys(clicked).length}/{FEATURES.length} used
            </span>
          </div>
          <p className="text-gray-600 text-xs mb-4">
            Leave some buttons unclicked — they'll appear as <em>unused features</em> in the telemetry dashboard when you navigate away!
          </p>
          <div className="grid grid-cols-4 gap-3">
            {FEATURES.map((f) => (
              <button key={f.id} onClick={() => handleFeature(f)}
                className={`bg-gray-900 border rounded-xl p-4 text-left transition group ${colorMap[f.color]} ${clicked[f.id] ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">{f.icon}</span>
                  {clicked[f.id] && <span className="text-xs bg-green-900 border border-green-700 text-green-400 rounded-full px-2 py-0.5">✓ Used</span>}
                </div>
                <div className="text-white text-sm font-medium">{f.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Application Status */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-5">Application Status</h3>
            <div className="space-y-3">
              {["Submitted","Under Review","Document Check","Approved","Disbursed"].map((s, i) => (
                <div key={s} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full shrink-0 ${i < 2 ? "bg-green-500" : i === 2 ? "bg-blue-500 ring-4 ring-blue-500/20" : "bg-gray-700"}`} />
                  <span className={`text-sm ${i < 2 ? "text-gray-400" : i === 2 ? "text-blue-400 font-medium" : "text-gray-600"}`}>{s}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-gray-800 text-xs text-gray-500">
              🕐 Estimated decision: <span className="text-white">2–3 business days</span>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-5">Recent Activity</h3>
            <div className="space-y-4">
              {[
                { text: "Dashboard accessed",             time: "Just now", color: "bg-blue-500" },
                { text: "Login successful from Mumbai",   time: "2m ago",   color: "bg-green-500" },
                { text: "Session telemetry initialized",  time: "5m ago",   color: "bg-blue-500" },
                { text: "Application draft auto-saved",   time: "1d ago",   color: "bg-yellow-500" },
                { text: "Document reminder sent",         time: "2d ago",   color: "bg-blue-500" },
              ].map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${a.color}`} />
                  <div>
                    <div className="text-gray-400 text-sm">{a.text}</div>
                    <div className="text-gray-600 text-xs">{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* EMI Modal */}
      {showEmi && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowEmi(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-xl font-bold">🧮 EMI Calculator</h2>
              <button onClick={() => setShowEmi(false)} className="text-gray-500 hover:text-white border border-gray-700 rounded-lg w-8 h-8 flex items-center justify-center text-sm transition">✕</button>
            </div>
            <div className="space-y-4 mb-4">
              {[
                ["amount", "Loan Amount (₹)", "500000"],
                ["rate", "Interest Rate (%)", "9.2"],
                ["tenure", "Tenure (months)", "48"]
              ].map(([key, label, ph]) => (
                <div key={key}>
                  <label className="block text-xs text-gray-400 mb-1">{label}</label>
                  <input type="number" value={emi[key]} placeholder={ph}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500 transition"
                    onChange={(e) => setEmi({...emi, [key]: e.target.value})} />
                </div>
              ))}
            </div>
            <button onClick={calcEmi} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg text-sm font-medium transition mb-3">
              Calculate
            </button>
            {emiResult && (
              <div className="bg-blue-950 border border-blue-800 rounded-lg p-4 text-center">
                <div className="text-gray-400 text-xs mb-1">Monthly EMI</div>
                <div className="text-blue-400 text-3xl font-bold">₹{emiResult.toLocaleString("en-IN")}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}