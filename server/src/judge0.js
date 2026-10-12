// Runs student code in the Judge0 sandbox. Student code NEVER runs on our own server.
const IDS = { python: 71, javascript: 63, cpp: 54, java: 62 }; // Judge0 CE language ids

// Ignore trailing spaces and blank lines at the end, so "5\n" equals "5".
export const normalizeOutput = (s) => String(s ?? "").replace(/\r/g, "").split("\n").map((l) => l.trimEnd()).join("\n").trim();

async function execute(language, source, stdin) {
  const base = process.env.JUDGE0_URL;
  if (!base) throw new Error("Code runner is not set up. Add JUDGE0_URL to server/.env.");
  const headers = { "content-type": "application/json" };
  if (process.env.JUDGE0_AUTH_TOKEN) headers["X-Auth-Token"] = process.env.JUDGE0_AUTH_TOKEN;
  if (process.env.JUDGE0_RAPIDAPI_KEY) {
    headers["X-RapidAPI-Key"] = process.env.JUDGE0_RAPIDAPI_KEY;
    headers["X-RapidAPI-Host"] = new URL(base).host;
  }
  let res;
  try {
    res = await fetch(`${base}/submissions?base64_encoded=false&wait=true`, {
      method: "POST", headers,
      body: JSON.stringify({ source_code: source, language_id: IDS[language], stdin, cpu_time_limit: 3, memory_limit: 128000 }),
    });
  } catch {
    throw new Error("Can't reach the code runner. Is Judge0 running?");
  }
  if (!res.ok) throw new Error(`Code runner error (${res.status}).`);
  return res.json();
}

// Runs one program against many test cases. Judge0 status 3 means "ran fine"; above 3 is a compile error, timeout or crash.
export async function runTests(language, source, cases) {
  return Promise.all(cases.map(async (c) => {
    const r = await execute(language, source, c.input);
    const actual = r.stdout ?? "";
    const problem = r.compile_output || r.stderr || (r.status?.id > 3 ? r.status.description : "");
    return {
      passed: r.status?.id === 3 && normalizeOutput(actual) === normalizeOutput(c.expected),
      actual: String(actual).slice(0, 500), error: String(problem || "").slice(0, 500),
      hidden: !!c.hidden, input: c.input, expected: c.expected,
    };
  }));
}
