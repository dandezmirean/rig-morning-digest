import { describe, expect, it } from 'vitest';
import type { DigestRow, Night } from '../src/digest/types.js';
import { Layout } from '../src/views/layout.js';
import { DigestPage } from '../src/views/digest.js';

const lane = { id: 'test-lane', marker: null } as never;

const row = (overrides: Partial<DigestRow>): DigestRow => ({
  job: 'job',
  owner: 'ana',
  runs: 1,
  retries: 0,
  lastStatus: 'ok',
  lastError: null,
  first: '2026-10-28T01:00:00+01:00',
  last: '2026-10-28T01:05:00+01:00',
  ...overrides,
});

const render = (night: Night) =>
  String(
    <Layout title="digest" lane={lane}>
      <DigestPage night={night} />
    </Layout>,
  );

describe('DigestPage', () => {
  it('renders — for a null owner and keeps the time offset', () => {
    const html = render({ night: 'n', rows: [row({ owner: null })], badLines: 0 });
    expect(html).toContain('<td>—</td>');
    expect(html).toContain('2026-10-28T01:00:00+01:00');
  });

  it('marks fail and retries>=3 rows, not clean ones', () => {
    const html = render({
      night: 'n',
      rows: [
        row({ job: 'a-fail', lastStatus: 'fail' }),
        row({ job: 'b-retry', retries: 3 }),
        row({ job: 'c-ok', retries: 2 }),
      ],
      badLines: 0,
    });
    expect(html).toMatch(/<tr class="warn"><td>a-fail/);
    expect(html).toMatch(/<tr class="warn"><td>b-retry/);
    expect(html).toMatch(/<tr><td>c-ok/);
  });

  it('says nothing ran for empty rows and pluralizes bad lines', () => {
    const html = render({ night: 'n', rows: [], badLines: 2 });
    expect(html).toContain('nothing ran');
    expect(html).not.toContain('<table');
    expect(html).toContain('2 lines didn&#39;t parse');
  });
});
