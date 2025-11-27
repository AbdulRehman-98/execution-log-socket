<?php

require_once __DIR__ . '/vendor/autoload.php';

use App\WebSocket\ExecutionLogServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use Ratchet\Server\IoServer;

$io = IoServer::factory(
    new HttpServer(
        new WsServer(
            new ExecutionLogServer()
        )
    ),
    9090
);

$loop = $io->loop;

echo "WebSocket listening at ws://localhost:9090\n";

/**
 * Hard-code a short sample log.
 * Replace with your execution logs or wire to your actual code.
 */
$lines = [
    "========================= Execution Start =========================",
    "[2025-11-26 11:43:21] [Validating] Validated Request Method",
    "[2025-11-26 11:43:21] [Validating] Request Id: All Pending",
    "[2025-11-26 11:43:21] [Validating] <Failed> jkl;jkl;ding",
    "[2025-11-26 11:41:53] [Infrastructure Provisioning] [DNS] DNS Provisioning started",
    "[2025-11-26 11:41:56] [Infrastructure Provisioning] [DNS] Output: Starting sync for domain: mpbike.com via godaddy | Synced: mhwehgm (A) | Synced: _dmarc (TXT) | Synced: pebaod (TXT) | Synced: pebaod (A) | Synced: _dmarc (TXT) | Synced: tcswn (TXT) | Synced: tcswn (A) | Synced: _dmarc (TXT) | Synced: mhwehgm (TXT) | Synced: @ (A) | Synced: _dmarc (TXT) | Synced: wapkvqk (TXT) | Synced: wapkvqk (A) | Synced: _dmarc (TXT) | Synced: @ (TXT) | Synced: @ (MX) | Synced: * (CNAME) | DNS record published successfully. | ",
    "[2025-11-26 11:41:56] [Infrastructure Provisioning] [DNS] <Success> DNS completed",
    "[2025-11-26 11:41:56] [Infrastructure Provisioning] [SSL] SSL Provisioning started",
    "[2025-11-26 11:42:56] [Infrastructure Provisioning] [SSL] <Failed> SSL failed: Invalid JSON response",
    "[2025-11-26 11:42:56] [Infrastructure Provisioning] [NGINX] NGINX Provisioning started",
    "[2025-11-26 11:42:56] [Infrastructure Provisioning] [NGINX] Grouping mappings by brand for NGINX provisioning.",
    "[2025-11-26 11:43:13] [Infrastructure Provisioning] [NGINX] <Success> NGINX completed",
    "[2025-11-26 11:43:13] [Infrastructure Provisioning] <Failed> Final provisioning result: failed",
    "[2025-11-26 11:43:13] [Finishing Up] Committing DB transaction",
    "[2025-11-26 11:43:13] [Finishing Up] Unlocking domains: mpbike.com, wapkvqk.mpbike.com, mhwehgm.mpbike.com, tcswn.mpbike.com, pebaod.mpbike.com",
    "[2025-11-26 11:43:13] [Finishing Up] Domains unlocked successfully.",
    "[2025-11-26 11:43:13] [Finishing Up] <Success> Mapping request successfully completed for Server ID: srvit29",
    "[2025-11-26 11:43:13] [SUMMARY] Published requests:",
    "[2025-11-26 11:43:13] [SUMMARY] <Success> - [dimr_id=15] server=srvit29 → status=failed",
    "========================== Execution End ==========================",



];

$idx = 0;

/**
 * Stream one line per second to simulate live job execution.
 */
$timer = $loop->addPeriodicTimer(1, function () use (&$idx, $lines, &$timer, $loop) {
    if (!isset($lines[$idx])) {
        \App\WebSocket\ExecutionLogServer::push("dimr_15","[DONE]\n");
        \App\WebSocket\ExecutionLogServer::push("dimr_16","[DONE]\n");
        
        if ($timer !== null) {
            $loop->cancelTimer($timer);
            $timer = null;
        }

        return;
    }

    \App\WebSocket\ExecutionLogServer::push("dimr_15",$lines[$idx] . "\n");
    \App\WebSocket\ExecutionLogServer::push("dimr_16",$lines[$idx] . "\n");
    $idx++;
});

$io->run();
