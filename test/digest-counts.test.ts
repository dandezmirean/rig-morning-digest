import { describe, expect, it } from 'vitest';
import { countByLastStatus } from '../src/digest/counts.js';
import type { DigestRow, Night } from '../src/digest/types.js';

const row = (job: string, lastStatus: DigestRow['lastStatus']): DigestRow => ({
  job,
  owner: null,
  runs: 1,
  retries: 0,
  lastStatus,
  lastError: null,
  first: '2026-10-28T02:00:00+01:00',
  last: '2026-10-28T02:00:00+01:00',
});

describe('countByLastStatus', () => {
  it('counts jobs by last status', () => {
    const night: Night = {
      night: '2026-10-28',
      rows: [row('a', 'ok'), row('b', 'ok'), row('c', 'fail')],
      badLines: 0,
    };
    expect(countByLastStatus(night)).toEqual({ ok: 2, retry: 0, fail: 1 });
  });

  it('returns all three keys for an empty night', () => {
    expect(countByLastStatus({ night: '2026-10-29', rows: [], badLines: 0 })).toEqual({ ok: 0, retry: 0, fail: 0 });
  });
});
