# AICTE Integrated Institution Complaint Monitoring & Status Portal
### Smart India Hackathon (SIH) Prototype — Centralized Grievance Intelligence & Cross-Bureau Harmonization

---

## 🏛️ Problem Statement & Mandate

Technical institutions registered under the **All India Council for Technical Education (AICTE)** routinely face simultaneous complaints and inquiries across disparate organizational bureaus and field offices:
- **Regulation Bureau (RB)**: Faculty cadre deficiencies, illegal seat expansions, infrastructural non-compliance, unapproved programs.
- **Public Grievance Redressal Cell (PGRC)**: Student capitation disputes, withheld certificates, unpaid faculty salaries, harassment.
- **Approval Bureau (AB)** & **Regional Directorates (NRO, SRO, WRO, ERO, CRO)**: Routine approval verification, seat matrix compliance, regional inspections.

### The Silo Conflict
Historically, bureaus operated without a unified operational view. As a result, the same institution was frequently subjected to parallel, uncoordinated proceedings in multiple bureaus—leading to duplicate show-cause notices, conflicting determinations, and bureaucratic delays.

### The Solution: One Unified Portal
This platform solves the problem by providing **ONE Centralized Monitoring Dashboard** for authorized AICTE officials, featuring:
1. **Automated Cross-Bureau Overlap Detection**: Intelligently identifies institutions facing concurrent proceedings across multiple bureaus, combining exact AICTE Permanent ID matching with token-based fuzzy name normalisation and Levenshtein similarity.
2. **Strict Role-Based Access Control (RBAC)**: Enforced directly in backend APIs. Regional Offices see only cases in their jurisdiction, Bureau officers see all cases but can act only on their assigned bureau's dockets, and Senior Management exercises council-wide governance.
3. **Automated Background Surveillance & Alerts Engine**: Continuous surveillance detecting SLA breaches (overdue cases), approaching deadlines (&le; 7 days), stalled preliminary scrutiny (&gt; 30 days), and council escalations with zero alert duplication.
4. **Statutory Reports & Analytical Suite**: Real-time aggregation for bureau workloads, regional distributions, institutional complaint frequency, pending-case ageing (0-30, 31-60, 61-90, 90+ days), disposal velocities, and periodic trends—with 1-click CSV export and print-ready PDF briefs.
5. **Real-time Live Sync**: Server-Sent Events (SSE) with resilient 5-second polling fallback ensuring instantaneous dashboard updates across terminals when procedural orders are logged.
6. **Immutable Officer Audit Trail**: Senior Management register tracking every procedural order, bureau transfer, escalation, and speaking order with officer identity and timestamps.

---

## 💻 Tech Stack & Architecture

- **Frontend**: React 18, Vite, Tailwind CSS, React Router v6, Recharts, Lucide-React
- **Backend**: Node.js, Express 5, Server-Sent Events (SSE) event bus
- **Database**: SQLite via `better-sqlite3` in Write-Ahead-Log (WAL) mode for high-concurrency ACID transactions
- **Authentication**: Role-based JSON Web Tokens (JWT) with institutional role scoping

---

## ⚡ Quick Start Instructions

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or pnpm

