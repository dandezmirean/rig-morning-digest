import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, ReadNight, RunLine, RunStatus } from './types.js';

const NIGHT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const RUN_STATUSES: readonly RunStatus[] = ['ok', 'retry', 'fail'];

type Parsed = { lines: RunLine[]; badLines: number };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isRunStatus = (value: unknown): value is RunStatus =>
  RUN_STATUSES.some((status) => status === value);

const isTimestamp = (value: unknown): value is string =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value));

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const parseRunLine = (text: string): RunLine | null => {
  const value = parseJson(text);
  if (!isRecord(value)) return null;
  const { at, job, status, owner, error } = value;
  if (!isTimestamp(at) || typeof job !== 'string' || job === '' || !isRunStatus(status)) return null;
  if (owner !== null && typeof owner !== 'string') return null;
  if (error !== undefined && typeof error !== 'string') return null;
  return error === undefined ? { at, job, status, owner } : { at, job, status, owner, error };
};

const parseLog = (text: string): Parsed =>
  text
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map(parseRunLine)
    .reduce<Parsed>(
      (acc, line) =>
        line === null
          ? { ...acc, badLines: acc.badLines + 1 }
          : { ...acc, lines: [...acc.lines, line] },
      { lines: [], badLines: 0 },
    );

const groupByJob = (lines: RunLine[]): Map<string, RunLine[]> =>
  lines.reduce(
    (groups, line) => groups.set(line.job, [...(groups.get(line.job) ?? []), line]),
    new Map<string, RunLine[]>(),
  );

// `runs` is never empty: groupByJob only makes a group for a job it has seen.
const toRow = (job: string, runs: RunLine[]): DigestRow => {
  const first = runs[0];
  const final = runs[runs.length - 1];
  return {
    job,
    owner: final.owner,
    runs: runs.length,
    retries: runs.filter((run) => run.status === 'retry').length,
    lastStatus: final.status,
    lastError: final.error ?? null,
    first: first.at,
    last: final.at,
  };
};

const toRows = (lines: RunLine[]): DigestRow[] =>
  [...groupByJob(lines)]
    .map(([job, runs]) => toRow(job, runs))
    .sort((a, b) => a.job.localeCompare(b.job));

const isMissingFile = (error: unknown): boolean =>
  isRecord(error) && error.code === 'ENOENT';

const readLog = (path: string): string | null => {
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    if (isMissingFile(error)) return null;
    throw error;
  }
};

export const readNight: ReadNight = (runsDir, night) => {
  if (!NIGHT_PATTERN.test(night)) return null;
  const text = readLog(join(runsDir, `${night}.jsonl`));
  if (text === null) return null;
  const { lines, badLines } = parseLog(text);
  return { night, rows: toRows(lines), badLines };
};
