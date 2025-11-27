<?php
namespace App\WebSocket;

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

class LogServer implements MessageComponentInterface
{
    /** @var \SplObjectStorage<ConnectionInterface> */
    protected \SplObjectStorage $clients;

    /** @var self|null */
    private static ?self $instance = null;

    public function __construct()
    {
        $this->clients = new \SplObjectStorage();
        self::$instance = $this;
    }

    /**
     * Static helper so any code in this process can broadcast log lines.
     */
    public static function push(string $line): void
    {
        if (!self::$instance) {
            return;
        }

        foreach (self::$instance->clients as $client) {
            $client->send($line);
        }
    }

    public function onOpen(ConnectionInterface $conn): void
    {
        $this->clients->attach($conn);
        echo "[LogServer] Client connected: {$conn->resourceId}\n";
    }

    public function onClose(ConnectionInterface $conn): void
    {
        $this->clients->detach($conn);
        echo "[LogServer] Client disconnected: {$conn->resourceId}\n";
    }

    public function onError(ConnectionInterface $conn, \Exception $e): void
    {
        echo "[LogServer] Error: {$e->getMessage()}\n";
        $conn->close();
    }

    public function onMessage(ConnectionInterface $from, $msg): void
    {
        // We don't need to handle inbound messages for this UI.
        // If you want, you can log or ignore them.
        echo "[LogServer] Received from client {$from->resourceId}: {$msg}\n";
    }
}
