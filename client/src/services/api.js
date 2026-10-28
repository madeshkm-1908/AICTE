// API service for AICTE CMS
const API_BASE = '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('aicte_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

export const api = {
  // Auth
  async login(username, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Login failed');
    }
    return res.json();
  },

  async complainantLogin(identifier, password) {
    const res = await fetch(`${API_BASE}/auth/complainant/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: identifier, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Complainant login failed');
    }
    return res.json();
  },

  async complainantRegister(payload) {
    const res = await fetch(`${API_BASE}/auth/complainant/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Registration failed');
    }
    return res.json();
  },

  async searchComplainantInstitutions(q = '') {
    const res = await fetch(`${API_BASE}/complainant/institutions?q=${encodeURIComponent(q)}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to search institutions');
    return res.json();
  },

  async submitComplainantGrievance(data) {
    const res = await fetch(`${API_BASE}/complainant/complaints`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit grievance');
    }
    return res.json();
  },

  async getMyComplaints() {
    const res = await fetch(`${API_BASE}/complainant/my-complaints`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to load complaints');
    return res.json();
  },

  async getMyComplaintDetail(caseId) {
    const res = await fetch(`${API_BASE}/complainant/my-complaints/${encodeURIComponent(caseId)}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to load complaint tracking detail');
    return res.json();
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Session invalid');
    return res.json();
  },

  async getDemoUsers() {
    const res = await fetch(`${API_BASE}/auth/demo-users`);
    return res.json();
  },

  // Dashboard
  async getDashboardSummary(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/dashboard/summary${query ? `?${query}` : ''}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to load dashboard summary');
    return res.json();
  },

  // Cases
  async getCases(params = {}) {
    const cleanParams = {};
    Object.keys(params).forEach(k => {
      const v = params[k];
      if (v !== undefined && v !== null && v !== 'undefined' && v !== 'null') {
        if (typeof v === 'string' && v.trim() === '') return;
        cleanParams[k] = v;
      }
    });
    const query = new URLSearchParams(cleanParams).toString();
    const res = await fetch(`${API_BASE}/cases${query ? `?${query}` : ''}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}: Failed to load cases`);
    }
    return res.json();
  },

  async getCaseDetail(caseId) {
    const res = await fetch(`${API_BASE}/cases/${encodeURIComponent(caseId)}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to load case detail');
    return res.json();
  },

  async createCase(caseData) {
    const res = await fetch(`${API_BASE}/cases`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(caseData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create case');
    }
    return res.json();
  },

  async postCaseAction(caseId, actionData) {
    const res = await fetch(`${API_BASE}/cases/${encodeURIComponent(caseId)}/action`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(actionData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to record action');
    }
    return res.json();
  },

  async transferCase(caseId, transferData) {
    const res = await fetch(`${API_BASE}/cases/${encodeURIComponent(caseId)}/transfer`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(transferData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to transfer case');
    }
    return res.json();
  },

  async escalateCase(caseId, escalateData = {}) {
    const res = await fetch(`${API_BASE}/cases/${encodeURIComponent(caseId)}/escalate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(escalateData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to escalate case');
    }
    return res.json();
  },

  async disposeCase(caseId, disposeData = {}) {
    const res = await fetch(`${API_BASE}/cases/${encodeURIComponent(caseId)}/dispose`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(disposeData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to dispose case');
    }
    return res.json();
  },

  // Overlaps
  async getOverlaps(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/overlaps${query ? `?${query}` : ''}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to load overlapping cases');
    return res.json();
  },

  async linkCases(case_id_1, case_id_2, institution_key, remarks = '') {
    const res = await fetch(`${API_BASE}/overlaps/link`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ case_id_1, case_id_2, institution_key, remarks })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to link cases');
    }
    return res.json();
  },

  async coordinateOverlap(institution_key, remarks = '') {
    const res = await fetch(`${API_BASE}/overlaps/coordinate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ institution_key, remarks })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to mark as coordinated');
    }
    return res.json();
  },

  async dismissOverlap(institution_key, remarks = '') {
    const res = await fetch(`${API_BASE}/overlaps/dismiss`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ institution_key, remarks })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to dismiss overlap');
    }
    return res.json();
  },

  async rescanOverlaps() {
    const res = await fetch(`${API_BASE}/overlaps/re-scan`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  // Institutions
  async getInstitutions(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/institutions${query ? `?${query}` : ''}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to load institutions');
    return res.json();
  },

  async getInstitutionDetail(instId) {
    const res = await fetch(`${API_BASE}/institutions/${encodeURIComponent(instId)}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to load institution details');
    return res.json();
  },

  // Alerts
  async getAlerts(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/alerts${query ? `?${query}` : ''}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to load alerts');
    return res.json();
  },

  async resolveAlert(alertId) {
    const res = await fetch(`${API_BASE}/alerts/${alertId}/resolve`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to resolve alert');
    return res.json();
  },

  async resolveAllAlerts(type = 'ALL') {
    const res = await fetch(`${API_BASE}/alerts/resolve-all`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ type })
    });
    if (!res.ok) throw new Error('Failed to resolve alerts');
    return res.json();
  },

  async syncAlerts() {
    const res = await fetch(`${API_BASE}/alerts/sync`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to sync alerts');
    return res.json();
  },

  // Reports
  async getReport(type = 'bureau', params = {}) {
    const query = new URLSearchParams({ type, ...params }).toString();
    const res = await fetch(`${API_BASE}/reports?${query}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to load report dataset');
    return res.json();
  },

  // Audit Logs (Senior Management only)
  async getAuditLogs(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/audit?${query}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to load audit logs');
    }
    return res.json();
  },

  async exportAuditLogs() {
    const res = await fetch(`${API_BASE}/audit/export`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to export audit logs');
    return res.json();
  },

  // Global Search
  async globalSearch(query) {
    if (!query || query.trim().length < 2) return { cases: [], institutions: [] };
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query.trim())}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Global search failed');
    return res.json();
  },

  // CSV Import
  async downloadImportTemplate(type = 'institutions') {
    const res = await fetch(`${API_BASE}/import/template?type=${type}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to download template');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aicte_${type}_sample_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },

  async executeImport(payload) {
    const res = await fetch(`${API_BASE}/import/execute`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Import execution failed');
    }
    return res.json();
  }
};

/**
 * Live updates subscription: Server-Sent Events (SSE) with fallback 5-second polling
 */
export function subscribeToLiveUpdates(onUpdate, onError) {
  let eventSource = null;
  let pollingInterval = null;
  let isSSEConnected = false;

  const startPolling = () => {
    if (pollingInterval) return;
    pollingInterval = setInterval(() => {
      onUpdate({ type: 'POLL_TRIGGER', timestamp: new Date().toISOString() });
    }, 5000);
  };

  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  };

  try {
    eventSource = new EventSource('/api/events');

    eventSource.onopen = () => {
      isSSEConnected = true;
      stopPolling();
      onUpdate({ type: 'SSE_CONNECTED', timestamp: new Date().toISOString() });
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onUpdate(data);
      } catch (e) {
        // Heartbeat or raw text event
      }
    };

    eventSource.onerror = (err) => {
      isSSEConnected = false;
      if (onError) onError(err);
      // Fallback to 5-second polling if SSE drops
      startPolling();
    };
  } catch (e) {
    startPolling();
  }

  // Return unsubscribe cleanup function
  return () => {
    if (eventSource) {
      eventSource.close();
    }
    stopPolling();
  };
}
