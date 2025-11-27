<?php
namespace App\WebSocket;

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

class ExecutionLogServer implements MessageComponentInterface
{
    protected \SplObjectStorage $clients;
    protected array $channels = []; // channel => [connections]

    private static ?self $instance = null;

    public function __construct()
    {
        $this->clients = new \SplObjectStorage();
        self::$instance = $this;
    }

    /**
     * Broadcast log line to a specific DIMR channel
     */
    public static function push(string $channel, string $line): void
    {
        if (!self::$instance){ return; }

        if (!isset(self::$instance->channels[$channel])) {
            // nobody subscribed to this channel yet
            return;
        }

        foreach (self::$instance->channels[$channel] as $client) {
            $client->send($line);
        }
    }

    public function onOpen(ConnectionInterface $conn): void
    {
        // GET ?channel=dimr_15
        $query = $conn->httpRequest->getUri()->getQuery();
        parse_str($query, $params);
        $channel = $params['channel'] ?? 'default';

        $this->clients->attach($conn);

        if (!isset($this->channels[$channel])) {
            $this->channels[$channel] = [];
        }

        $this->channels[$channel][$conn->resourceId] = $conn;
        $conn->channel = $channel;

        echo "[ExecutionLogServer] Client {$conn->resourceId} joined {$channel}\n";
    }

    public function onClose(ConnectionInterface $conn): void
    {
        $this->clients->detach($conn);
        $channel = $conn->channel ?? 'default';

        unset($this->channels[$channel][$conn->resourceId]);

        echo "[ExecutionLogServer] Client {$conn->resourceId} left {$channel}\n";
    }

    public function onError(ConnectionInterface $conn, \Exception $e): void
    {
        echo "[ExecutionLogServer] Error: {$e->getMessage()}\n";
        $conn->close();
    }

    public function onMessage(ConnectionInterface $from, $msg): void
    {
        echo "[ExecutionLogServer] Received inbound WS message: {$msg}\n";
        // ignore — UI doesn't send anything
    }
}
