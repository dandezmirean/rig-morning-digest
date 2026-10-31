import type { Night, RunStatus } from './types.js';

export function countByLastStatus(night: Night): Record<RunStatus, number> {
  const counts: Record<RunStatus, number> = { ok: 0, retry: 0, fail: 0 };
  for (const row of night.rows) counts[row.lastStatus] += 1;
  return counts;
}