### 1. One-Command Launch (Backend API + Production Frontend on Port 5000)
```bash
cd d:\aicte-dashboard
node server/index.js
```
Open your browser to: **[http://localhost:5000](http://localhost:5000)**

### 2. Development Mode with Hot-Reload (Optional)
```bash
# Terminal 1: Backend API & SSE Daemon
cd d:\aicte-dashboard\server
node index.js

# Terminal 2: Vite Frontend Dev Server
cd d:\aicte-dashboard\client
npm run dev
```
- Frontend Dev URL: **[http://localhost:5173](http://localhost:5173)**
- Backend REST & SSE: **[http://localhost:5000](http://localhost:5000)**

### 3. Re-seeding the Database
To reset the SQLite database to its realistic baseline (63 institutions, 254 cases, planted overlaps):
```bash
cd d:\aicte-dashboard
npm run seed
```

---

## 🔑 Demo Credentials Matrix

The portal features quick-select role chips on the `/login` screen for 1-click evaluation:

| Role | Username | Password | Bureau / Jurisdiction | Permitted Scope |
|---|---|---|---|---|
| **Senior Management** | `admin_mgmt` | `aicte@2026` | Council Secretariat | Full Council-wide view, all case actions, audit trail access, full reporting |
| **Regulation Bureau** | `rb_director` | `aicte@2026` | Regulation Bureau | Views all cases; takes procedural actions on Regulation Bureau dockets |
| **PGRC Bureau** | `pgrc_director` | `aicte@2026` | Public Grievance (PGRC) | Views all cases; takes procedural actions on PGRC dockets |
| **Approval Bureau** | `approval_officer` | `aicte@2026` | Approval Bureau | Views all cases; takes procedural actions on Approval Bureau dockets |
| **Regional Office** | `ro_officer` | `aicte@2026` | Southern Regional Office | Views and acts **only** on institutions and cases located in Southern Region |

---

## 📁 Project Structure

```
d:\aicte-dashboard\
├── package.json                   # Root package script aggregator
├── README.md                      # Comprehensive project documentation
│
├── server\                        # Express 5 Backend
│   ├── index.js                   # Application entrypoint & static build server
│   ├── events.js                  # Server-Sent Events (SSE) broadcast hub
│   ├── data\
│   │   └── aicte_cms.db           # SQLite WAL-mode persistent database
│   ├── db\
│   │   ├── database.js            # SQLite schema initialization
│   │   └── seed.js                # Realistic seed generator (63 insts, 254 cases)
│   ├── services\
│   │   ├── overlapDetector.js     # Exact ID + Levenshtein fuzzy name match engine
│   │   └── alertGenerator.js      # Automated 60-second scheduled alerts generator
│   └── routes\
│       ├── auth.js                # JWT auth & role-based scoping helpers
│       ├── dashboard.js           # Real-time KPI summaries and Recharts data
│       ├── cases.js               # Case CRUD, server-side pagination, actions
│       ├── institutions.js        # Institutional directory & dossier timeline
│       ├── overlaps.js            # Overlap inspection, linking, and coordination
│       ├── alerts.js              # Alerts query, filtering, and acknowledgment
│       ├── reports.js             # 7 analytical report generators (CSV & PDF)
│       ├── audit.js               # Senior Management audit trail engine
│       └── search.js              # Instant global search across cases & institutions
│
└── client\                        # React 18 + Tailwind CSS + Vite Frontend
    ├── index.html                 # Single page application template
    ├── vite.config.js             # Vite configuration with proxy to port 5000
    ├── tailwind.config.js         # AICTE design system theme configuration
    └── src\
        ├── App.jsx                # Router, role layouts, and SSE subscriptions
        ├── context\
        │   └── AuthContext.jsx    # React auth state & credential caching
        ├── services\
        │   └── api.js             # Client API service & SSE event handlers
        ├── components\
        │   ├── Header.jsx         # Gradient header, global search, notification bell
        │   ├── Sidebar.jsx        # Gradient collapsible sidebar with RBAC links
        │   └── CaseDetailModal.jsx# Docket inspection, transfer, escalation, disposal
        └── pages\
            ├── Dashboard.jsx      # Executive overview, KPI cards, Recharts, overlaps
            ├── AllCases.jsx       # Server-paginated data table, filters, register case
            ├── Institutions.jsx   # AICTE institutional register & fuzzy lookup
            ├── InstitutionProfile.jsx # Dedicated institutional dossier & audit trail
            ├── Overlaps.jsx       # Overlap coordination console & side drawer
            ├── Alerts.jsx         # Regulatory alert stream & acknowledgment console
            ├── Reports.jsx        # 7 statutory reports with CSV & PDF export
            ├── AuditLog.jsx       # Senior Management audit log & governance trail
            └── Login.jsx          # Institutional split-screen sign-in with role chips
```

---

## 🎨 Enterprise Government-Tech Design System

The visual design is aligned with high-trust, modern enterprise institutional portals:
- **Palette**: Deep Navy Gradient (`#0B2545` to `#1D6FD1`), subtle Indian Saffron accent (`#F59E0B`), slate neutrals (`#F4F7FB` background, `#FFFFFF` cards, `#E3E9F2` borders).
- **Typography**: Inter with tabular numbers (`tabular-nums`) for currency and case quantities; no text clipping or truncation in KPI cards.
- **Cards & Tables**: 12px border radius, subtle shadows (`0 4px 16px rgba(11,37,69,0.06)`), 48px row heights with sticky headers.
- **Responsive Layout**: Designed for seamless scaling from 4K displays down to tablet resolutions.
