// frontend/js/log-parser.js

const LogParser = (function () {
    let run = null;
    let currentJob = null;
    let steps = new Map();   // Map<string, step>

    function init(uiRun) {
        run = uiRun;
    }

    function resetState() {
        currentJob = null;
        steps = new Map();
    }

    function processLine(raw) {
        const line = (raw || "").trim();
        console.log("[Parser] line:", line);

        if (!line) return;

        // ---- START MARKER ----
        if (/Execution\s+Start/i.test(line)) {
            console.log("[Parser] START detected");
            resetState();
            if (!run) {
                console.warn("[Parser] run not initialized yet");
                return;
            }
            currentJob = run.addJob("Execution");
            return;
        }

        // ---- END MARKER ----
        if (/Execution\s+End/i.test(line) || line === "[DONE]") {
            console.log("[Parser] END detected");
            if (run && typeof run.finishRun === "function") {
                run.finishRun();   // <-- ONLY HERE we finalize global status
            }
            // optional: mark job finished for UI
            if (run && currentJob && typeof run.finishJob === "function") {
                // run.status was set inside finishRun()
                run.finishJob(currentJob, run.status || "success");
            }
            currentJob = null;
            steps.clear();
            return;
        }

        if (!currentJob) {
            console.warn("[Parser] No active job, auto-creating");
            if (!run) return;
            currentJob = run.addJob("Execution");
        }

        // ---- LOG LINES ----
        // Format:
        // [Timestamp] [Main] [Sub?] <Status?> message
        const m = line.match(
            /^\[([^\]]+)]\s+\[([^\]]+)](?:\s+\[([^\]]+)])?(?:\s+<([^>]+)>)?\s*(.*)$/
        );

        if (!m) {
            console.warn("[Parser] No match, skipping:", line);
            return;
        }

        const timestamp = m[1];      // not used currently
        const main      = m[2];      // e.g. "Validating", "Infrastructure Provisioning"
        const sub       = m[3] || null; // e.g. "PMTA"
        const statusRaw = m[4] || "";    // e.g. "Success", "Failed"
        const text      = m[5] || "";    // rest of the message

        const status = statusRaw ? statusRaw.toLowerCase() : null;

        // 1) Ensure MAIN step exists
        let mainStep = steps.get(main);
        if (!mainStep) {
            console.log("[Parser] Creating main step:", main);
            mainStep = run.addStep(currentJob, main);
            steps.set(main, mainStep);
        }

        // 2) Resolve step (sub or main)
        let step = mainStep;
        if (sub) {
            const key = `${main}/${sub}`;
            step = steps.get(key);
            if (!step) {
                console.log("[Parser] Creating sub-step:", key);
                step = run.addStep(currentJob, sub, mainStep);
                steps.set(key, step);
            }
        }

        // 3) Append message as log
        if (step && typeof step.appendLog === "function") {
            const msg = text || line;
            step.appendLog(msg);
        }

        // 4) Apply per-step status ONLY – DO NOT finishRun here
        if (status && typeof step.finish === "function") {
            if (["success", "failed", "skipped"].includes(status)) {
                console.log("[Parser] step status:", main, sub, status);
                step.finish(status);
            }
        }
    }

    return { init, processLine, resetState };
})();
