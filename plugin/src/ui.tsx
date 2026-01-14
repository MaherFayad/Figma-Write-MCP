import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";

// ============================================================================
// Inject Global Styles
// ============================================================================

const globalStyles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Fira+Code&display=swap');

:root {
    --transition-rule: 250ms cubic-bezier(0.4, 0, 0.2, 1);
    --gap-l: 1.25rem;
    --gap-m: 0.875rem;
    --gap-s: 0.5rem;
    --gap-xs: 0.25rem;
    --font-size-m: 0.875rem;
    --font-size-s: 0.75rem;
    --radius-m: 0.625rem;
    --radius-s: 0.375rem;
    
    --vk-color-accent-themed: #4A90FF;
    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.5);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.6);
    
    /* Dark mode defaults */
    --figma-color-bg: #2c2c2c;
    --figma-color-bg-secondary: #383838;
    --figma-color-bg-tertiary: #444444;
    --figma-color-bg-hover: #3d3d3d;
    --figma-color-text: #ffffff;
    --figma-color-text-secondary: #b3b3b3;
    --figma-color-text-tertiary: #808080;
    --figma-color-border: #4d4d4d;
    --figma-color-border-strong: #666666;
    --figma-color-border-selected: #4A90FF;
    --figma-color-icon: #b3b3b3;
    --figma-color-icon-secondary: #808080;
    --figma-color-icon-tertiary: #666666;
    
    background-color: var(--figma-color-bg);
    color: var(--figma-color-text);
}

/* Light mode */
:root.figma-light, .figma-light {
    --vk-color-accent-themed: #0066FF;
    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
    
    --figma-color-bg: #ffffff;
    --figma-color-bg-secondary: #f5f5f5;
    --figma-color-bg-tertiary: #e5e5e5;
    --figma-color-bg-hover: #f0f0f0;
    --figma-color-text: #333333;
    --figma-color-text-secondary: #666666;
    --figma-color-text-tertiary: #999999;
    --figma-color-border: #e0e0e0;
    --figma-color-border-strong: #cccccc;
    --figma-color-border-selected: #0066FF;
    --figma-color-icon: #666666;
    --figma-color-icon-secondary: #999999;
    --figma-color-icon-tertiary: #cccccc;
}

* {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding: 0;
    margin: 0;
    box-sizing: border-box;
}

body {
    overflow: hidden;
    margin: 0;
    padding: 0;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

.container {
    width: 100%;
    height: 100vh;
    padding: var(--gap-l);
    font-size: var(--font-size-m);
    animation: fadeIn 300ms ease-out;
    display: flex;
    flex-direction: column;
    gap: var(--gap-l);
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.title {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--figma-color-text);
}

.status-badge {
    font-size: var(--font-size-s);
    font-weight: 500;
    padding: var(--gap-xs) var(--gap-s);
    border-radius: var(--radius-m);
    transition: all var(--transition-rule);
}

.status-connected {
    background-color: rgba(34, 197, 94, 0.15);
    color: #22c55e;
    box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.3);
}

.status-disconnected {
    background-color: rgba(239, 68, 68, 0.15);
    color: #ef4444;
    box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.3);
}

.status-connecting {
    background-color: rgba(251, 191, 36, 0.15);
    color: #fbbf24;
    box-shadow: 0 0 0 1px rgba(251, 191, 36, 0.3);
    animation: pulse 1.5s ease-in-out infinite;
}

.info-card {
    background-color: var(--figma-color-bg-secondary);
    border-radius: var(--radius-m);
    padding: var(--gap-m);
    border: 1px solid var(--figma-color-border);
}

.info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--gap-xs) 0;
}

.info-label {
    font-size: var(--font-size-s);
    color: var(--figma-color-text-secondary);
}

.info-value {
    font-size: var(--font-size-s);
    font-weight: 500;
    color: var(--figma-color-text);
    font-family: 'Fira Code', monospace;
}

.log-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.log-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--gap-s);
}

.log-title {
    font-size: var(--font-size-s);
    font-weight: 600;
    color: var(--figma-color-text-secondary);
}

.log-clear-btn {
    padding: var(--gap-xs) var(--gap-s);
    font-size: var(--font-size-s);
    cursor: pointer;
    background: none;
    border: 1px solid var(--figma-color-border);
    border-radius: var(--radius-s);
    color: var(--figma-color-text-tertiary);
    transition: all var(--transition-rule);
}

.log-clear-btn:hover {
    background-color: var(--figma-color-bg-hover);
    color: var(--figma-color-text);
    border-color: var(--figma-color-border-strong);
}

.log-container {
    flex: 1;
    overflow-y: auto;
    background-color: var(--figma-color-bg-secondary);
    border-radius: var(--radius-m);
    padding: var(--gap-m);
    font-size: var(--font-size-s);
    font-family: 'Fira Code', monospace;
    border: 1px solid var(--figma-color-border);
}

.log-entry {
    padding: var(--gap-xs) 0;
    display: flex;
    gap: var(--gap-s);
    align-items: flex-start;
}

.log-time {
    color: var(--figma-color-text-tertiary);
    min-width: 60px;
    flex-shrink: 0;
}

.log-message {
    word-break: break-word;
    line-height: 1.4;
}

