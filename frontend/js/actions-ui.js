const ActionsRunUI = (function () {

    const settings = {
        defaultHeaderStatus: "queued", // "queued" | "running" | "idle" | "success" | "failed"
    };

    function formatDuration(ms) {
        if (!ms || ms < 0) return "";
        const s = Math.floor(ms / 1000);
        const m = Math.floor(s / 60);
        return m === 0 ? `${s}s` : `${m}m ${s % 60}s`;
    }

    const STATUS_COLORS = {
        queued:      { text: "Queued" },
        in_progress: { text: "Running" },
        success:     { text: "Succeeded", iconClass: "gh-icon-check" },
        failed:      { text: "Failed",    iconClass: "gh-icon-cross" },
        skipped:     { text: "Skipped" }
    };

    function createRun({ root, title }) {
        const rootEl = typeof root === 'string' ? document.querySelector(root) : root;
        rootEl.innerHTML = "";

        const run = {
            jobs: [],
            title,
            element: null,
            headerPill: null,
            headerTime: null,
            startTime: null,
            endTime: null,
            status: "in_progress",
            activeJob: null
        };

        // ---------- HEADER ----------
        const header = document.createElement("div");
        header.className = "gh-run-header";

        const titleEl = document.createElement("div");
        titleEl.className = "gh-run-header-title";
        titleEl.textContent = title;

        const timeEl = document.createElement("div");
        timeEl.className = "gh-run-meta";
        timeEl.textContent = "";
        run.headerTime = timeEl;

        const left = document.createElement("div");
        left.className = "gh-run-header-left";
        left.appendChild(titleEl);
        left.appendChild(timeEl);

        const pill = document.createElement("div");
        if (settings.defaultHeaderStatus === "queued") {
            pill.className = "gh-pill gh-pill-queued";
            pill.innerHTML = `
                <span class="gh-pill-text">Queued</span>
            `;
        } else if (settings.defaultHeaderStatus === "running") {            
            
            pill.className = "gh-pill gh-pill-running";
            pill.innerHTML = `
                <span class="gh-loader"></span>
                <span class="gh-pill-text">Running<span class="gh-dots"></span></span>
            `;
        } else if (settings.defaultHeaderStatus === "success") {
            pill.className = "gh-pill gh-pill-success";
            pill.innerHTML = `
                <span class="gh-pill-text">Success</span>
            `;
        } else {
            pill.className = "gh-pill gh-pill-failed";
            pill.innerHTML = `                
                <span class="gh-pill-text">Failed</span>
            `;
        }
        run.headerPill = pill;

        header.appendChild(left);
        header.appendChild(pill);

        // ---------- SIDEBAR ----------
        const layout = document.createElement("div");
        layout.className = "gh-layout";

        const sidebar = document.createElement("aside");
        sidebar.className = "gh-sidebar";
        sidebar.innerHTML = `<div class="gh-sidebar-section-title">Jobs</div>`;
        const jobList = document.createElement("div");
        jobList.className = "gh-job-list";
        sidebar.appendChild(jobList);

        // ---------- MAIN ----------
        const main = document.createElement("main");
        main.className = "gh-main";

        const jobHeader = document.createElement("div");
        jobHeader.className = "gh-job-header";
        const jobTitle = document.createElement("div");
        jobTitle.className = "gh-job-title";
        const jobDuration = document.createElement("div");
        jobDuration.className = "gh-job-duration";
        jobHeader.appendChild(jobTitle);
        jobHeader.appendChild(jobDuration);

        const stepsCard = document.createElement("div");
        stepsCard.className = "gh-steps-card";

        main.appendChild(jobHeader);
        main.appendChild(stepsCard);

        layout.appendChild(sidebar);
        layout.appendChild(main);

        rootEl.appendChild(header);
        rootEl.appendChild(layout);

        // ---------- HEADER PILL HELPERS (ONLY USED AT START + finishRun) ----------

        function setHeaderRunning() {            
            run.headerPill.className = "gh-pill gh-pill-running";
            run.headerPill.innerHTML = `
                <span class="gh-loader"></span>
                <span class="gh-pill-text">Running<span class="gh-dots"></span></span>
            `;
        }

        function setHeaderSuccess() {
            run.headerPill.className = "gh-pill gh-pill-success";
            run.headerPill.innerHTML = `
                <span class="gh-icon-check"></span>
                <span>Success</span>
            `;
        }

        function setHeaderFailed() {
            run.headerPill.className = "gh-pill gh-pill-failed";
            run.headerPill.innerHTML = `
                <span class="gh-icon-cross"></span>
                <span>Failed</span>
            `;
        }       
        

        // ---------- INTERNAL HELPERS ----------

        function setActiveJob(job) {
            run.activeJob = job;
            jobList.querySelectorAll(".gh-job-item").forEach(el =>
                el.classList.toggle("gh-job-item-active", el === job.item)
            );
            jobTitle.textContent = job.name;
            jobDuration.textContent =
                job.durationMs ? `Duration · ${formatDuration(job.durationMs)}` : "";
            stepsCard.innerHTML = "";
            stepsCard.appendChild(job.stepsRoot);
        }

        function addJob(name) {
            const job = {
                name,
                status: "in_progress",
                startTime: Date.now(),
                endTime: null,
                durationMs: null,
                steps: [],
                stepsRoot: document.createElement("div")
            };

            const item = document.createElement("div");
            item.className = "gh-job-item";
            item.innerHTML = `
                <div class="gh-job-name">${name}</div>
                <div class="gh-job-status-text">Queued</div>
            `;
            item.onclick = () => setActiveJob(job);
            job.item = item;
            jobList.appendChild(item);

            run.jobs.push(job);
            if (!run.activeJob) setActiveJob(job);

            if (!run.startTime) {
                run.startTime = job.startTime;
            }

            setHeaderRunning();            
            return job;
        }

        function updateJobStatus(job) {
            const cfg = STATUS_COLORS[job.status] || STATUS_COLORS.in_progress;
            job.item.querySelector(".gh-job-status-text").textContent = cfg.text;          
        }
        

        function addStep(job, name, parentStep = null) {
            const step = {
                name,
                status: "in_progress",
                startTime: Date.now(),
                endTime: null,
                durationMs: null,
                logCount: 0,
                row: null,
                details: null,

                appendLog(line) {
                    const ln = document.createElement("div");
                    ln.className = "gh-log-line";
                    ln.innerHTML = `
                        <span class="gh-log-num">${++this.logCount}</span>
                        <span class="gh-log-text">${line}</span>
                    `;
                    this.details.appendChild(ln);

                    // AUTO OPEN ON FIRST LOG
                    if (this.logCount === 1) {
                        this.details.classList.add("open");
                        this.row.classList.add("open");
                        this.row.querySelector(".gh-caret").classList.add("gh-caret-open");
                    }
                },

                finish(status) {
                    this.status = status;
                    this.endTime = Date.now();
                    this.durationMs = this.endTime - this.startTime;
                
                    const icon = this.row.querySelector(".gh-status-icon");
                    icon.classList.remove("gh-loader");
                
                    if (status === "success") {
                        icon.className = "gh-status-icon gh-icon-check";
                    } else if (status === "failed") {
                        icon.className = "gh-status-icon gh-icon-cross";                     
                    } else {
                        icon.className = "gh-status-icon";
                    }
                
                    this.row.querySelector(".gh-step-status-text").textContent =
                        status.charAt(0).toUpperCase() + status.slice(1);
                
                    this.row.querySelector(".gh-step-time").textContent =
                        formatDuration(this.durationMs);
                
                    this.row.classList.remove("gh-step-running");
                }
                
            };

            const row = document.createElement("div");
            row.className = "gh-step-row gh-step-running";
            row.innerHTML = `
                <div class="gh-step-left">
                    <span class="gh-caret"></span>
                    <span class="gh-status-icon gh-loader"></span>
                    <span class="gh-step-name">${name}</span>
                </div>
                <div class="gh-step-right">
                    <span class="gh-step-status-text">In progress</span>
                    <span class="gh-step-time"></span>
                </div>
            `;

            const details = document.createElement("div");
            details.className = "gh-step-details";

            row.onclick = () => {
                const open = details.classList.toggle("open");
                row.classList.toggle("open", open);
                row.querySelector(".gh-caret").classList.toggle("gh-caret-open", open);
            };

            step.row = row;
            step.details = details;

            const container = parentStep ? parentStep.details : job.stepsRoot;
            container.appendChild(row);
            container.appendChild(details);

            job.steps.push(step);
            return step;
        }

        function finishJob(job, status = "success") {
            job.status = status;
            job.endTime = Date.now();
            job.durationMs = job.endTime - job.startTime;

            if (run.activeJob === job) {
                const jobDurationEl = document.querySelector(".gh-job-duration");
                if (jobDurationEl) {
                    jobDurationEl.textContent = `Duration · ${formatDuration(job.durationMs)}`;
                }
            }

            updateJobStatus(job);            
        }

        function finishRun(statusOverride = null) {
            run.endTime = Date.now();
            if (!run.startTime) run.startTime = run.endTime;

            let final;
            if (statusOverride) {
                final = statusOverride;
            } else {
                const hasFailed = run.jobs.some(j => j.steps.some(s => s.status === "failed"));
                final = hasFailed ? "failed" : "success";
            }
            run.status = final;

            const durationMs = run.endTime - run.startTime;
            run.headerTime.textContent = `Duration · ${formatDuration(durationMs)}`;
            
            if (final === "success") {
                setHeaderSuccess();
            } else {
                setHeaderFailed();
            }
        }

        // expose methods to LogParser
        run.addJob          = addJob;
        run.updateJobStatus = updateJobStatus;
        run.addStep         = addStep;
        run.finishJob       = finishJob;
        run.finishRun       = finishRun;
        run.element         = rootEl;

        return run;
    }

    return { createRun, settings };
})();
