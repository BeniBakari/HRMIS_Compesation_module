/**
 * Role-based permission definitions for the Compensation Module.
 * Mirrors the HRMIS pattern: one role → one permission set.
 */

const ROLE_PERMISSIONS = {
  ADMIN: {
    canViewDashboard:      true,
    canSubmitCases:        true,
    canViewAllCases:       true,
    canValidateCases:      true,
    canFormCommittee:      true,
    canSubmitAssessment:   true,
    canManageFormulas:     true,
    canManageUsers:        true,
    canViewAuditLogs:      true,
    canViewReports:        true,
  },
  RPC: {
    canViewDashboard:      true,
    canSubmitCases:        true,
    canViewAllCases:       false,   // own cases only
    canValidateCases:      false,
    canFormCommittee:      false,
    canSubmitAssessment:   true,
    canManageFormulas:     false,
    canManageUsers:        false,
    canViewAuditLogs:      false,
    canViewReports:        false,
  },
  COMPENSATION_HQ: {
    canViewDashboard:      true,
    canSubmitCases:        false,
    canViewAllCases:       true,
    canValidateCases:      true,
    canFormCommittee:      false,
    canSubmitAssessment:   false,
    canManageFormulas:     true,
    canManageUsers:        false,
    canViewAuditLogs:      false,
    canViewReports:        true,
  },
  COMPENSATION_HQ_CO: {
    canViewDashboard:      true,
    canSubmitCases:        false,
    canViewAllCases:       true,
    canValidateCases:      true,
    canFormCommittee:      false,
    canSubmitAssessment:   false,
    canManageFormulas:     false,
    canManageUsers:        false,
    canViewAuditLogs:      true,
    canViewReports:        true,
  },
  COMPENSATION_HQ_SO: {
    canViewDashboard:      true,
    canSubmitCases:        false,
    canViewAllCases:       true,
    canValidateCases:      true,
    canFormCommittee:      false,
    canSubmitAssessment:   false,
    canManageFormulas:     false,
    canManageUsers:        false,
    canViewAuditLogs:      true,
    canViewReports:        true,
  },
  COMPENSATION_HQ_CHIEF: {
    canViewDashboard:      true,
    canSubmitCases:        false,
    canViewAllCases:       true,
    canValidateCases:      true,
    canFormCommittee:      false,
    canSubmitAssessment:   false,
    canManageFormulas:     false,
    canManageUsers:        false,
    canViewAuditLogs:      true,
    canViewReports:        true,
  },
  CP_HRM: {
    canViewDashboard:      true,
    canSubmitCases:        false,
    canViewAllCases:       true,
    canValidateCases:      false,
    canFormCommittee:      true,
    canViewCommittee:      true,
    canSubmitAssessment:   false,
    canViewAssessment:     true,
    canManageFormulas:     false,
    canManageUsers:        false,
    canViewAuditLogs:      true,
    canViewReports:        true,
  },
  COMMITTEE_MEMBER: {
    canViewDashboard:      true,
    canSubmitCases:        false,
    canViewAllCases:       false,   // assigned cases only
    canValidateCases:      false,
    canFormCommittee:      false,
    canSubmitAssessment:   true,
    canManageFormulas:     false,
    canManageUsers:        false,
    canViewAuditLogs:      false,
    canViewReports:        false,
  },
};

const DEFAULT_PERMISSIONS = {
  canViewDashboard:    false,
  canSubmitCases:      false,
  canViewAllCases:     false,
  canValidateCases:    false,
  canFormCommittee:    false,
  canSubmitAssessment: false,
  canManageFormulas:   false,
  canManageUsers:      false,
  canViewAuditLogs:    false,
  canViewReports:      false,
};

export function getUserPermissions(role) {
  return ROLE_PERMISSIONS[role?.toUpperCase()] || DEFAULT_PERMISSIONS;
}
