import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";

// ============================================================================
// Inject Global Styles (matching Swap-all-Variables plugin)
// ============================================================================

const globalStyles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Fira+Code&display=swap');

:root {
    --transition-rule: 250ms cubic-bezier(0.4, 0, 0.2, 1);
    --transition-spring: 350ms cubic-bezier(0.34, 1.56, 0.64, 1);
    
    --gap-l: 1.25rem;
    --gap-m: 0.875rem;
    --gap-s: 0.5rem;
    --gap-xs: 0.25rem;
    
    --font-size-m: 0.875rem;
    --font-size-s: 0.75rem;
    --font-size-xs: 0.5rem;
    
    --radius-m: 0.625rem;
    --radius-s: 0.375rem;
    
    /* Dark mode defaults with fallbacks */
    --vk-color-accent-themed: #4A90FF;
    --vk-color-accent-themed-hover: #5EA0FF;
    --vk-color-accent-themed-darked: #3a72cc;
    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.5);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.6);
    --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.8);
    --shadow-button: 0 2px 12px rgba(74, 144, 255, 0.5);
    
    /* Figma color variable fallbacks (dark mode defaults) */
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
    --figma-color-bg-inverse: #ffffff;
    --figma-color-text-oninverse: #000000;
    
    background-color: var(--figma-color-bg);
    color: var(--figma-color-text);
}


/* Light mode overrides */
:root.figma-light, .figma-light {
    --vk-color-accent-themed: #0066FF;
    --vk-color-accent-themed-hover: #0052CC;
    --vk-color-accent-themed-darked: #0052cc;
    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
    --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
    --shadow-button: 0 2px 8px rgba(0, 102, 255, 0.25);
    
    /* Light mode Figma color fallbacks */
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
    --figma-color-bg-inverse: #333333;
    --figma-color-text-oninverse: #ffffff;
}


/* Dark mode (explicit, for when class is applied) */
:root.figma-dark, .figma-dark {
    --vk-color-accent-themed: #4A90FF;
    --vk-color-accent-themed-hover: #5EA0FF;
    --vk-color-accent-themed-darked: #3a72cc;
    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.5);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.6);
    --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.8);
    --shadow-button: 0 2px 12px rgba(74, 144, 255, 0.5);
}


* {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    padding: 0;
    margin: 0;
    box-sizing: border-box;
}

*:focus-visible {
    outline: 2px solid var(--figma-color-border-selected);
    outline-offset: 2px;
    border-radius: var(--radius-s);
}

/* Global scrollbar styling */
::-webkit-scrollbar {
    width: 10px;
    height: 10px;
}

::-webkit-scrollbar-track {
    background: var(--figma-color-bg-secondary);
    border-radius: var(--radius-s);
    margin: 2px;
}

::-webkit-scrollbar-thumb {
    background: var(--figma-color-border);
    border-radius: var(--radius-s);
    border: 2px solid var(--figma-color-bg-secondary);
    transition: background var(--transition-rule);
}

::-webkit-scrollbar-thumb:hover {
    background: var(--figma-color-border-strong);
}

::-webkit-scrollbar-thumb:active {
    background: var(--figma-color-icon);
}

.figma-dark ::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-color: transparent;
}

.figma-dark ::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
}

.figma-dark ::-webkit-scrollbar-thumb:active {
    background: rgba(255, 255, 255, 0.4);
}

