import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserPermissions } from '../utils/permissions';

export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role || '';

  const permissions = useMemo(() => getUserPermissions(role), [role]);

  return {
    ...permissions,
    role,
    isAdmin:      () => role === 'ADMIN',
    isRPC:        () => ['RPC','UNIT_COMMANDER'].includes(role),
    isHQ:         () => ['COMPENSATION_HQ', 'COMPENSATION_CO', 'COMPENSATION_HQ_CHIEF'].includes(role),
    isCP_HRM:     () => ['CP_HRM'].includes(role),
    isCommittee:  () => role === 'COMMITTEE_MEMBER',
    hasRole:      (r) => role === r || role === 'ADMIN',
    hasAnyRole:   (...roles) => roles.includes(role) || role === 'ADMIN',
  };
}
