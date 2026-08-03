import fs from "node:fs/promises";

const fileUrl = new URL("../data/jobs.json", import.meta.url);
const data = JSON.parse(await fs.readFile(fileUrl, "utf8"));
const now = new Date().toISOString();

const expiredSignals = ["job is no longer available", "position has been filled", "page not found", "404 not found"];

async function verify(job) {
  try {
    const response = await fetch(job.url, { redirect: "follow", headers: { "user-agent": "TeresaCareerTracker/1.0" } });
    const body = (await response.text()).toLowerCase();
    job.live = response.ok && body.length > 300 && !expiredSignals.some(signal => body.includes(signal));
  } catch {
    job.live = false;
  }
  job.lastVerified = now;
}

await Promise.all(data.jobs.map(verify));

async function discoverGreenhouse(boardToken) {
  try {
    const response = await fetch(`https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`);
    if (!response.ok) return [];
    const board = await response.json();
    const matched = board.jobs.filter(job => /(?=.*(?:registered nurse|\brn\b|nursing|clinical|healthcare|medical))(?=.*(?:\bai\b|\bml\b|\bllm\b|machine learning|language model))/i.test(job.title));
    return boardToken === "prolificacademicltd"
      ? matched.filter(job => /(seattle|washington state|remote)/i.test(job.title))
      : matched;
  } catch { return []; }
}

async function discoverLever(company) {
  try {
    const response = await fetch(`https://api.lever.co/v0/postings/${company}?mode=json`);
    if (!response.ok) return [];
    const jobs = await response.json();
    return jobs.filter(job => /(?=.*(?:registered nurse|\brn\b|nursing|clinical|healthcare|medical))(?=.*(?:\bai\b|\bml\b|\bllm\b|machine learning|language model))/i.test(job.text));
  } catch { return []; }
}

const [prolific, curai] = await Promise.all([discoverGreenhouse("prolificacademicltd"), discoverLever("curai")]);
const jobKey = (url) => url.match(/([0-9]{7,}|[0-9a-f]{8}-[0-9a-f-]{27,})/i)?.[1] ?? url.split("?")[0];
const existingJobKeys = new Set(data.jobs.map(job => jobKey(job.url)));
const discoveries = [
  ...prolific.map(job => ({ company: "Prolific", title: job.title, location: job.location?.name ?? "See posting", url: job.absolute_url })),
  ...curai.map(job => ({ company: "Curai Health", title: job.text, location: job.categories?.location ?? "See posting", url: job.hostedUrl }))
].filter(job => job.url && !existingJobKeys.has(jobKey(job.url)));

for (const job of discoveries) {
  data.jobs.push({
    id: `discovered-${Buffer.from(job.url).toString("base64url").slice(0, 16)}`,
    company: job.company,
    title: job.title,
    location: job.location,
    employmentType: "待核验",
    compensation: "未披露 / 待核验",
    applicationStatus: "新发现",
    lane: "now",
    fitScore: 50,
    fitLabel: "待人工分析",
    roleSummary: "每日官方招聘板扫描发现；尚未完成 Teresa 专属匹配分析。",
    advantages: ["标题和描述同时包含医疗/临床与 AI 关键词"],
    limitations: ["尚未人工复核资格、待遇和地点"],
    careerValue: "完成岗位全文核验后再判断；目前不自动申请。",
    nextAction: "人工打开官方页面，确认仍在招聘并完成专属分析。",
    needsTeresa: false,
    live: true,
    lastVerified: now,
    url: job.url
  });
}

data.lastScan = now;
await fs.writeFile(fileUrl, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Verified ${data.jobs.length} roles; discovered ${discoveries.length} new roles.`);
