/**
 * MULTI–Channel WebSocket + UI + Parser Manager
 * Each Channel gets its own:
 *  - WebSocket
 *  - ActionsRunUI instance
 *  - Isolated LogParser instance
 */

const WS = {};
const RUN = {};
const PARSER = {};


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
 * Initialize UI + independent parser for channel
 */
function initUI(channelId) {
    RUN[channelId] = ActionsRunUI.createRun({
        root: `#actions-root-${channelId}`,
        title: `Domain-IP Mapping Execution #${channelId}`
    });

    PARSER[channelId] = createIndependentParser(RUN[channelId]);
}

/**
 * Connect websocket for channel (with proper reconnect)
 */
function connectWS(channelId) {
    initUI(channelId);

    const channel = `dimr_${channelId}`;
    const wsUrl = `ws://${location.hostname}:9090/?channel=${channel}`;

    WS[channelId] = new WebSocket(wsUrl);

    WS[channelId].onopen = () =>
        console.log(`[WS ${channelId}] Connected → ${channel}`);

    WS[channelId].onmessage = (event) =>
        PARSER[channelId].processLine(event.data);

    WS[channelId].onclose = () => {
        console.warn(`[WS ${channelId}] Closed — retrying in 2s`);
        setTimeout(() => connectWS(channelId), 2000);
    };

    WS[channelId].onerror = (err) => {
        console.error(`[WS ${channelId}] Error`, err);
        try { WS[channelId].close(); } catch {}
    };
}

/**
 * TEST START MULTIPLE STREAMS
 */
connectWS(15);
connectWS(16);
