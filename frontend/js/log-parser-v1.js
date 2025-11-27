// frontend/js/log-parser.js

const LogParser = (function () {
    let run = null;
    let currentJob = null;
    let steps = new Map();   // Map<string, Step>

    function init(uiRun) {
        run = uiRun;
    }

    function resetState() {
        currentJob = null;
        steps = new Map();
    }

    function processLine(raw) {
        const line = raw.trimEnd(); // remove trailing \n/\r
        console.log("[Parser] line:", line);

        // ----- EXECUTION START / END -----
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

        if (/Execution\s+End/i.test(line)) {
            console.log("[Parser] END detected");
            if (currentJob && run.finishJob) {
                run.finishJob(currentJob, currentJob.status || "success");
            }
            if (run && run.finishRun) {
                run.finishRun();
            }
            return;
        }

        // If we somehow got logs before start marker, create a default job
        if (!currentJob) {
            console.warn("[Parser] No job yet, auto-creating 'Execution'");
            if (!run) {
                console.warn("[Parser] run not initialized, skipping line");
                return;
            }
            currentJob = run.addJob("Execution");
        }

        // [Timestamp] [Main] [Sub?] <Status?> message
        const m = line.match(/^\[([^\]]+)\]\s+\[([^\]]+)\](?:\s+\[([^\]]+)\])?(?:\s+<([^>]+)>)?\s*(.*)$/);
        if (!m) {
            console.warn("[Parser] No match, skipping:", line);
            return;
        }

        const timestamp = m[1];               // not used yet, but parsed
        const main      = m[2];               // "Validating", "Setting up", etc.
        const sub       = m[3] || null;       // optional subheading like "PMTA"
        const statusRaw = m[4] || null;       // "Success", "Failed", etc.
        const message   = (m[5] || "").trim();
        const status    = statusRaw ? statusRaw.toLowerCase() : null;

        console.log("[Parser] parsed:", { timestamp, main, sub, status, message });

        // ----- ensure MAIN step exists -----
        let mainStep = steps.get(main);
        if (!mainStep) {
            console.log("[Parser] Creating main step:", main);
            mainStep = run.addStep(currentJob, main);
            steps.set(main, mainStep);
        }

        // ----- resolve step (substep or main step) -----
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

        // ----- append message -----
        if (message && step.appendLog) {
            step.appendLog(message);
        }

        // ----- handle status -----
        if (status && step.finish) {
            let normalized = status;
            if (status === "success" || status === "ok") normalized = "success";
            if (status === "failed" || status === "error") normalized = "failed";

            step.finish(normalized);

            if (normalized === "failed") {
                if (run.finishJob) {
                    run.finishJob(currentJob, "failed");
                }
                if (run.finishRun) {
                    run.finishRun("failed");
                }
            }
        }
    }

    return { init, processLine, resetState };
})();
