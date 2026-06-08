import {
  Clock,
  RefreshCw,
  CheckCircle2,
  Shield,
  ClipboardList,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";

export const STATUS_META = {
  SUBMITTED:          { label: "Submitted",          badgeClass: "status-navy", icon: <Clock size={14} /> },
  UNDER_REVIEW:       { label: "Under Review",        badgeClass: "status-navy", icon: <RefreshCw size={14} /> },
  VERIFIED:           { label: "Verified",            badgeClass: "status-navy", icon: <CheckCircle2 size={14} /> },
  COMMITTEE_ASSIGNED: { label: "Committee Assigned",  badgeClass: "status-navy", icon: <Shield size={14} /> },
  ASSESSED:           { label: "Assessed",            badgeClass: "status-navy", icon: <ClipboardList size={14} /> },
  PAID:               { label: "Paid",                badgeClass: "status-navy", icon: <CheckCircle size={14} /> },
  REJECTED:           { label: "Rejected",            badgeClass: "status-navy", icon: <XCircle size={14} /> },
  RETURNED:           { label: "Returned",            badgeClass: "status-navy", icon: <AlertTriangle size={14} /> },
};

export const DOCUMENT_LABELS = {
  MEDICAL_REPORT:    "Medical Report",
  OB_EXTRACT:        "Police / OB Report",
  DEATH_CERTIFICATE: "Death Certificate",
  NATIONAL_ID:       "National ID / Force ID",
  PF3:               "Commanding Officer Letter",
};

export const MAX_AWARD = 15_000_000;

export const SEV_BANDS = [
  { min: 0,  max: 20,  label: "MINOR",    color: "#1c236d", bg: "rgba(28, 35, 109, 0.05)" },
  { min: 21, max: 40,  label: "MODERATE", color: "#1c236d", bg: "rgba(28, 35, 109, 0.1)"  },
  { min: 41, max: 60,  label: "SEVERE",   color: "#1c236d", bg: "rgba(28, 35, 109, 0.15)" },
  { min: 61, max: 80,  label: "CRITICAL", color: "#1c236d", bg: "rgba(28, 35, 109, 0.2)"  },
  { min: 81, max: 100, label: "FATAL",    color: "#1c236d", bg: "rgba(28, 35, 109, 0.25)" },
];

export const getBand = (pct) =>
  SEV_BANDS.find((b) => pct >= b.min && pct <= b.max) || SEV_BANDS[0];