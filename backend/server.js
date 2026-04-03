require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // Built-in Node.js library for PII Masking
const app = express();
const PORT = process.env.PORT || 4000;

// 1. Middleware
app.use(cors());
app.use(bodyParser.json());

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_hackathon_key_123";

// 2. MongoDB Connection

mongoose.connect(process.env.MONGO_DB_URL) 
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch(err => console.error("❌ MongoDB connection error:", err));


// ==========================================
// LIVE COMPLIANCE AUDIT COUNTERS
// ==========================================
let complianceAudit = {
    identitiesHashed: 0,
    gdprBlocked: 0,
    tenantBlocked: 0
};

// 3. Define the Schemas
const eventSchema = new mongoose.Schema({
    event_type: String,      
    sdk_version: String,     
    tenant_id: String,       
    user_id: String,         
    session_id: String,      
    url: String,             
    timestamp: { type: Date, default: Date.now }, 
    payload: Object          
});
const TelemetryEvent = mongoose.model('Event', eventSchema);

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, 
    role: { type: String, default: 'customer' }, 
    user_id: { type: String, required: true },
    tenant_id: { type: String, default: 'bank_alpha' }
});
const User = mongoose.model('User', userSchema);

// 4. Auth Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ success: false, message: "Email already exists" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const user_id = "usr_" + Math.random().toString(36).substr(2, 9);

        const newUser = new User({
            name, email, password: hashedPassword, role: role || 'customer', user_id, tenant_id: "bank_alpha"
        });
        await newUser.save();

        const token = jwt.sign(
            { user_id: newUser.user_id, role: newUser.role, tenant_id: newUser.tenant_id }, 
            JWT_SECRET, { expiresIn: '24h' }
        );

        res.status(201).json({ 
            success: true, message: "User registered successfully!", token,
            user: { name: newUser.name, email: newUser.email, user_id: newUser.user_id, tenant_id: newUser.tenant_id, role: newUser.role }
        });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials" });

        const token = jwt.sign(
            { user_id: user.user_id, role: user.role, tenant_id: user.tenant_id }, 
            JWT_SECRET, { expiresIn: '24h' }
        );

        res.json({
            success: true, token,
            user: { name: user.name, email: user.email, user_id: user.user_id, tenant_id: user.tenant_id, role: user.role }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 5. Telemetry Ingestion Route
// app.post('/api/events', async (req, res) => {
//     try {
//         const newEvent = new TelemetryEvent(req.body);
//         await newEvent.save();
//         res.status(201).json({ success: true, message: "Event recorded" });
//     } catch (error) {
//         console.error("Error saving event:", error);
//         res.status(500).json({ success: false, error: "Internal Server Error" });
//     }
// });

// ==========================================
// 5. HARDENED TELEMETRY INGESTION API (COMPLIANCE ENGINE)
// ==========================================
app.post('/api/events', async (req, res) => {
    try {
        let rawData = req.body;

        // 🛡️ COMPLIANCE RULE 1: STRICT TENANT ISOLATION
        if (!rawData.tenant_id) {
            complianceAudit.tenantBlocked++; // <-- NEW: TICK COUNTER
            return res.status(403).json({ success: false, error: "Missing tenant_id" });
        }

        // 🛡️ COMPLIANCE RULE 2: GDPR CONSENT ENGINE
        if (rawData.region === 'EU' && rawData.consent_given !== true) {
            complianceAudit.gdprBlocked++; // <-- NEW: TICK COUNTER
            return res.status(451).json({ success: false, error: "GDPR Violation" });
        }

        // 🛡️ COMPLIANCE RULE 3: PII MASKING
        let maskedUserId = "anonymous";
        if (rawData.user_id) {
            maskedUserId = crypto.createHash('sha256').update(rawData.user_id).digest('hex');
            complianceAudit.identitiesHashed++; // <-- NEW: TICK COUNTER
        }

        const compliantData = { ...rawData, user_id: maskedUserId };
        const newEvent = new TelemetryEvent(compliantData);
        await newEvent.save();
        
        res.status(201).json({ success: true, message: "Compliant event securely recorded" });
    } catch (error) {
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
});

// 6. Hackathon Dev Tools
app.delete('/api/admin/clear-telemetry', async (req, res) => {
    try {
        complianceAudit = { identitiesHashed: 0, gdprBlocked: 0, tenantBlocked: 0 };
        await TelemetryEvent.deleteMany({});
        res.json({ success: true, message: "Telemetry database wiped clean!" });
    } catch (error) {
        console.error("Failed to clear DB:", error);
        res.status(500).json({ success: false, message: "Database clear failed" });
    }
});

// ==========================================
// 7. THE MASTER ANALYTICS ROUTE (FIXED)
// ==========================================
app.get('/api/admin/analytics', async (req, res) => {
    try {
        const allEvents = await TelemetryEvent.find();

        // --- A. BASIC MATH ---
        const funnelStarts = allEvents.filter(e => e.event_type === 'funnel_step' && e.payload?.step_name === 'personal_details' && e.payload?.action === 'enter').length;
        const funnelCompletes = allEvents.filter(e => e.event_type === 'funnel_step' && e.payload?.step_name === 'document_upload' && e.payload?.action === 'completed').length;
        const funnelSkips = allEvents.filter(e => e.event_type === 'funnel_step' && e.payload?.step_name === 'document_upload' && e.payload?.action === 'skipped').length;

        const ignoredEvents = allEvents.filter(e => e.event_type === 'feature_ignored');
        const ignoredCounts = {};
        ignoredEvents.forEach(e => {
            const feature = e.payload?.feature_name;
            if (feature) ignoredCounts[feature] = (ignoredCounts[feature] || 0) + 1;
        });
        const ignoredChartData = Object.keys(ignoredCounts).map(key => ({ name: key, value: ignoredCounts[key] }));

        const pageViews = allEvents.filter(e => e.event_type === 'page_view').length;
        const totalLogins = allEvents.filter(e => e.event_type === 'btn_login' || JSON.stringify(e).includes('btn_login')).length;

        // --- B. PROPHET FORECASTING ---
        const dailyCounts = {};
        allEvents.forEach(e => {
            if (!e.timestamp) return;
            const dateStr = new Date(e.timestamp).toISOString().split('T')[0];
            dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;
        });
        const historicalDataForPython = Object.keys(dailyCounts).map(date => ({ ds: date, y: dailyCounts[date] })).sort((a, b) => new Date(a.ds) - new Date(b.ds));
        
        let predictiveModel = null;
        if (historicalDataForPython.length > 2) {
            try {
                const pythonResponse = await fetch('http://127.0.0.1:5000/api/forecast', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ historical_data: historicalDataForPython })
                });
                const mlData = await pythonResponse.json();
                if (mlData.success) {
                    const formattedChartData = mlData.forecast.map((item) => ({ day: item.date, actual: item.actual, predicted: item.predicted }));
                    const forecastStart = formattedChartData[30].predicted; 
                    const finalPrediction = formattedChartData[formattedChartData.length - 1].predicted; 
                    let adoptionStatus = { label: "🔴 High Risk of Abandonment", color: "text-red-400", bg: "bg-red-900/20", border: "border-red-800" };
                    if (finalPrediction > forecastStart * 1.10) { 
                        adoptionStatus = { label: "🟢 High Adoption Expected", color: "text-green-400", bg: "bg-green-900/20", border: "border-green-800" };
                    } else if (finalPrediction > forecastStart * 1.02) { 
                        adoptionStatus = { label: "🟡 Slow / Moderate Growth", color: "text-yellow-400", bg: "bg-yellow-900/20", border: "border-yellow-800" };
                    }
                    predictiveModel = { chartData: formattedChartData, status: adoptionStatus };
                }
            } catch (mlError) { console.error("Prophet ML Error:", mlError); }
        }

        // --- C. ISOLATION FOREST ANOMALIES ---
        const dailyFunnel = {};
        allEvents.filter(e => e.event_type === 'funnel_step' && e.timestamp).forEach(e => {
            const dateStr = new Date(e.timestamp).toISOString().split('T')[0];
            if (!dailyFunnel[dateStr]) dailyFunnel[dateStr] = { starts: 0, completes: 0 };
            if (e.payload?.action === 'enter') dailyFunnel[dateStr].starts++;
            if (e.payload?.action === 'completed') dailyFunnel[dateStr].completes++;
        });
        const funnelDataForML = Object.keys(dailyFunnel).map(date => {
            const starts = dailyFunnel[date].starts;
            const completes = dailyFunnel[date].completes;
            const dropoff_rate = starts > 0 ? ((starts - completes) / starts) : 0;
            return { date, dropoff_rate, starts, completes };
        });

        let detectedAnomalies = [];
        try {
            if (funnelDataForML.length > 4) {
                const anomalyResponse = await fetch('http://127.0.0.1:5000/api/anomaly', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ funnel_data: funnelDataForML })
                });
                const anomalyData = await anomalyResponse.json();
                if (anomalyData.success) detectedAnomalies = anomalyData.anomalies;
            }
        } catch (err) { console.error("Anomaly ML Error:", err); }

        // --- D. K-MEANS TENANT SEGMENTATION ---
        const tenantStats = {};
        allEvents.forEach(e => {
            const tid = e.tenant_id || "unknown";
            if (!tenantStats[tid]) tenantStats[tid] = { tenant_id: tid, total_events: 0, unique_features: new Set(), login_count: 0 };
            tenantStats[tid].total_events++;
            if (e.event_type === 'btn_login') tenantStats[tid].login_count++;
            if (e.payload?.feature_name) tenantStats[tid].unique_features.add(e.payload.feature_name);
            if (e.payload?.step_name) tenantStats[tid].unique_features.add(e.payload.step_name);
        });

        const tenantDataForML = Object.values(tenantStats).map(t => ({
            tenant_id: t.tenant_id, total_events: t.total_events, unique_features: t.unique_features.size, login_count: t.login_count
        }));

        let tenantSegments = [];
        try {
            if (tenantDataForML.length >= 3) {
                const segmentResponse = await fetch('http://127.0.0.1:5000/api/segment', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenant_data: tenantDataForML })
                });
                const segmentData = await segmentResponse.json();
                if (segmentData.success) tenantSegments = segmentData.clusters;
            }
        } catch (err) { console.error("Segmentation ML Error:", err); }

        // --- E. THE SINGLE RETURN ---
        return res.json({
            success: true,
            totalEvents: allEvents.length,
            pageViews,
            totalLogins,
            funnel: {
                started: funnelStarts,
                completed: funnelCompletes,
                skippedDocs: funnelSkips,
                dropOffRate: funnelStarts > 0 ? Math.round(((funnelStarts - funnelCompletes) / funnelStarts) * 100) : 0
            },
            ignoredFeatures: ignoredChartData,
            predictiveModel,
            anomalies: detectedAnomalies,
            segments: tenantSegments , 
            compliance: complianceAudit
        });

    } catch (error) {
        console.error("Analytics Route Error:", error);
        if (!res.headersSent) return res.status(500).json({ success: false, message: "Failed to fetch analytics" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Backend ready at http://localhost:${PORT}`);
});