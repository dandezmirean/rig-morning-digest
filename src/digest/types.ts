// Plan morning-digest § 1. The contract every part of § 2 builds against.

export type RunStatus = 'ok' | 'retry' | 'fail';

// One object per line of runs/<night>.jsonl, after parsing at the edge.
export type RunLine = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

// One row per job. Times keep the offset from the log.
export type DigestRow = {
  job: string;
  owner: string | null; // rendered as `—`
  runs: number; // lines for this job
  retries: number; // lines with status "retry"
  lastStatus: RunStatus; // status of the job's final line
  lastError: string | null; // error of the job's final line
  first: string; // `at` of the job's first line
  last: string; // `at` of the job's final line
};

// Rows sorted by job. `badLines` counts lines that did not parse.
export type Night = {
  night: string;
  rows: DigestRow[];
  badLines: number;
};

// `null` when runs/<night>.jsonl does not exist.
export type ReadNight = (runsDir: string, night: string) => Night | null;