body {
    overflow: hidden;
    margin: 0;
    padding: 0;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(8px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-8px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes spin {
    to {
        transform: scaleX(-1) rotate(-360deg);
    }
}

@keyframes tabSwitch {
    0% {
        transform: scale(1) rotate(0deg);
    }
    40% {
        transform: scale(1.25) rotate(-5deg);
    }
    100% {
        transform: scale(1.15) rotate(8deg);
    }
}

.container {
    width: 100%;
    padding: var(--gap-l);
    font-size: var(--font-size-m);
    animation: fadeIn 300ms ease-out;
    display: flex;
    flex-direction: column;
    justify-content: start;
    align-items: stretch;
    gap: var(--gap-l);
    min-height: 100vh;
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

.form-item {
    display: flex;
    flex-direction: column;
    gap: var(--gap-s);
}

.form-item > label {
    display: block;
    padding: 0 var(--gap-xs);
    font-size: var(--font-size-s);
    font-weight: 500;
    color: var(--figma-color-text-secondary);
    letter-spacing: 0.01em;
}

/* Segmented Control - matching source plugin */
.segmented {
    appearance: none;
    border: none;
    display: flex;
    padding: 4px;
    position: relative;
    border-radius: var(--radius-m);
    background-color: var(--figma-color-bg-secondary);
    border: 1.5px solid var(--figma-color-border);
    box-shadow: var(--shadow-sm);
}

.segmented::before {
    content: '';
    position: absolute;
    border-radius: calc(var(--radius-m) - 4px);
    background-color: var(--figma-color-bg);
    box-shadow: 0 2px 10px -2px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1);
    transition: all var(--transition-spring);
    z-index: 0;
    top: 4px;
    bottom: 4px;
    width: calc(25% - 4px);
    left: 4px;
}

.segmented[data-selected="editing"]::before {
    transform: translateX(0);
}

.segmented[data-selected="creating"]::before {
    transform: translateX(calc(100% + 4px));
}

.segmented[data-selected="context"]::before {
    transform: translateX(calc(200% + 8px));
}

.segmented[data-selected="misc"]::before {
    transform: translateX(calc(300% + 12px));
}

.segmented-option {
    appearance: none;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-grow: 1;
    gap: var(--gap-xs);
    padding: var(--gap-s) var(--gap-xs);
    min-height: 2.25rem;
    z-index: 1;
    cursor: pointer;
    background: none;
    border: none;
    border-radius: calc(var(--radius-m) - 4px);
    transition: transform var(--transition-rule);
}

.segmented-option:active {
    transform: scale(.96);
}

.segmented-option svg {
    color: var(--figma-color-icon);
    opacity: 0.5;
    transition: opacity var(--transition-spring), transform var(--transition-spring);
}

.segmented-option:hover svg {
    opacity: 0.75;
}

.segmented-option.selected svg {
    opacity: 1;
    transform: scale(1.15) rotate(8deg);
    animation: tabSwitch 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Tooltip for segmented */
.segmented-option .tooltip {
    position: absolute;
    top: calc(-1 * var(--gap-s));
    text-align: center;
    width: max-content;
    opacity: 0;
    border-radius: var(--radius-s);
    padding: var(--gap-s) var(--gap-m);
    background-color: var(--figma-color-bg-inverse);
    color: var(--figma-color-text-oninverse);
    box-shadow: var(--shadow-lg);
    transform: translateY(-90%);
    transition: transform var(--transition-spring), opacity var(--transition-rule);
    pointer-events: none;
    font-size: var(--font-size-s);
    font-weight: 500;
    z-index: 100;
}

.segmented-option:hover .tooltip,
.segmented-option:focus-visible .tooltip {
    opacity: 1;
    transform: translateY(-100%);
}

.mode-description {
    font-size: var(--font-size-s);
    color: var(--figma-color-text-secondary);
    padding: var(--gap-m);
    background-color: var(--figma-color-bg-secondary);
    border-radius: var(--radius-m);
    line-height: 1.5;
    border: 1px solid var(--figma-color-border);
    animation: slideDown 300ms ease-out;
}

.log-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.log-header {
    font-size: var(--font-size-s);
    font-weight: 600;
    margin-bottom: var(--gap-s);
    color: var(--figma-color-text-secondary);
    letter-spacing: 0.01em;
}

.log-container {
    flex: 1;
    overflow-y: auto;
    background-color: var(--figma-color-bg-secondary);
    border-radius: var(--radius-m);
    padding: var(--gap-m);
    font-size: var(--font-size-s);
    font-family: 'Fira Code', monospace;
    border: 1.5px solid var(--figma-color-border);
    box-shadow: var(--shadow-sm);
    min-height: 100px;
    position: relative;
}

/* Context Menu */
.context-menu {
    position: fixed;
    background-color: var(--figma-color-bg);
    border: 1.5px solid var(--figma-color-border);
    border-radius: var(--radius-m);
    box-shadow: var(--shadow-lg);
    padding: var(--gap-xs);
    z-index: 1000;
    min-width: 120px;
    animation: fadeIn 150ms ease-out;
}

.context-menu-item {
    display: flex;
    align-items: center;
    gap: var(--gap-s);
    padding: var(--gap-s) var(--gap-m);
    font-size: var(--font-size-s);
    font-weight: 500;
    color: var(--figma-color-text);
    background: none;
    border: none;
    border-radius: var(--radius-s);
    cursor: pointer;
    width: 100%;
    text-align: left;
    transition: all var(--transition-rule);
}

.context-menu-item:hover {
    background-color: var(--figma-color-bg-hover);
}

.context-menu-item.danger {
    color: #ef4444;
}

.context-menu-item.danger:hover {
    background-color: rgba(239, 68, 68, 0.1);
}

.log-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    position: relative;
}

.log-clear-btn {
    position: absolute;
    top: 0;
    right: 0;
    padding: 0.5rem;
    z-index: 10;
    cursor: pointer;
    background: none;
    border: none;
    border-radius: 0 var(--radius-m) 0 var(--radius-s);
    color: var(--figma-color-icon-tertiary);
    opacity: 0.6;
    transition: all var(--transition-rule);
    display: flex;
    align-items: center;
    justify-content: center;
}

.log-clear-btn:hover {
    background-color: var(--figma-color-bg-hover);
    color: var(--figma-color-icon);
    opacity: 1;
}

.log-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    position: relative;
}

.log-clear-btn {
    position: absolute;
    top: 0;
    right: 0;
    padding: 0.5rem;
    z-index: 10;
    cursor: pointer;
    background: none;
    border: none;
    border-radius: 0 var(--radius-m) 0 var(--radius-s);
    color: var(--figma-color-icon-tertiary);
    opacity: 0.6;
    transition: all var(--transition-rule);
    display: flex;
    align-items: center;
    justify-content: center;
}

.log-clear-btn:hover {
    background-color: var(--figma-color-bg-hover);
    color: var(--figma-color-icon);
    opacity: 1;
}

.log-entry {
    padding: var(--gap-xs) 0;
    display: flex;
    gap: var(--gap-s);
    align-items: flex-start;
    animation: fadeIn 200ms ease-out;
}

.log-time {
    color: var(--figma-color-text-tertiary);
    min-width: 70px;
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

.footer {
    margin-top: auto;
    font-size: var(--font-size-s);
    color: var(--figma-color-text-tertiary);
    text-align: center;
    padding: var(--gap-s) 0;
}

.resizer {
    position: fixed;
    right: 0;
    bottom: 0;
    padding: 0.5rem;
    z-index: 1;
    cursor: nwse-resize;
    transition: all var(--transition-rule);
    border-radius: var(--radius-m) 0 0 0;
}

.resizer svg {
    transition: all var(--transition-rule);
    color: var(--figma-color-icon-tertiary);
    opacity: 0.6;
}

.resizer:hover {
    background-color: var(--figma-color-bg-hover);
}

.resizer:hover svg {
    color: var(--figma-color-icon-secondary);
    stroke-width: 2.5px;
    opacity: 1;
    transform: scale(1.1);
}

.resizer:active svg {
    transform: scale(0.95);
}
`;

// Inject styles into document head
const styleSheet = document.createElement("style");
styleSheet.textContent = globalStyles;
document.head.appendChild(styleSheet);

// ============================================================================
// Types
// ============================================================================

type PluginMode = "editing" | "creating" | "context" | "misc";

interface LogEntry {
    id: number;
    timestamp: Date;
    type: "info" | "success" | "error" | "received" | "sent";
    message: string;
}

// ============================================================================
// WebSocket Connection
// ============================================================================

const WS_URL = "ws://localhost:9000";

// ============================================================================
// Mode Icons (SVG components matching source plugin style)
// ============================================================================

const EditingIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 16 16">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.5 5.5L5 3l2.5 2.5m3.5-2.5l2.5 2.5L11 8M5 11l-2.5 2.5L5 16m6-2.5L13.5 16 16 13.5" opacity="0.5" />
        <rect width="5" height="5" x="5.5" y="5.5" stroke="currentColor" strokeWidth="1.5" rx="0.5" />
    </svg>
);

const CreatingIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 16 16">
        <path stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" d="M8 3v10M3 8h10" />
        <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
    </svg>
);

const ContextIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 16 16">
        <circle cx="7" cy="7" r="4.25" stroke="currentColor" strokeWidth="1.5" />
        <path stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" d="M10.5 10.5L14 14" opacity="0.5" />
    </svg>
);

const MiscIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 16 16">
        <path stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" d="M8 3v2M8 11v2M3 8h2M11 8h2" opacity="0.5" />
        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
);

// ============================================================================
// Main App Component
// ============================================================================

function App() {
    const [mode, setMode] = useState<PluginMode>("editing");
    const [connected, setConnected] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);

    const wsRef = useRef<WebSocket | null>(null);
    const logIdRef = useRef(0);
    const logContainerRef = useRef<HTMLDivElement>(null);

    // Add log entry
    const log = (type: LogEntry["type"], message: string) => {
        setLogs((prev) => [
            ...prev.slice(-99), // Keep last 100 entries
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

    // Clear logs function
    const clearLogs = () => {
        setLogs([]);
    };

    // Connect to MCP Server
    useEffect(() => {
        let ws: WebSocket | null = null;
        let reconnectTimeout: number | null = null;

        const connect = () => {
            log("info", `Connecting to ${WS_URL}...`);
            ws = new WebSocket(WS_URL);
            wsRef.current = ws;

            ws.onopen = () => {
                setConnected(true);
                log("success", "Connected to MCP Server");
                // Send current mode
                ws?.send(JSON.stringify({ type: "mode_update", mode }));
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    log("received", `${data.type}: ${data.requestId?.slice(0, 8)}...`);

                    // Forward to plugin main thread
                    parent.postMessage({ pluginMessage: data }, "*");
                } catch (error) {
                    log("error", `Parse error: ${error}`);
                }
            };

            ws.onclose = () => {
                setConnected(false);
                log("info", "Disconnected. Reconnecting in 3s...");
                wsRef.current = null;
                reconnectTimeout = window.setTimeout(connect, 3000);
            };

            ws.onerror = (error) => {
                log("error", `WebSocket error: ${error}`);
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

            log("sent", `${msg.type}: ${msg.requestId?.slice(0, 8)}...`);

            // Forward to MCP Server
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify(msg));
            }
        };

        window.addEventListener("message", handler);
        return () => window.removeEventListener("message", handler);
    }, []);

    // Mode change handler
    const handleModeChange = (newMode: PluginMode) => {
        setMode(newMode);
        log("info", `Mode changed to: ${newMode}`);

        // Notify main thread
        parent.postMessage({ pluginMessage: { type: "mode_change", mode: newMode } }, "*");

        // Notify MCP Server
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "mode_update", mode: newMode }));
        }
    };

    const modes: { value: PluginMode; icon: React.ReactNode; label: string }[] = [
        { value: "editing", icon: <EditingIcon />, label: "Editing" },
        { value: "creating", icon: <CreatingIcon />, label: "Creating" },
        { value: "context", icon: <ContextIcon />, label: "Context" },
        { value: "misc", icon: <MiscIcon />, label: "Misc" },
    ];

    return (
        <div className="container">
            {/* Header */}
            <div className="header">
                <h2 className="title">Figma IDE Bridge</h2>
                <div className={`status-badge ${connected ? 'status-connected' : 'status-disconnected'}`}>
                    {connected ? "● Connected" : "○ Disconnected"}
                </div>
            </div>

            {/* Mode Selector - Segmented Tabs */}
            <div className="form-item">
                <label>Mode</label>
                <div className="segmented" data-selected={mode}>
                    {modes.map((m) => (
                        <button
                            key={m.value}
                            type="button"
                            className={`segmented-option ${mode === m.value ? 'selected' : ''}`}
                            onClick={() => handleModeChange(m.value)}
                        >
                            {m.icon}
                            <div className="tooltip">{m.label}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Mode Description */}
            <div className="mode-description">{getModeDescription(mode)}</div>

            {/* Activity Log */}
            <div className="log-section">
                <div className="log-header">Activity Log</div>
                <div className="log-wrapper">
                    <div
                        className="log-container"
                        ref={logContainerRef}
                    >
                        {logs.length === 0 ? (
                            <div style={{ color: 'var(--figma-color-text-tertiary)', fontStyle: 'italic' }}>
                                No activity yet...
                            </div>
                        ) : (
                            logs.map((entry) => (
                                <div key={entry.id} className="log-entry">
                                    <span className="log-time">
                                        {entry.timestamp.toLocaleTimeString()}
                                    </span>
                                    <span className={`log-message log-${entry.type}`}>
                                        {entry.message}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                    {/* Floating Clear Button */}
                    <button
                        className="log-clear-btn"
                        onClick={clearLogs}
                        title="Clear Log"
                    >
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2.5 4.5H13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            <path d="M11.5 4.5V3.5C11.5 2.94772 11.0523 2.5 10.5 2.5H5.5C4.94772 2.5 4.5 2.94772 4.5 3.5V4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            <path d="M5.5 4.5V12.5C5.5 13.0523 5.94772 13.5 6.5 13.5H9.5C10.0523 13.5 10.5 13.0523 10.5 12.5V4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>
            </div>


            {/* Resizer */}
            <Resizer />
        </div>
    );
}

// ============================================================================
// Resizer Component
// ============================================================================

function Resizer() {
    const resizerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const resizer = resizerRef.current;
        if (!resizer) return;

        let width = window.innerWidth;
        let height = window.innerHeight;
        let pointerDownCursorPosition: { x: number; y: number } | null = null;

        const handlePointerDown = (event: PointerEvent) => {
            pointerDownCursorPosition = {
                x: event.offsetX,
                y: event.offsetY
            };
            resizer.setPointerCapture(event.pointerId);
        };

        const handlePointerUp = (event: PointerEvent) => {
            pointerDownCursorPosition = null;
            resizer.releasePointerCapture(event.pointerId);
            parent.postMessage({
                pluginMessage: {
                    type: 'saveSize', message: { width, height }
                }
            }, '*');
        };

        const handlePointerMove = (event: PointerEvent) => {
            if (pointerDownCursorPosition === null) return;

            width = Math.round(
                event.clientX +
                (resizer.offsetWidth - pointerDownCursorPosition.x)
            );
            height = Math.round(
                event.clientY +
                (resizer.offsetHeight - pointerDownCursorPosition.y)
            );

            parent.postMessage({
                pluginMessage: {
                    type: 'resize', message: { width, height }
                }
            }, '*');
        };

        const handleDblClick = () => {
            parent.postMessage({
                pluginMessage: { type: 'defaultSize' }
            }, '*');
        };

        resizer.addEventListener('pointerdown', handlePointerDown);
        resizer.addEventListener('pointerup', handlePointerUp);
        resizer.addEventListener('pointermove', handlePointerMove);
        resizer.addEventListener('dblclick', handleDblClick);

        return () => {
            resizer.removeEventListener('pointerdown', handlePointerDown);
            resizer.removeEventListener('pointerup', handlePointerUp);
            resizer.removeEventListener('pointermove', handlePointerMove);
            resizer.removeEventListener('dblclick', handleDblClick);
        };
    }, []);

    return (
        <div className="resizer" ref={resizerRef}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" xmlns="http://www.w3.org/2000/svg">
                <path d="M5.84701 13.6252C7.71212 13.1254 9.41282 12.1435 10.7782 10.7782C12.1435 9.41282 13.1254 7.71212 13.6252 5.84701" />
            </svg>
        </div>
    );
}

// ============================================================================
// Helpers
// ============================================================================

function getModeDescription(mode: PluginMode): string {
    switch (mode) {
        case "editing":
            return "Focus on modifying properties of selected nodes. Ideal for styling, renaming, and repositioning.";
        case "creating":
            return "Focus on generating new layers, components, and pages. Prioritizes local styles and variables.";
        case "context":
            return "Focus on reading and scanning the document. Returns layer trees and metadata without modification.";
        case "misc":
            return "General utility tasks like exporting, plugin state management, and diagnostics.";
    }
}

// ============================================================================
// Render
// ============================================================================

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App />);
