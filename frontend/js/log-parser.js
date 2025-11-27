// frontend/js/log-parser.js

const LogParser = (function () {
    let run = null;
    let currentJob = null;
    let steps = new Map();

    function init(uiRun) {
        run = uiRun; // attach a UI instance
    }

    function resetState() {
        currentJob = null;
        steps = new Map();
    }

    /**
     * Each call must receive the correct run instance
     */
    function processLine(raw, uiRun = null) {
        if (uiRun) {
            run = uiRun; // SWITCH CONTEXT
        }

        const line = (raw || "").trim();
        console.log("[Parser] line:", line);
        if (!line) return;

        // ---- START ----
        if (/Execution\s+Start/i.test(line)) {
            console.log("[Parser] START detected");
            resetState();
            currentJob = run.addJob("Execution");
            return;
        }

        // ---- END ----
        if (/Execution\s+End/i.test(line) || line === "[DONE]") {
            console.log("[Parser] END detected");

            if (run && typeof run.finishRun === "function") {
                run.finishRun(); // finalize global status
            }

            if (run && currentJob && typeof run.finishJob === "function") {
                run.finishJob(currentJob, run.status || "success");
            }

            resetState();
            return;
        }

        // ---- Ensure job exists ----
        if (!currentJob) {
            console.warn("[Parser] Auto-creating job");
            currentJob = run.addJob("Execution");
        }

        // ---- Regex match ----
        const m = line.match(
            /^\[([^\]]+)]\s+\[([^\]]+)](?:\s+\[([^\]]+)])?(?:\s+<([^>]+)>)?\s*(.*)$/
        );

        if (!m) {
            console.warn("[Parser] No regex match, skipping:", line);
            return;
        }

        const main  = m[2];
        const sub   = m[3] || null;
        const statusRaw = m[4] || "";
        const text  = m[5] || "";
        const status = statusRaw.toLowerCase();

        // ---- Main step ----
        let mainStep = steps.get(main);
        if (!mainStep) {
            mainStep = run.addStep(currentJob, main);
            steps.set(main, mainStep);
        }

        // ---- Sub step ----
        let step = mainStep;
        if (sub) {
            const key = `${main}/${sub}`;
            step = steps.get(key);
            if (!step) {
                step = run.addStep(currentJob, sub, mainStep);
                steps.set(key, step);
            }
        }

        // ---- Log append ----
        step.appendLog(text);

        // ---- Per-step status ONLY (no global effect) ----
        if (["success", "failed", "skipped"].includes(status)) {
            console.log("[Parser] step status:", main, sub, status);
            step.finish(status);
        }
    }

    return { init, processLine, resetState };
})();