.log-success { color: #22c55e; }
.log-error { color: #ef4444; }
.log-received { color: #3b82f6; }
.log-sent { color: #a855f7; }
.log-info { color: var(--figma-color-text-secondary); }

.empty-log {
    color: var(--figma-color-text-tertiary);
    font-style: italic;
}

/* Scrollbar styling */
::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

::-webkit-scrollbar-track {
    background: var(--figma-color-bg-secondary);
    border-radius: var(--radius-s);
}

::-webkit-scrollbar-thumb {
    background: var(--figma-color-border);
    border-radius: var(--radius-s);
}

::-webkit-scrollbar-thumb:hover {
    background: var(--figma-color-border-strong);
}
`;

// Inject styles
const styleSheet = document.createElement("style");
styleSheet.textContent = globalStyles;
document.head.appendChild(styleSheet);

// ============================================================================
// Types
// ============================================================================

interface LogEntry {
    id: number;
    timestamp: Date;
    type: "info" | "success" | "error" | "received" | "sent";
    message: string;
}

// ============================================================================
// WebSocket Configuration
// ============================================================================

const WS_URL = "ws://localhost:9000";

// ============================================================================
// Main App Component
// ============================================================================

function App() {
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(true);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [messageCount, setMessageCount] = useState({ received: 0, sent: 0 });

    const wsRef = useRef<WebSocket | null>(null);
    const logIdRef = useRef(0);
    const logContainerRef = useRef<HTMLDivElement>(null);

    // Add log entry
    const log = (type: LogEntry["type"], message: string) => {
        setLogs((prev) => [
            ...prev.slice(-99),
            {
                id: logIdRef.current++,
                timestamp: new Date(),
                type,
                message,
            },
        ]);
    };

    // Auto-scroll log container
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs]);

    // Clear logs
    const clearLogs = () => {
        setLogs([]);
        setMessageCount({ received: 0, sent: 0 });
    };

    // Connect to MCP Server
    useEffect(() => {
        let ws: WebSocket | null = null;
        let reconnectTimeout: number | null = null;

        const connect = () => {
            setConnecting(true);
            log("info", `Connecting to ${WS_URL}...`);

            ws = new WebSocket(WS_URL);
            wsRef.current = ws;

            ws.onopen = () => {
                setConnected(true);
                setConnecting(false);
                log("success", "Connected to MCP Server");
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const shortId = data.requestId?.slice(0, 8) || "N/A";
                    log("received", `${data.type} [${shortId}]`);
                    setMessageCount(prev => ({ ...prev, received: prev.received + 1 }));

                    // Forward to plugin main thread
                    parent.postMessage({ pluginMessage: data }, "*");
                } catch (error) {
                    log("error", `Parse error: ${error}`);
                }
            };

            ws.onclose = () => {
                setConnected(false);
                setConnecting(false);
                log("info", "Disconnected. Reconnecting in 3s...");
                wsRef.current = null;
                reconnectTimeout = window.setTimeout(() => {
                    setConnecting(true);
                    connect();
                }, 3000);
            };

            ws.onerror = () => {
                log("error", "Connection failed");
                setConnecting(false);
            };
        };

        connect();

        return () => {
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            ws?.close();
        };
    }, []);

    // Listen for messages from plugin main thread
    useEffect(() => {
        const handler = (event: MessageEvent) => {
            const msg = event.data.pluginMessage;
            if (!msg) return;

            const shortId = msg.requestId?.slice(0, 8) || "N/A";
            log("sent", `${msg.type} [${shortId}]`);
            setMessageCount(prev => ({ ...prev, sent: prev.sent + 1 }));

            // Forward to MCP Server
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify(msg));
            }
        };

        window.addEventListener("message", handler);
        return () => window.removeEventListener("message", handler);
    }, []);

    // Format time
    const formatTime = (date: Date) => {
        return date.toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    };

    // Get status class
    const getStatusClass = () => {
        if (connected) return "status-connected";
        if (connecting) return "status-connecting";
        return "status-disconnected";
    };

    // Get status text
    const getStatusText = () => {
        if (connected) return "● Connected";
        if (connecting) return "◐ Connecting...";
        return "○ Disconnected";
    };

    return (
        <div className="container">
            {/* Header */}
            <div className="header">
                <h2 className="title">Figma Bridge</h2>
                <div className={`status-badge ${getStatusClass()}`}>
                    {getStatusText()}
                </div>
            </div>

            {/* Connection Info */}
            <div className="info-card">
                <div className="info-row">
                    <span className="info-label">Server URL</span>
                    <span className="info-value">{WS_URL}</span>
                </div>
                <div className="info-row">
                    <span className="info-label">Messages Received</span>
                    <span className="info-value">{messageCount.received}</span>
                </div>
                <div className="info-row">
                    <span className="info-label">Messages Sent</span>
                    <span className="info-value">{messageCount.sent}</span>
                </div>
            </div>

            {/* Activity Log */}
            <div className="log-section">
                <div className="log-header">
                    <span className="log-title">Activity Log</span>
                    <button className="log-clear-btn" onClick={clearLogs}>
                        Clear
                    </button>
                </div>
                <div className="log-container" ref={logContainerRef}>
                    {logs.length === 0 ? (
                        <div className="empty-log">Waiting for activity...</div>
                    ) : (
                        logs.map((entry) => (
                            <div key={entry.id} className="log-entry">
                                <span className="log-time">{formatTime(entry.timestamp)}</span>
                                <span className={`log-message log-${entry.type}`}>
                                    {entry.message}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// Mount App
// ============================================================================

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App />);
