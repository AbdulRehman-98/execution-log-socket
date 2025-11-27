Live Execution Log Viewer

Project Title:
Live Execution Log Viewer

Description:
This project provides a real-time browser-based execution log viewer for requests. The UI displays live logs from the provisioning process including validation, mapping enrichment, DNS provisioning, SSL issuance, PowerMTA configuration, and NGINX deployment. Multiple executions (DIMR requests) can be monitored simultaneously using WebSocket channels such as dimr_15, dimr_16, etc.

The system works similarly to GitHub Actions UI, showing collapsible steps, timers, success/failure icons, and live status indicators updated as logs are streamed.

Architecture:

Backend (PHP CLI / API)
Pushes log lines during DIMR execution using:
LogServer::push("dimr_15", "message");

WebSocket Server:
Runs on Ratchet (PHP WebSocket library)
Maintains client subscriptions per channel
Broadcasts only relevant logs to requested DIMR channels

Frontend:
WebSocket client connects to ws://hostname:9090/?channel=dimr_xx
LogParser parses raw log messages into steps
ActionsRunUI renders UI blocks per execution
Supports auto-open, timers, loader icons, final status handling, etc.

Key Components:

websocket-server.php
Starts WebSocket server on port 9090
Supports channel-based isolation

App/WebSocket/LogServer.php
Internal broadcaster used by backend execution
push($channel, $message) sends updates to connected UI

frontend/js/websocket-client.js
Connects separate WebSocket per DIMR ID
Ensures isolated runs for 15, 16, etc.
Handles reconnect with no duplication

Isolated LogParser instance createIndependentParser(runInstance)
Parses messages in format:
[Timestamp] [Main] [Sub?] <Status?> Message

frontend/js/actions-ui.js
Generates UI similar to GitHub Actions
Displays job, steps, logs, timers, spinners, statuses

frontend/css/actions.css
Defines UI styles, loader animations, step formatting

index.html
DOM roots for each DIMR ID:

<div id="actions-root-15"></div> <div id="actions-root-16"></div>

Log Format Requirements:

Your backend must send logs like:

[2025-11-26 11:41:53] [Validating] Validated Request
[2025-11-26 11:41:54] [DNS] [GoDaddy] <Success> DNS completed
[2025-11-26 11:41:55] [SSL] <Failed> SSL Provisioning failed invalid JSON
[2025-11-26 11:42:01] [Finishing Up] <Success> Unlocking domains

Special markers:
Execution Start
Execution End or [DONE]

The UI only finalizes the global status at Execution End. Failures during steps do not change the main pill.

Usage Instructions:

Install dependencies:
composer require cboden/ratchet

Start WebSocket server:
php websocket-server.php
It will display:
WebSocket listening at ws://localhost:9090

Backend push example:
\App\WebSocket\LogServer::push("dimr_15", "[2025] [DNS] <Success> Synced domain");

Serve index.html and open in browser:
Ensure layouts contain:

<div id="actions-root-15"></div> <div id="actions-root-16"></div>

Initialize WebSocket clients in JS:
connectWS(15);
connectWS(16);

Each UI instance receives only its respective logs.

Features:

Real-time logs over WebSockets
Multiple DIMR streams handled independently
No log duplication
Final status determined at Execution End only
Status pills for running/success/failed
Animated loader while running
Automatic UI expansion for current step
Supports nested steps (Main / Sub)
Reconnect-safe

Project Folder Structure:

/frontend
/css/actions.css
/js/websocket-client.js
/js/actions-ui.js
index.html

/src/App/WebSocket/LogServer.php
/websocket-server.php
composer.json

Future Enhancements (Optional):

Persist log history per DIMR in DB
Desktop notifications on completion
WebSocket authentication
Dark/light theme toggle
Filters per component (DNS / SSL / PMTA)