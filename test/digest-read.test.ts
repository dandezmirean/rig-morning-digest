import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';
import type { DigestRow, Night } from '../src/digest/types.js';

const rowFor = (night: Night | null, job: string): DigestRow | undefined =>
  night?.rows.find((row) => row.job === job);

describe('readNight on runs/2026-10-28.jsonl', () => {
  const night = readNight('runs', '2026-10-28');

  it('has 5 jobs, sorted, and 1 bad line', () => {
    expect(night?.night).toBe('2026-10-28');
    expect(night?.rows.map((row) => row.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    expect(night?.badLines).toBe(1);
  });

  it('counts runs and retries and keeps the final status', () => {
    expect(rowFor(night, 'fixtures/refresh')).toEqual({
      job: 'fixtures/refresh',
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: null,
      first: '2026-10-29T01:30:00+01:00',
      last: '2026-10-29T01:37:00+01:00',
    });
  });

  it('keeps the final error', () => {
    const row = rowFor(night, 'notes/backup');
    expect(row?.lastStatus).toBe('fail');
    expect(row?.lastError).toBe('quota exceeded');
  });

  it('keeps a null owner', () => {
    expect(rowFor(night, 'digest/render')?.owner).toBeNull();
  });

  it('counts a retry that later succeeded', () => {
    expect(rowFor(night, 'lane/sync')?.retries).toBe(1);
  });
});

describe('readNight edge cases', () => {
  const runsDir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  writeFileSync(join(runsDir, '2026-01-01.jsonl'), '');

  it('returns null when the night has no file', () => {
    expect(readNight(runsDir, '2026-01-02')).toBeNull();
  });

  it('returns no rows for an empty file', () => {
    expect(readNight(runsDir, '2026-01-01')).toEqual({ night: '2026-01-01', rows: [], badLines: 0 });
  });

  it('returns null for a night that is not a date', () => {
    expect(readNight(runsDir, '../2026-01-01')).toBeNull();
  });
});
