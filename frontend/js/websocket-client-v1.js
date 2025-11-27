// frontend/js/websocket-client.js

let ws = null;
let run = null;

/**
 * Create a fresh UI + attach to LogParser.
 * Called on first load AND on each reconnect.
 */
function initUI(dimrId) {
    console.log("[UI] Initializing ActionsRunUI + LogParser");
    run = ActionsRunUI.createRun({
        root: "#actions-root",
        title: `Domain-IP Mapping Execution #${dimrId}`
    });
    LogParser.init(run);
    if (LogParser.resetState) {
        LogParser.resetState();
    }
}

/**
 * Establish WebSocket connection (with auto-reconnect).
 */
function connectWS(dimrId) {
    initUI(dimrId);

    const channel = `dimr_${dimrId}`;
    console.log("[WS] Using channel:", channel);
    
    const url = `ws://${location.hostname}:9090/?channel=${channel}`;
    console.log("[WS] Connecting to", url);
    ws = new WebSocket(url);

    ws.onopen = () => {
        console.log("[WS] Connected");
    };

    ws.onmessage = (e) => {
        console.log("[WS] message:", e.data);
        try {
            LogParser.processLine(e.data);
        } catch (err) {
            console.error("[WS] LogParser error:", err, "payload:", e.data);
        }
    };

    ws.onclose = (evt) => {
        console.warn("[WS] Closed", evt);
        ws = null;
        // simple reconnect after 2s
        setTimeout(connectWS(dimrId), 2000);
    };

    ws.onerror = (err) => {
        console.error("[WS] Error", err);
        // Let onclose handle reconnect
        try { ws.close(); } catch (e) {}
    };
}

// Start
connectWS(15);
