# ⚡ FinSpark: Enterprise Feature Intelligence Framework

**FinSpark** is a deployment-aware, AI-driven telemetry and analytics pipeline built specifically for highly regulated enterprise environments (like Banking, Fintech, and Healthcare). It bridges the gap between raw user clicks and strategic product intelligence, all while enforcing strict data privacy laws at the edge.

---

## 🌐 Live Demo

🔗 **[https://finspark-frontend.onrender.com](https://finspark-frontend.onrender.com)**

> ⚠️ **Note:** The app is hosted on Render's free tier. If it hasn't been visited recently, the server may be in a **cold sleep** state — the first load can take **30–60 seconds** to wake up. Please be patient; it will load!

---

## 🌟 Core Architecture & Technical Highlights

### 1. 🔀 Deployment-Aware Federated Routing

To comply with strict enterprise data residency laws, our Node.js API acts as a dynamic routing engine:

- **Cloud Deployments:** Telemetry data is safely piped into a centralized **MongoDB Atlas** cluster.
- **On-Premise (Air-gapped):** The API physically prevents data from leaving the local network, routing it instead to secure local file storage (`onprem_local_storage.json`).
- **Global Aggregation:** The Admin Dashboard can dynamically aggregate both physical data layers into a unified executive view on the fly.

---

### 2. 🛡️ Edge Compliance Firewall

Data is sanitized and verified *before* it hits the database.

- **PII Data Masking:** User IDs and sensitive parameters are hashed via `SHA-256` directly at the API gateway.
- **GDPR Consent Engine:** Illegitimate payloads from the EU without explicit tracking consent are aggressively blocked and dropped (`HTTP 451`).
- **Strict Tenant Isolation:** Malformed or cross-tenant data injection attempts are instantly rejected by middleware (`HTTP 403`).

---

### 3. 🧠 Multi-Model AI Microservice (Python)

We built a dedicated Python/Flask microservice that processes raw Node.js data in milliseconds using three distinct Machine Learning models:

- **Facebook Prophet:** Time-series forecasting to predict future 30-day feature adoption velocity.
- **Isolation Forest (AIOps):** Unsupervised anomaly detection to flag abnormal spikes in loan application drop-offs.
- **K-Means Clustering:** Groups enterprise tenants into behavioral segments (Power Users, Standard, At-Risk) based on multidimensional engagement volume.

---

## 🏗️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React.js, Tailwind CSS, Recharts, Custom FinSpark SDK mock |
| **API Gateway / Backend** | Node.js, Express.js, JWT Auth, Crypto (Hashing), fs (Local Storage) |
| **Databases** | MongoDB Atlas (Cloud), Local JSON (On-Premise) |
| **ML Microservice** | Python, Flask, Pandas, Scikit-Learn, Facebook Prophet |

---

## 🚀 Local Installation & Setup

To run this 3-tier architecture locally, you will need **three separate terminal windows**.

### Step 1: Start the Python ML Microservice (Terminal 1)

```bash
cd ml-service

# Install required ML libraries
pip install -r requirements.txt

# Run the Flask server (runs on http://127.0.0.1:5000)
python app.py
```

### Step 2: Start the Node.js API Gateway (Terminal 2)

```bash
cd backend

npm install

# Create a .env file with MONGO_DB_URL and JWT_SECRET

# Start the Express server (runs on http://localhost:4000)
npm start
```

### Step 3: Start the React Frontend (Terminal 3)

```bash
cd frontend

npm install

# Start the React app (runs on http://localhost:3000)
npm start
```

---

## 🧪 How to Demo the Platform

> Because Machine Learning requires historical data, we built testing tools to dynamically demonstrate the pipeline's capabilities.

### Demo 1: The "Time Machine" Simulator (ML Insights)

1. Log into the app as an **Admin** and navigate to the **Telemetry Command Center** (`/admin`).
2. Click **🧪 Simulate Traffic**.
3. The React app will inject **1,000 synthetic enterprise telemetry payloads** into the Node backend, mimicking 30 days of multi-tenant usage, weekend drop-offs, and compliance violations.
4. Watch the AI charts instantly render based on the simulated history.
5. Use the **Environment Dropdown** to seamlessly switch between Cloud-only and On-Premise-only data — proving the federated routing engine works.

---

### Demo 2: Live Edge-Firewall Testing (Security)

1. Log into the app as a standard **Customer** (`/dashboard`).
2. Scroll to the bottom to find the **Live SDK Demo Area**.
3. Click **✅ Send Legal Event** — check the Admin dashboard to see the *Total Events* counter tick up by exactly 1, proving the frontend SDK successfully attached enterprise context and passed the firewall.
4. Click **🛑 Send GDPR Violation** — this simulates a hacked SDK sending an illegal EU payload without consent. Check the Admin dashboard — the event is strictly rejected, and the *Violations Blocked* counter ticks up instead!

---

Built with ❤️ for the Hackathon.
