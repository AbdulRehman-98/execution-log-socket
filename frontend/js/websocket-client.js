/**
 * MULTI–DIMR WebSocket + UI + Parser Manager
 * Each dimrId gets its own:
 *  - WebSocket
 *  - ActionsRunUI instance
 *  - LogParser instance (FULLY isolated — NOT shared)
 */

const WS = {};
const RUN = {};
const PARSER = {};

/**
 * Clone LogParser PROPERLY.
 * This is **NOT** Object.create(LogParser) because that SHARES state.
 */
function createIndependentParser(runInstance) {
    return {
        run: runInstance,
        currentJob: null,
        steps: new Map(),

        init(uiRun) {
            this.run = uiRun;
            this.currentJob = null;
            this.steps = new Map();
        },

        resetState() {
            this.currentJob = null;
            this.steps = new Map();
        },

        /**
         * Fully copied version of LogParser.processLine,
         * but using "this" (isolated parser).
         */
        processLine(raw) {
            const run = this.run;
            const steps = this.steps;
            let currentJob = this.currentJob;

            const line = (raw || "").trim();
            if (!line) return;

            // Execution Start
            if (/Execution\s+Start/i.test(line)) {
                this.resetState();
                this.currentJob = run.addJob("Execution");
                return;
            }

            // Execution End
            if (/Execution\s+End/i.test(line) || line === "[DONE]") {
                run.finishRun();
                if (this.currentJob) {
                    run.finishJob(this.currentJob, run.status);
                }
                this.currentJob = null;
                this.steps = new Map();
                return;
            }

            // Auto-create job if missing
            if (!this.currentJob) {
                this.currentJob = run.addJob("Execution");
            }

            // Parse
            const m = line.match(
                /^\[([^\]]+)]\s+\[([^\]]+)](?:\s+\[([^\]]+)])?(?:\s+<([^>]+)>)?\s*(.*)$/
            );
            if (!m) return;

            const main = m[2];
            const sub = m[3] || null;
            const statusRaw = m[4] || "";
            const text = m[5] || "";
            const status = statusRaw ? statusRaw.toLowerCase() : null;

            let mainStep = steps.get(main);
            if (!mainStep) {
                mainStep = run.addStep(this.currentJob, main);
                steps.set(main, mainStep);
            }

            let step = mainStep;
            if (sub) {
                const key = `${main}/${sub}`;
                step = steps.get(key);
                if (!step) {
                    step = run.addStep(this.currentJob, sub, mainStep);
                    steps.set(key, step);
                }
            }

            step.appendLog(text || line);

            if (status && ["success", "failed", "skipped"].includes(status)) {
                step.finish(status);
            }
        }
    };
}

/**
 * Initialize UI + independent parser for dimrId
 */
function initUI(dimrId) {
    RUN[dimrId] = ActionsRunUI.createRun({
        root: `#actions-root-${dimrId}`,
        title: `Domain-IP Mapping Execution #${dimrId}`
    });

    PARSER[dimrId] = createIndependentParser(RUN[dimrId]);
}

/**
 * Connect websocket for dimrId (with proper reconnect)
 */
function connectWS(dimrId) {
    initUI(dimrId);

    const channel = `dimr_${dimrId}`;
    const wsUrl = `ws://${location.hostname}:9090/?channel=${channel}`;

    WS[dimrId] = new WebSocket(wsUrl);

    WS[dimrId].onopen = () =>
        console.log(`[WS ${dimrId}] Connected → ${channel}`);

    WS[dimrId].onmessage = (event) =>
        PARSER[dimrId].processLine(event.data);

    WS[dimrId].onclose = () => {
        console.warn(`[WS ${dimrId}] Closed — retrying in 2s`);
        setTimeout(() => connectWS(dimrId), 2000);
    };

    WS[dimrId].onerror = (err) => {
        console.error(`[WS ${dimrId}] Error`, err);
        try { WS[dimrId].close(); } catch {}
    };
}

/**
 * START MULTIPLE STREAMS
 */
connectWS(15);
connectWS(16);
