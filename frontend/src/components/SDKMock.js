// ============================================================
// SDKMock.js — Telemetry SDK
// Fires JSON events to Express backend on every interaction
// ============================================================

const SDK_VERSION = "1.0.0";
const BACKEND_URL = "http://localhost:4000/api/events";

let _session = {
  tenant_id: null,
  user_id: null,
  session_id: generateSessionId(),
  page_start_time: Date.now(),
};

function generateSessionId() {
  return "sess_" + Math.random().toString(36).substring(2, 15);
}

export function initSession({ tenant_id, user_id }) {
  _session.tenant_id = tenant_id;
  _session.user_id = user_id;
  _session.session_id = generateSessionId();
  console.log(`[SDK] Session initialized → user: ${user_id}, tenant: ${tenant_id}`);
}

export function clearSession() {
  _session = {
    tenant_id: null,
    user_id: null,
    session_id: generateSessionId(),
    page_start_time: Date.now(),
  };
}

export async function track(event_type, payload = {}) {
  const event = {
    sdk_version: SDK_VERSION,
    tenant_id: _session.tenant_id,
    user_id: _session.user_id,
    session_id: _session.session_id,
    event_type,
    timestamp: new Date().toISOString(),
    url: window.location.pathname,
    payload,
  };
  console.log(`[SDK] Event:`, event);
  try {
    await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
  } catch (err) {
    console.warn("[SDK] Backend not reachable:", err.message);
  }
}

export function trackPageView(page_name) {
  const time_on_prev = Date.now() - _session.page_start_time;
  track("page_view", { page_name, prev_page_duration_ms: time_on_prev });
  _session.page_start_time = Date.now();
}

export function trackClick(element_id, label, extra = {}) {
  track("button_click", { element_id, label, ...extra });
}

export function trackFunnelStep(step_number, step_name, action = "enter") {
  track("funnel_step", { step_number, step_name, action });
}

export function trackFieldInteraction(field_name, action = "focus") {
  track("field_interaction", { field_name, action });
}

export function trackFeatureIgnored(feature_name) {
  track("feature_ignored", { feature_name });
}

export function trackError(error_code, message) {
  track("error", { error_code, message });
}