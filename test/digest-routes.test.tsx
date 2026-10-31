import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const GOOD_NIGHT = '2026-10-28';
const EMPTY_NIGHT = '2026-10-27';
const BAD_LINE_NIGHT = '2026-10-26';
const MISSING_NIGHT = '2026-10-25';

const goodLines = [
  { at: '2026-10-28T01:00:00+01:00', job: 'ledger-sync', status: 'retry', owner: 'ops', error: 'timeout' },
  { at: '2026-10-28T01:05:00+01:00', job: 'ledger-sync', status: 'ok', owner: 'ops' },
  { at: '2026-10-28T02:00:00+01:00', job: 'digest-mail', status: 'ok', owner: null },
];

let runsDir: string;

const config = (dir: string) => ({
  adapter: 'shim',
  installed: '2026-10-29T14:06:00+01:00',
  beatEverySeconds: 60,
  runsDir: dir,
});

const jsonLines = (lines: object[]) => lines.map((line) => JSON.stringify(line)).join('\n');

beforeAll(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  writeFileSync(join(runsDir, `${GOOD_NIGHT}.jsonl`), `${jsonLines(goodLines)}\n`);
  writeFileSync(join(runsDir, `${EMPTY_NIGHT}.jsonl`), '');
  writeFileSync(
    join(runsDir, `${BAD_LINE_NIGHT}.jsonl`),
    [JSON.stringify(goodLines[0]), 'not json at all', JSON.stringify(goodLines[2])].join('\n'),
  );
});

afterAll(() => {
  rmSync(runsDir, { recursive: true, force: true });
});

describe('GET /digest/:night', () => {
  it('renders the jobs of a good night', async () => {
    const res = await createApp(config(runsDir)).request(`/digest/${GOOD_NIGHT}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('ledger-sync');
    expect(html).toContain('digest-mail');
  });

  it('answers 404 for a night with no file', async () => {
    const res = await createApp(config(runsDir)).request(`/digest/${MISSING_NIGHT}`);
    expect(res.status).toBe(404);
  });

  it('says nothing ran for an empty night', async () => {
    const res = await createApp(config(runsDir)).request(`/digest/${EMPTY_NIGHT}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('nothing ran');
  });

  it('still renders the valid rows of a night with a bad line', async () => {
    const res = await createApp(config(runsDir)).request(`/digest/${BAD_LINE_NIGHT}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('ledger-sync');
    expect(html).toContain('digest-mail');
  });
});

describe('GET /api/digest/:night', () => {
  it('returns the rows of a good night in the page order', async () => {
    const app = createApp(config(runsDir));
    const html = await (await app.request(`/digest/${GOOD_NIGHT}`)).text();
    const res = await app.request(`/api/digest/${GOOD_NIGHT}`);
    const body = (await res.json()) as { night: string; rows: { job: string }[]; badLines: number };
    expect(res.status).toBe(200);
    expect(body.night).toBe(GOOD_NIGHT);
    expect(body.badLines).toBe(0);
    const positionsInPage = body.rows.map((row) => html.indexOf(`<td>${row.job}</td>`));
    expect(positionsInPage.every((position) => position >= 0)).toBe(true);
    expect([...positionsInPage].sort((a, b) => a - b)).toEqual(positionsInPage);
  });

  it('answers 404 for a night with no file', async () => {
    const res = await createApp(config(runsDir)).request(`/api/digest/${MISSING_NIGHT}`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'no such night' });
  });

  it('returns no rows and zero bad lines for an empty night', async () => {
    const res = await createApp(config(runsDir)).request(`/api/digest/${EMPTY_NIGHT}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ night: EMPTY_NIGHT, rows: [], badLines: 0 });
  });

  it('counts the bad line and keeps the valid rows', async () => {
    const res = await createApp(config(runsDir)).request(`/api/digest/${BAD_LINE_NIGHT}`);
    const body = (await res.json()) as { rows: { job: string }[]; badLines: number };
    expect(res.status).toBe(200);
    expect(body.badLines).toBe(1);
    expect(body.rows.map((row) => row.job)).toEqual(['digest-mail', 'ledger-sync']);
  });
});
