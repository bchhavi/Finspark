import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import { 
  PieChart, Pie, Cell, Tooltip as PieTooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, Tooltip as BarTooltip, CartesianGrid,
  LineChart, Line , ScatterChart, Scatter, ZAxis , LabelList
} from 'recharts';

const ROSE_COLORS = ['#f59e0b','#ef4444','#3b82f6','#10b981','#ec4899','#22c55e','#06b6d4','#8b5cf6'];

function RoseChart({ data }) {
  const cx = 120, cy = 115, innerR = 22, maxR = 95;
  const maxVal = Math.max(...data.map(d => d.value));
  const sliceAngle = (2 * Math.PI) / data.length;

  const polarToCart = (angle, r) => ({
    x: cx + r * Math.cos(angle - Math.PI / 2),
    y: cy + r * Math.sin(angle - Math.PI / 2),
  });

  const slices = data.map((d, i) => {
    const startAngle = i * sliceAngle;
    const endAngle = (i + 1) * sliceAngle;
    const r = innerR + (d.value / maxVal) * (maxR - innerR);
    const p1 = polarToCart(startAngle, r);
    const p2 = polarToCart(endAngle, r);
    const pi1 = polarToCart(startAngle, innerR);
    const pi2 = polarToCart(endAngle, innerR);
    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    const labelAngle = startAngle + sliceAngle / 2;
    const lp = polarToCart(labelAngle, r + 12);
    return {
      path: `M${pi1.x},${pi1.y} L${p1.x},${p1.y} A${r},${r} 0 ${largeArc},1 ${p2.x},${p2.y} L${pi2.x},${pi2.y} A${innerR},${innerR} 0 ${largeArc},0 ${pi1.x},${pi1.y} Z`,
      color: ROSE_COLORS[i % ROSE_COLORS.length],
      label: d.name,
      value: d.value,
      lp,
    };
  });

  const svgWidth = 380, svgHeight = 240;

  return (
    <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height="100%">
      {[0.33, 0.66, 1].map((s, i) => (
        <circle key={i} cx={cx} cy={cy} r={innerR + s * (maxR - innerR)}
          fill="none" stroke="#374151" strokeWidth="0.5" strokeDasharray="3,3"/>
      ))}
      {data.map((_, i) => {
        const angle = i * sliceAngle;
        const p = polarToCart(angle, maxR + 4);
        const pi = polarToCart(angle, innerR);
        return <line key={i} x1={pi.x} y1={pi.y} x2={p.x} y2={p.y} stroke="#1f2937" strokeWidth="1.5"/>;
      })}
      {slices.map((s, i) => (
        <path key={i} d={s.path} fill={s.color} opacity="0.9"/>
      ))}
      {slices.map((s, i) => (
        <text key={i} x={s.lp.x} y={s.lp.y} textAnchor="middle" dominantBaseline="middle"
          fill={s.color} fontSize="9" fontWeight="700">{s.value}</text>
      ))}
      {slices.map((s, i) => {
        const lx = 295;
        const ly = 10 + i * 28;
        return (
          <g key={i}>
            <rect x={lx} y={ly} width="9" height="9" rx="1" fill={s.color}/>
            <text x={lx + 14} y={ly + 8} fill="#9ca3af" fontSize="9">{s.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// NEW: Smart Label to prevent text overlapping
const CustomScatterLabel = (props) => {
  const { x, y, value, index } = props;
  if (!value) return null;
  
  // Clean up the name (e.g. "regional_bank" -> "REGIONAL BANK")
  const cleanName = value.replace(/_/g, ' ').toUpperCase();

  // SMART PLACEMENT: Alternates labels up and down based on their index in the cluster
  const yPos = index % 2 === 0 ? y - 12 : y + 22;

  return (
    <text 
      x={x} 
      y={yPos} 
      fill="#d1d5db" 
      fontSize={10} 
      fontWeight="bold" 
      textAnchor="middle"
    >
      {cleanName}
    </text>
  );
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [environment, setEnvironment] = useState('all');

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`http://localhost:4000/api/admin/analytics?env=${environment}`);
      const data = await response.json();
      if (data.success) {
        setMetrics(data);
      }
    } catch (error) {
      console.error("Failed to fetch analytics", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 5000);
    return () => clearInterval(interval);
  }, [environment]); 

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const simulateTraffic = async () => {
    if (!window.confirm("Inject 1000 fake telemetry events into the database?")) return;
    
    const FEATURES = ["calc_emi", "download_report", "req_manager", "track_application", "credit_score", "refer_friend", "loan_insurance", "schedule_call"];
      
    for (let i = 0; i < 1000; i++) {
      const rand = Math.random();
      let eventPayload = {};
      let eventType = "";

      const tenants = [
        { id: "bank_alpha", weight: 0.5 },
        { id: "credit_union_beta", weight: 0.8 },
        { id: "global_finance", weight: 0.9 },
        { id: "regional_bank", weight: 0.97 },
        { id: "fintech_startup", weight: 1.0 }
      ];
      
      const tenantRand = Math.random();
      let selectedTenant = tenants.find(t => tenantRand <= t.weight).id;

      // 🚨 NEW: HACK TO SIMULATE A BROKEN SDK (Missing Tenant ID)
      // 2% of the time, the SDK malfunctions and forgets to send the Tenant ID!
      if (Math.random() > 0.98) {
          selectedTenant = null;
      } 
       

      if (rand < 0.2) eventType = "page_view";
      else if (rand < 0.3) eventType = "btn_login";
      else if (rand < 0.5) {
        eventType = "feature_ignored";
        eventPayload = { feature_name: FEATURES[Math.floor(Math.random() * FEATURES.length)] };
      } else if (rand < 0.7) {
        eventType = "funnel_step";
        eventPayload = { step_name: "personal_details", action: "enter" };
      } else if (rand < 0.9) {
        eventType = "funnel_step";
        eventPayload = { step_name: "document_upload", action: "skipped" };
      } else {
        eventType = "funnel_step";
        eventPayload = { step_name: "document_upload", action: "completed" };
      }

      const deploymentType = Math.random() > 0.3 ? "cloud" : "on-premise";
      const daysAgo = Math.floor(Math.pow(Math.random(), 1.5) * 30);
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - daysAgo);

      // Anomaly Injection
      if (daysAgo === 5 && eventType === "funnel_step") {
          eventPayload.action = "enter"; 
          if (Math.random() > 0.95) eventPayload.action = "completed"; 
      }

      // Weekend Simulation
      const dayOfWeek = pastDate.getDay();
      if ((dayOfWeek === 0 || dayOfWeek === 6) && Math.random() > 0.15) continue; 

      // GDPR Compliance Simulation
      const isEU = Math.random() > 0.9;
      const hasConsent = isEU ? Math.random() > 0.5 : true; 

      fetch('http://localhost:4000/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: eventType,
          user_id: `fake_usr_${Math.floor(Math.random() * 1000)}`,
          tenant_id: selectedTenant,
          deployment_type: deploymentType, 
          timestamp: pastDate.toISOString(),
          payload: eventPayload,
          region: isEU ? 'EU' : 'US',
          consent_given: hasConsent
        })
      });
    }

    alert("Traffic injected! Wait 5 seconds for the dashboard to auto-refresh.");
  };

  if (loading) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Loading Telemetry Data...</div>;
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-4">
            <span className="text-blue-500">⚡</span> Telemetry Command Center
          </h1>
          
          <div className="flex items-center gap-3 bg-gray-900 border border-gray-800 p-2 rounded-lg w-fit">
            <span className="text-xs text-gray-500 font-medium ml-2 uppercase tracking-wider">Environment:</span>
            <select 
              value={environment} 
              onChange={(e) => setEnvironment(e.target.value)}
              className="bg-gray-800 text-white text-sm border border-gray-700 rounded-md px-3 py-1.5 outline-none focus:border-blue-500 transition cursor-pointer"
            >
              <option value="all">🌐 Global (All Deployments)</option>
              <option value="cloud">☁️ Cloud Environments</option>
              <option value="on-premise">🏢 On-Premise (Federated)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={async () => {
              if (!window.confirm("🚨 Delete ALL telemetry data and start fresh?")) return;
              await fetch('http://localhost:4000/api/admin/clear-telemetry', { method: 'DELETE' });
              alert("Database wiped! Now click 'Simulate Traffic' to build a fresh history.");
              fetchAnalytics();
            }} 
            className="bg-red-900/40 border border-red-700 hover:bg-red-600 text-red-400 px-3 py-1.5 rounded text-xs transition">
            🗑️ Reset Data
          </button>

          <button onClick={simulateTraffic} className="bg-yellow-900/40 border border-yellow-700 hover:bg-yellow-600 text-yellow-400 px-3 py-1.5 rounded text-xs transition">
            🧪 Simulate Traffic
          </button>
          
          <span className="text-sm text-gray-400 ml-4">Logged in as: <span className="text-white font-semibold">{user?.name}</span> (Admin)</span>
          <button onClick={handleLogout} className="bg-red-900/50 hover:bg-red-600 text-red-200 px-4 py-2 rounded-lg text-sm transition">
            Logout
          </button>
        </div>
      </div>
      
      {/* 🚨 AI ANOMALY ALERTS */}
      {metrics?.anomalies?.length > 0 && (
        <div className="mb-8 bg-red-950/30 border border-red-900/50 rounded-xl p-5 shadow-lg shadow-red-900/20">
          <h2 className="text-red-400 font-bold flex items-center gap-2 mb-3">
            <span className="animate-pulse">🚨</span> AIOps: Isolation Forest Anomaly Detected
          </h2>
          <div className="space-y-2">
            {metrics.anomalies.map((anomaly, idx) => (
              <div key={idx} className="bg-red-900/20 border border-red-800/30 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="text-red-200 text-sm font-semibold">Abnormal Funnel Drop-off Spike</div>
                  <div className="text-red-400/70 text-xs">Date: {anomaly.date}</div>
                </div>
                <div className="text-right">
                  <div className="text-red-400 font-bold text-lg">{Math.round(anomaly.dropoff_rate * 100)}% Drop-off</div>
                  <div className="text-red-500/70 text-xs">{anomaly.starts} started, only {anomaly.completes} completed.</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <MetricCard title="Total Events Tracked" value={metrics?.totalEvents || 0} icon="📡" color="text-blue-400" />
        <MetricCard title="Total Page Views" value={metrics?.pageViews || 0} icon="👁️" color="text-green-400" />
        <MetricCard title="Total Sign-ins" value={metrics?.totalLogins || 0} icon="🔑" color="text-yellow-400" />
        <MetricCard title="Funnel Drop-off Rate" value={`${metrics?.funnel?.dropOffRate || 0}%`} icon="📉" color="text-red-400" />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-2 gap-6">

        {/* Blind Spots Rose Chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-200">Blind Spots (Unused Dashboard Features)</h2>
          <p className="text-xs text-gray-500 mb-4">Features users saw but never clicked before leaving the page.</p>
          <div className="h-64">
            {metrics?.ignoredFeatures?.length > 0 ? (
              <RoseChart data={metrics.ignoredFeatures} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-600">No ignored features tracked yet.</div>
            )}
          </div>
        </div>

        {/* Funnel Stats */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-4 text-gray-200">Loan Application Funnel</h2>
            <div className="space-y-4 mt-6">
              <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                <span className="text-gray-400">New Application Form</span>
                <span className="text-xl font-bold">{metrics?.funnel?.started || 0} users</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                <span className="text-gray-400">Skipped Documents</span>
                <span className="text-xl font-bold text-yellow-500">{metrics?.funnel?.skippedDocs || 0} users</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Successfully Completed</span>
                <span className="text-xl font-bold text-green-500">{metrics?.funnel?.completed || 0} users</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================== */}
        {/* 🛡️ GOVERNANCE & COMPLIANCE CONTROLS        */}
        {/* ========================================== */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
              <span className="text-emerald-400">🛡️</span> Security, Privacy & Compliance Hub
            </h2>
            <span className="bg-emerald-900/30 text-emerald-400 border border-emerald-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              System Compliant
            </span>
          </div>
          
         <div className="grid grid-cols-3 gap-4 mt-4">
            {/* Control 1: PII Masking */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 flex items-start gap-3 relative overflow-hidden">
              <div className="text-xl mt-1">🎭</div>
              <div className="z-10">
                <div className="text-sm font-bold text-white mb-1">PII Data Masking</div>
                <div className="text-xs text-gray-400">Payloads anonymized at the edge via AES/SHA-256 before database storage.</div>
                <div className="mt-3 text-lg text-emerald-400 font-bold flex items-center gap-2">
                  {metrics?.compliance?.identitiesHashed || 0} <span className="text-xs font-normal text-emerald-500">Identities Secured</span>
                </div>
              </div>
            </div>

            {/* Control 2: GDPR/Consent */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 flex items-start gap-3 relative overflow-hidden">
              <div className="text-xl mt-1">📜</div>
              <div className="z-10">
                <div className="text-sm font-bold text-white mb-1">GDPR Consent Firewall</div>
                <div className="text-xs text-gray-400">Illegal EU payloads aggressively dropped at the API gateway level.</div>
                <div className="mt-3 text-lg text-red-400 font-bold flex items-center gap-2">
                  {metrics?.compliance?.gdprBlocked || 0} <span className="text-xs font-normal text-red-500">Violations Blocked</span>
                </div>
              </div>
            </div>

            {/* Control 3: Tenant Isolation */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 flex items-start gap-3 relative overflow-hidden">
              <div className="text-xl mt-1">🧱</div>
              <div className="z-10">
                <div className="text-sm font-bold text-white mb-1">Strict Tenant Isolation</div>
                <div className="text-xs text-gray-400">Malformed cross-tenant data requests instantly rejected by middleware.</div>
                <div className="mt-3 text-lg text-orange-400 font-bold flex items-center gap-2">
                  {metrics?.compliance?.tenantBlocked || 0} <span className="text-xs font-normal text-orange-500">Intrusions Prevented</span>
                </div>
              </div>
            </div>
          </div>
          
        </div>

      </div>

      {/* ========================================== */}
      {/* ✨ AI PREDICTIVE INSIGHTS MODULE           */}
      {/* ========================================== */}
      <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col col-span-2">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
              <span className="text-purple-400">✨</span> Feature Adoption Forecast (30-Day Outlook)
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Time-series projection modeling future platform engagement based on current telemetry velocity.
            </p>
          </div>
          
          {metrics?.predictiveModel && (
            <div className={`px-4 py-2 rounded-lg border ${metrics.predictiveModel.status.bg} ${metrics.predictiveModel.status.border} ${metrics.predictiveModel.status.color} text-sm font-semibold flex items-center gap-2 shadow-lg`}>
              Status: {metrics.predictiveModel.status.label}
            </div>
          )}
        </div>

        <div className="h-72 w-full">
          {metrics?.predictiveModel?.chartData ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.predictiveModel.chartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="day" stroke="#9ca3af" tick={{fill: '#9ca3af', fontSize: 11}} minTickGap={20} />
                <YAxis stroke="#9ca3af" tick={{fill: '#9ca3af', fontSize: 11}} />
                <BarTooltip 
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
                  labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
                />
                
                <Line 
                  type="monotone" dataKey="actual" name="Historical Usage" 
                  stroke="#3b82f6" strokeWidth={3} dot={false} 
                  activeDot={{ r: 6, fill: '#3b82f6', stroke: '#111827', strokeWidth: 2 }}
                />
                <Line 
                  type="monotone" dataKey="predicted" name="AI Forecast" 
                  stroke="#a855f7" strokeWidth={3} strokeDasharray="5 5" dot={false} 
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
             <div className="h-full flex items-center justify-center text-gray-600">Awaiting telemetry volume to generate forecast...</div>
          )}
        </div>
      </div>
          
      {/* ========================================== */}
      {/* 📊 K-MEANS TENANT SEGMENTATION MODULE      */}
      {/* ========================================== */}
      <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-6 col-span-2 mb-10">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
            <span className="text-blue-400">📊</span> Enterprise Tenant Segmentation (K-Means Clustering)
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Unsupervised machine learning groups tenants based on behavioral usage velocity and feature adoption depth.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 h-80"> 
            {metrics?.segments?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 25, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  
                  <XAxis 
                    type="number" dataKey="total_events" name="Total Engagement" 
                    stroke="#9ca3af" tick={{fill: '#9ca3af', fontSize: 11}} 
                    label={{ value: 'Total Engagement (Volume)', position: 'insideBottom', offset: -15, fill: '#d1d5db', fontSize: 12, fontWeight: 500 }}
                  />
                  <YAxis 
                    type="number" dataKey="unique_features" name="Features Adopted" 
                    stroke="#9ca3af" tick={{fill: '#9ca3af', fontSize: 11}} 
                    label={{ value: 'Features Adopted (Breadth)', angle: -90, position: 'insideLeft', offset: -5, fill: '#d1d5db', fontSize: 12, fontWeight: 500 }}
                  />
                  <ZAxis type="category" dataKey="segment_name" name="Segment" />
                  
                  <BarTooltip cursor={{strokeDasharray: '3 3'}} contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }}/>
                 {[...new Set(metrics.segments.map(s => s.segment_name))].map((segmentName) => {
                    let dotColor = "#fbbf24"; 
                    if (segmentName.includes("Power")) dotColor = "#22c55e"; 
                    if (segmentName.includes("Risk")) dotColor = "#ef4444"; 

                    return (
                      <Scatter 
                        key={segmentName} name={segmentName} 
                        data={metrics.segments.filter(s => s.segment_name === segmentName)} 
                        fill={dotColor} 
                      >
                        {/* NEW: Using our Smart Alternating Label */}
                        <LabelList dataKey="tenant_id" content={<CustomScatterLabel />} />
                      </Scatter>
                    );
                  })}
                  
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-600">Awaiting multi-tenant data for clustering...</div>
            )}
          </div>

          <div className="space-y-3 overflow-y-auto h-80 pr-2">
            <h3 className="text-sm font-semibold text-gray-400 mb-3 border-b border-gray-800 pb-2">Tenant Mapping</h3>
            {metrics?.segments?.map((tenant, idx) => {
              let statusColor = "text-yellow-500";
              if (tenant.segment_name.includes("Power")) statusColor = "text-green-500";
              if (tenant.segment_name.includes("Risk")) statusColor = "text-red-500";

              return (
                <div key={idx} className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                  <div className="text-sm font-bold text-white mb-1">
                    {tenant.tenant_id.replace(/_/g, ' ').toUpperCase()}
                  </div>
                  <div className={`text-xs font-bold ${statusColor}`}>
                    {tenant.segment_name}
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-400">
                    <span>Events: <span className="text-gray-200">{tenant.total_events}</span></span>
                    <span>Features: <span className="text-gray-200">{tenant.unique_features}</span></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, color }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex items-center gap-4">
      <div className={`text-3xl ${color}`}>{icon}</div>
      <div>
        <div className="text-gray-500 text-sm">{title}</div>
        <div className="text-white text-2xl font-bold">{value}</div>
      </div>
    </div>
  );
}