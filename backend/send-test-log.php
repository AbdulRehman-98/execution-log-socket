<?php
// NOTE:
// This script does NOT send logs to the WebSocket server.
// Ratchet lives in its own long-running process and LogServer::push()
// only works inside that same process.
//
// Use backend/websocket-server.php to stream logs instead.

echo "send-test-log.php: This script is not used to push logs to Ratchet.\n";
echo "Start the WebSocket server instead:\n";
echo "  php backend/websocket-server.php\n";
