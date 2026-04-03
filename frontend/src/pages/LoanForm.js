import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { trackPageView, trackClick, trackFunnelStep, trackFieldInteraction } from "../components/SDKMock";

const STEPS = [
  { id: 1, label: "Personal Details", icon: "👤" },
  { id: 2, label: "Financials",        icon: "💰" },
  { id: 3, label: "Documents",         icon: "📄" },
];

const REQUIRED_DOCS = ["Aadhaar Card", "PAN Card", "Salary Slip (3 months)", "Bank Statement (6 months)"];

export default function LoanForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [personal, setPersonal] = useState({ fullName: "", dob: "", phone: "", address: "", pincode: "" });
  const [financials, setFinancials] = useState({ income: "", employer: "", loanAmount: "", tenure: "", purpose: "" });
  const [uploaded, setUploaded] = useState({});

  // --- STRICT VALIDATION LOGIC ---
  const isStep1Valid = 
    personal.fullName.trim() !== "" && 
    personal.dob.trim() !== "" && 
    personal.phone.length === 10 && // Must be EXACTLY 10 digits
    personal.pincode.length === 6 && // Must be EXACTLY 6 digits
    personal.address.trim() !== "";
  
  const isStep2Valid = Object.values(financials).every(value => String(value).trim() !== "");
  
  const isStep3Valid = REQUIRED_DOCS.every(doc => uploaded[doc] === true);
  // -------------------------------

  useEffect(() => { trackPageView("loan_application"); trackFunnelStep(1, "personal_details", "enter"); }, []);

  const goTo = (next) => {
    trackFunnelStep(step, STEPS[step-1].label, "exit");
    trackFunnelStep(next, STEPS[next-1].label, "enter");
    setStep(next);
  };

  const handleSkip = () => {
    trackClick("btn_skip_docs", "Skip Documents", { action: "dropped_off" });
    trackFunnelStep(3, "document_upload", "skipped");
    navigate("/dashboard");
  };

  const handleSubmit = async () => {
    trackClick("btn_submit", "Submit Application");
    trackFunnelStep(3, "document_upload", "completed");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 text-center p-8">
      <div className="text-6xl">✅</div>
      <h2 className="text-white text-3xl font-bold">Application Submitted!</h2>
      <p className="text-gray-400">Ref: <span className="text-white font-mono">LN{Date.now().toString().slice(-8)}</span></p>
      <button onClick={() => navigate("/dashboard")}
        className="mt-4 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg text-sm font-medium transition">
        Go to Dashboard →
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Nav */}
      <nav className="bg-gray-900 border-b border-gray-800 px-6 h-14 flex items-center gap-4">
        <span className="text-white font-semibold">NexLend</span>
        <span className="ml-auto text-gray-400 text-sm">{user?.name}</span>
        <button onClick={() => navigate("/dashboard")}
          className="text-gray-400 border border-gray-700 rounded-lg px-3 py-1.5 text-sm hover:text-white transition">
          ✕ Cancel
        </button>
      </nav>

      <div className="flex flex-1 max-w-5xl mx-auto w-full p-6 gap-6">
        {/* Stepper */}
        <aside className="w-52 shrink-0">
          <p className="text-xs text-gray-600 font-semibold tracking-widest mb-4">LOAN APPLICATION</p>
          {STEPS.map((s) => (
            <div key={s.id} className={`flex items-center gap-3 p-3 rounded-lg mb-1 ${step === s.id ? "bg-blue-950" : ""}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                ${step > s.id ? "bg-green-500 text-white" : step === s.id ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-500"}`}>
                {step > s.id ? "✓" : s.id}
              </div>
              <div>
                <div className={`text-sm font-medium ${step === s.id ? "text-white" : "text-gray-500"}`}>{s.label}</div>
                <div className={`text-xs ${step === s.id ? "text-blue-400" : step > s.id ? "text-green-400" : "text-gray-600"}`}>
                  {step > s.id ? "Completed" : step === s.id ? "In Progress" : "Pending"}
                </div>
              </div>
            </div>
          ))}
          <div className="mt-auto border border-gray-800 rounded-lg p-3 mt-6 space-y-2">
            <div className="flex justify-between text-xs"><span className="text-gray-600">Tenant</span><span className="text-gray-400">{user?.tenant_id}</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-600">User</span><span className="text-gray-400">{user?.user_id}</span></div>
          </div>
        </aside>

        {/* Form Card */}
        <main className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl p-8">

          {/* STEP 1 */}
          {step === 1 && (
            <>
              <h1 className="text-white text-2xl font-bold mb-1">👤 Personal Details</h1>
              <p className="text-gray-400 text-sm mb-6">Tell us about yourself.</p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <Field label="Full Name" id="fullName" value={personal.fullName} onChange={(v) => setPersonal({...personal, fullName: v})} placeholder="Full Name" />
                <Field label="Date of Birth" id="dob" type="date" value={personal.dob} onChange={(v) => setPersonal({...personal, dob: v})} />
                
                {/* 10 DIGITS ONLY */}
                <Field label="Phone Number" id="phone" type="tel" value={personal.phone} 
                  onChange={(v) => setPersonal({...personal, phone: v.replace(/\D/g, "").slice(0, 10)})} 
                  placeholder="Phone Number" />
                
                {/* 6 DIGITS ONLY */}
                <Field label="Pincode" id="pincode" type="text" value={personal.pincode} 
                  onChange={(v) => setPersonal({...personal, pincode: v.replace(/\D/g, "").slice(0, 6)})} 
                  placeholder="Pincode" />
                
                <div className="col-span-2">
                  <Field label="Address" id="address" value={personal.address} onChange={(v) => setPersonal({...personal, address: v})} placeholder="Address" />
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-800 items-center">
                <button onClick={() => navigate("/dashboard")} className="btn-ghost">Cancel</button>
                {!isStep1Valid && <span className="ml-auto text-xs text-red-400">Please fill all fields to continue</span>}
                <button 
                  onClick={() => { trackClick("btn_next_step1","Next: Financials"); goTo(2); }} 
                  disabled={!isStep1Valid}
                  className={`${isStep1Valid ? 'ml-auto' : 'ml-4'} btn-primary`}>
                  Next: Financials →
                </button>
              </div>
            </>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <>
              <h1 className="text-white text-2xl font-bold mb-1">💰 Financial Information</h1>
              <p className="text-gray-400 text-sm mb-6">Help us understand your financial profile.</p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                
                {/* DIGITS ONLY */}
                <Field label="Monthly Income (₹)" id="income" type="text" value={financials.income} 
                  onChange={(v) => setFinancials({...financials, income: v.replace(/\D/g, "")})} 
                  placeholder="75000" />
                
                <Field label="Employer / Company" id="employer" value={financials.employer} onChange={(v) => setFinancials({...financials, employer: v})} placeholder="Company Name" />
                
                {/* DIGITS ONLY */}
                <Field label="Loan Amount (₹)" id="loanAmount" type="text" value={financials.loanAmount} 
                  onChange={(v) => setFinancials({...financials, loanAmount: v.replace(/\D/g, "")})} 
                  placeholder="Loan Amount" />
                
                <SelectField label="Loan Tenure" id="tenure" value={financials.tenure} onChange={(v) => setFinancials({...financials, tenure: v})}
                  options={["12 months","24 months","36 months","48 months","60 months"]} />
                <div className="col-span-2">
                  <SelectField label="Loan Purpose" id="purpose" value={financials.purpose} onChange={(v) => setFinancials({...financials, purpose: v})}
                    options={["Home Renovation","Medical Emergency","Education","Business Expansion","Vehicle Purchase","Other"]} />
                </div>
              </div>
              {financials.loanAmount && financials.tenure && (
                <div className="bg-blue-950 border border-blue-800 rounded-lg px-5 py-4 flex items-center gap-4 mb-6">
                  <span className="text-gray-400 text-sm">Estimated EMI</span>
                  <span className="ml-auto text-blue-400 text-2xl font-bold">
                    ₹{Math.round((parseInt(financials.loanAmount) / parseInt(financials.tenure)) * 1.09).toLocaleString("en-IN")}
                  </span>
                  <span className="text-gray-500 text-xs">~9% p.a.</span>
                </div>
              )}
              <div className="flex gap-3 pt-4 border-t border-gray-800 items-center">
                <button onClick={() => goTo(1)} className="btn-ghost">← Back</button>
                {!isStep2Valid && <span className="ml-auto text-xs text-red-400">Please fill all fields to continue</span>}
                <button 
                  onClick={() => { trackClick("btn_next_step2","Next: Documents"); goTo(3); }} 
                  disabled={!isStep2Valid}
                  className={`${isStep2Valid ? 'ml-auto' : 'ml-4'} btn-primary`}>
                  Next: Documents →
                </button>
              </div>
            </>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <>
              <h1 className="text-white text-2xl font-bold mb-1">📄 Document Upload</h1>
              <p className="text-gray-400 text-sm mb-6">Upload documents to complete your application.</p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {REQUIRED_DOCS.map((doc) => (
                  <div key={doc} className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center gap-3 text-center transition
                    ${uploaded[doc] ? "border-green-600 bg-green-950/20" : "border-gray-700 bg-gray-800/40"}`}>
                    <span className="text-3xl">{uploaded[doc] ? "✅" : "📎"}</span>
                    <span className="text-gray-400 text-xs">{doc}</span>
                    <button onClick={() => {
                      trackClick(`upload_${doc.replace(/\s+/g,"_").toLowerCase()}`, `Upload ${doc}`);
                      setUploaded({...uploaded, [doc]: true});
                    }} className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-4 py-1.5 rounded-lg transition">
                      {uploaded[doc] ? "Uploaded ✓" : "Choose File"}
                    </button>
                  </div>
                ))}
              </div>

              <div className="bg-yellow-950/30 border border-yellow-800/50 rounded-xl px-5 py-4 flex items-center gap-4 mb-6">
                <span className="text-2xl">⚡</span>
                <div>
                  <div className="text-yellow-400 text-sm font-semibold">In a hurry? Skip for now</div>
                  <div className="text-gray-500 text-xs">Upload documents later from your dashboard</div>
                </div>
                <button onClick={handleSkip}
                  className="ml-auto bg-yellow-600/20 border border-yellow-600/40 hover:bg-yellow-600/30 text-yellow-400 text-sm px-4 py-2 rounded-lg transition shrink-0">
                  Skip & Exit
                </button>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-800 items-center">
                <button onClick={() => goTo(2)} className="btn-ghost">← Back</button>
                <button onClick={() => navigate("/dashboard")} className="btn-ghost text-red-400 border-red-900/50 hover:border-red-700">Cancel</button>
                {!isStep3Valid && <span className="ml-auto text-xs text-red-400">Upload all documents to submit</span>}
                <button 
                  onClick={handleSubmit} 
                  disabled={loading || !isStep3Valid} 
                  className={`${isStep3Valid ? 'ml-auto' : 'ml-4'} btn-primary`}>
                  {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> : "Submit Application ✓"}
                </button>
              </div>
            </>
          )}
        </main>
      </div>

      <style>{`
        .btn-primary { background: #2563eb; color: white; border: none; border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 500; cursor: pointer; transition: background 0.2s; }
        .btn-primary:hover:not(:disabled) { background: #1d4ed8; }
        .btn-primary:disabled { opacity: 0.3; cursor: not-allowed; }
        .btn-ghost { background: transparent; border: 1px solid #374151; border-radius: 8px; padding: 10px 16px; color: #9ca3af; font-size: 14px; cursor: pointer; transition: all 0.2s; }
        .btn-ghost:hover { border-color: #6b7280; color: white; }
      `}</style>
    </div>
  );
}

function Field({ label, id, type = "text", value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1 font-medium">{label}</label>
      <input id={id} type={type} value={value} placeholder={placeholder}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500 transition"
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => trackFieldInteraction(id, "focus")}
        onBlur={() => trackFieldInteraction(id, "blur")} />
    </div>
  );
}

function SelectField({ label, id, value, onChange, options }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1 font-medium">{label}</label>
      <select id={id} value={value}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500 transition"
        onChange={(e) => { onChange(e.target.value); trackFieldInteraction(id, "change"); }}>
        <option value="">Select an option</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}