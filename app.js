const formatScanTime = (value) => {
  if (!value) return "尚未扫描";
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Los_Angeles" }).format(new Date(value));
};

const badgeClass = (job) => job.applicationStatus === "已申请" ? "submitted" : job.lane === "target" ? "target" : "";

const renderJob = (job) => `
  <article class="job-card" data-lane="${job.lane}" data-applied="${job.applicationStatus === "已申请"}">
    <div>
      <div class="job-title">
        <div><p>${job.company} · ${job.location}</p><h3>${job.title}</h3></div>
        <span class="badge ${badgeClass(job)}">${job.applicationStatus}</span>
      </div>
      <div class="job-meta">
        <span>${job.employmentType}</span><span>${job.compensation}</span>
        <span class="live-dot ${job.live ? "" : "down"}">${job.live ? "官方页面可访问" : "需要重新核验"}</span>
      </div>
    </div>
    <div class="fit">
      <div class="fit-row"><span>当前匹配</span><div class="meter"><i style="width:${job.fitScore}%"></i></div></div>
      <strong>${job.fitLabel} · ${job.fitScore}%</strong>
      <small>${job.roleSummary}</small>
      <small>最近核验：${formatScanTime(job.lastVerified)}</small>
    </div>
    <div class="job-analysis">
      <details open><summary>优势与风险</summary><ul>${job.advantages.map(x => `<li>优势：${x}</li>`).join("")}${job.limitations.map(x => `<li>风险：${x}</li>`).join("")}</ul></details>
      <details><summary>如何助力长期目标</summary><p>${job.careerValue}</p></details>
      <div class="next-action"><b>下一步：</b>${job.nextAction}</div>
      <div class="job-links"><a href="${job.url}" target="_blank" rel="noopener">查看官方岗位 ↗</a></div>
    </div>
  </article>`;

let allJobs = [];

function render(filter = "all") {
  const visible = allJobs.filter(job => filter === "all" || (filter === "applied" ? job.applicationStatus === "已申请" : job.lane === filter));
  document.querySelector("#jobList").innerHTML = visible.length ? visible.map(renderJob).join("") : '<div class="empty">这个分类目前没有岗位。</div>';
}

fetch("./data/jobs.json", { cache: "no-store" })
  .then(response => {
    if (!response.ok) throw new Error("岗位数据读取失败");
    return response.json();
  })
  .then(data => {
    allJobs = data.jobs;
    document.querySelector("#trackedCount").textContent = allJobs.length;
    document.querySelector("#appliedCount").textContent = allJobs.filter(j => j.applicationStatus === "已申请").length;
    document.querySelector("#actionCount").textContent = allJobs.filter(j => j.needsTeresa).length;
    document.querySelector("#liveCount").textContent = allJobs.filter(j => j.live).length;
    document.querySelector("#scanTime").textContent = formatScanTime(data.lastScan);
    render();
  })
  .catch(error => document.querySelector("#jobList").innerHTML = `<div class="empty">${error.message}</div>`);

document.querySelectorAll("[data-filter]").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll("[data-filter]").forEach(item => item.classList.remove("active"));
  button.classList.add("active");
  render(button.dataset.filter);
}));
