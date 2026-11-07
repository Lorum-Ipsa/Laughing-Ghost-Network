import type { GhostProfile, Work } from '@/lib/network';

/** Admin-visible user account record. */
export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  moderator: boolean;
  suspended: boolean;
  verified: boolean;
  created: string;
  updated: string;
};

/** Admin-visible work review. */
export type AdminReview = {
  id: string;
  verdict: string;
  body: string;
  status: string;
  owner: string;
  work: string;
  profile: string;
  created: string;
  updated: string;
  expand?: { work?: Work; profile?: GhostProfile; owner?: { email: string } };
};

/** Admin-visible community report. */
export type AdminReport = {
  id: string;
  subject: string;
  body: string;
  owner: string;
  created: string;
  updated: string;
  expand?: { owner?: { email: string } };
};

/** Admin-visible handle-change request. */
export type AdminHandleChange = {
  id: string;
  current_handle: string;
  requested_handle: string;
  reason: string;
  status: string;
  owner: string;
  profile: string;
  created: string;
  updated: string;
  expand?: { owner?: { email: string }; profile?: GhostProfile };
};

/** Admin-visible audit log entry. */
export type AdminAuditEntry = {
  id: string;
  actor: string;
  action: string;
  target_type: string;
  target_id: string;
  details: string;
  created: string;
  expand?: { actor?: { email: string } };
};

/** Admin-visible notification. */
export type AdminNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  read: boolean;
  owner: string;
  related_work: string;
  created: string;
  expand?: { owner?: { email: string } };
};

export const ROLE_OPTIONS = [
  { value: 'ghost', label: 'Ghost' },
  { value: 'reviewer', label: 'Reviewer' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'admin', label: 'Admin' },
] as const;

export function roleLabel(role?: string | null): string {
  return ROLE_OPTIONS.find((r) => r.value === role)?.label || 'Ghost';
}

export function actionLabel(action: string): string {
  const map: Record<string, string> = {
    work_published: 'Contribution published',
    work_rejected: 'Contribution rejected',
    work_archived: 'Contribution archived',
    work_revision_requested: 'Revision requested',
    work_deleted: 'Contribution deleted',
    work_restored: 'Contribution restored',
    application_accepted: 'Application accepted',
    application_declined: 'Application declined',
    handle_change_approved: 'Handle change approved',
    handle_change_declined: 'Handle change declined',
    report_submitted: 'Report submitted',
    account_suspended: 'Account suspension changed',
    role_changed: 'Role / privilege changed',
    soft_delete: 'Soft delete',
  };
  return map[action] || action;
}

export function verdictLabel(verdict: string): string {
  switch (verdict) {
    case 'endorse': return 'Endorse';
    case 'needs_revision': return 'Needs revision';
    case 'concerns': return 'Concerns';
    default: return verdict;
  }
}
