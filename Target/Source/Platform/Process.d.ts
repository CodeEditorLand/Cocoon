/**
 * @file Process Management
 * @description
 * Provides comprehensive process management capabilities for Cocoon.
 * Creates, monitors, and manages child processes with security checks,
 * resource limits, and proper cleanup for all supported platforms.
 *
 * **Responsibilities:**
 * - Spawn child processes with security validation
 * - Fork processes (where supported)
 * - Send signals to processes (SIGTERM, SIGKILL, etc.)
 * - Monitor process lifecycle and exit codes
 * - Manage process input/output streams
 * - Enforce resource limits and timeouts
 * - Handle process cleanup and orphan prevention
 *
 * **Element Connections:**
 * - **Air**: Rust workbench may spawn compilation processes and toolchains
 * - **Wind**: Effect-TS services need process utilities for async operations
 * - **Mountain**: Process data converts to Mountain DTOs for Tauri backend
 * - **Output**: References Node.js child_process patterns and VSCode process handling
 *
 * **TODOs:**
 * - TODO: Implement process pool management for resource efficiency
 * - TODO: Add process tree visualization and dependency tracking
 * - TODO: Implement Windows-specific process handling (job objects, process groups)
 * - TODO: Add macOS-specific process monitoring (Launch Services integration)
 * - TODO: Implement Linux process namespace and cgroup support
 * - TODO: Mountain: Define ProcessInfo, ProcessConfig DTOs for backend
 * - TODO: Wind: Create Effect-TS Process service with streaming support
 * - TODO: Security: Add process sandboxing and privilege dropping
 * - TODO: Security: Implement process whitelist/blacklist for execution
 * - TODO: Performance: Add process metrics collection (CPU, memory, I/O)
 * - TODO: Logging: Capture and buffer process output with structured logging
 */
import { Effect, Option } from "effect";
/**
 * Process exit status
 */
export interface ProcessExitStatus {
    code: number | null;
    signal: NodeJS.Signals | null;
    timedOut: boolean;
}
/**
 * Process spawn options
 */
export interface ProcessSpawnOptions {
    cwd?: string;
    env?: Record<string, string>;
    detached?: boolean;
    shell?: boolean | string;
    windowsHide?: boolean;
    timeout?: number;
    maxBuffer?: number;
    uid?: number;
    gid?: number;
}
/**
 * Process monitoring options
 */
export interface ProcessMonitorOptions {
    heartbeatInterval?: number;
    killTimeout?: number;
    autoRestart?: boolean;
    maxRestarts?: number;
    restartDelay?: number;
}
/**
 * Process information
 */
export interface ProcessInfo {
    pid: number;
    command: string;
    args: string[];
    cwd: string;
    env: Record<string, string>;
    startTime: number;
    status: 'running' | 'stopped' | 'error';
    exitCode: number | null;
    signal: NodeJS.Signals | null;
    parentPid?: number;
}
/**
 * Process signal
 */
export declare enum ProcessSignal {
    SIGHUP = "SIGHUP",
    SIGINT = "SIGINT",
    SIGQUIT = "SIGQUIT",
    SIGILL = "SIGILL",
    SIGTRAP = "SIGTRAP",
    SIGABRT = "SIGABRT",
    SIGBUS = "SIGBUS",
    SIGFPE = "SIGFPE",
    SIGKILL = "SIGKILL",
    SIGUSR1 = "SIGUSR1",
    SIGSEGV = "SIGSEGV",
    SIGUSR2 = "SIGUSR2",
    SIGPIPE = "SIGPIPE",
    SIGALRM = "SIGALRM",
    SIGTERM = "SIGTERM",
    SIGCHLD = "SIGCHLD",
    SIGCONT = "SIGCONT",
    SIGSTOP = "SIGSTOP",
    SIGTSTP = "SIGTSTP",
    SIGTTIN = "SIGTTIN",
    SIGTTOU = "SIGTTOU",
    SIGURG = "SIGURG",
    SIGXCPU = "SIGXCPU",
    SIGXFSZ = "SIGXFSZ",
    SIGVTALRM = "SIGVTALRM",
    SIGPROF = "SIGPROF",
    SIGWINCH = "SIGWINCH",
    SIGIO = "SIGIO",
    SIGPOLL = "SIGPOLL",
    SIGPWR = "SIGPWR",
    SIGSYS = "SIGSYS",
    SIGSTKFLT = "SIGSTKFLT",
    SIGUNUSED = "SIGUNUSED"
}
/**
 * Default process configuration
 */
export declare const DEFAULT_TIMEOUT = 30000;
export declare const DEFAULT_MAX_BUFFER: number;
export declare const DEFAULT_HEARTBEAT_INTERVAL = 5000;
export declare const DEFAULT_KILL_TIMEOUT = 5000;
export declare const DEFAULT_MAX_RESTARTS = 3;
export declare const DEFAULT_RESTART_DELAY = 1000;
/**
 * Validate command for security
 */
export declare function ValidateCommand(command: string): boolean;
/**
 * Validate arguments for security
 */
export declare function ValidateArgs(args: string[]): boolean;
/**
 * Spawn a child process
 */
export declare function SpawnProcess(command: string, args?: string[], options?: ProcessSpawnOptions): Promise<ProcessInfo | null>;
/**
 * Execute a command and get result
 */
export declare function ExecuteCommand(command: string, args?: string[], options?: ProcessSpawnOptions): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number | null;
}>;
/**
 * Fork a child process
 */
export declare function ForkProcess(modulePath: string, args?: string[], options?: ProcessSpawnOptions): Promise<ProcessInfo | null>;
/**
 * Send signal to process
 */
export declare function SendSignal(pid: number, signal: NodeJS.Signals | string): boolean;
/**
 * Terminate process gracefully
 */
export declare function TerminateProcess(pid: number, timeout?: number): boolean;
/**
 * Kill process immediately
 */
export declare function KillProcess(pid: number): boolean;
/**
 * Get process information by PID
 */
export declare function GetProcess(pid: number): Option.Option<ProcessInfo>;
/**
 * Get all managed processes
 */
export declare function GetAllProcesses(): ProcessInfo[];
/**
 * Get running processes
 */
export declare function GetRunningProcesses(): ProcessInfo[];
/**
 * Get stopped processes
 */
export declare function GetStoppedProcesses(): ProcessInfo[];
/**
 * Unregister process
 */
export declare function UnregisterProcess(pid: number): boolean;
/**
 * Clean up all processes
 */
export declare function CleanupAllProcesses(): void;
/**
 * Monitor process health
 */
export declare function MonitorProcess(pid: number, options?: ProcessMonitorOptions): Promise<boolean>;
/**
 * Check if process is running
 */
export declare function IsProcessRunning(pid: number): boolean;
/**
 * Get current process ID
 */
export declare function GetCurrentPid(): number;
/**
 * Get parent process ID
 */
export declare function GetParentPid(): number;
/**
 * Effect-TS: Spawn process as Effect
 */
export declare function SpawnProcessEffect(command: string, args: string[], options: ProcessSpawnOptions): Effect.Effect<ProcessInfo | null, Error>;
/**
 * Effect-TS: Execute command as Effect
 */
export declare function ExecuteCommandEffect(command: string, args: string[], options?: ProcessSpawnOptions): Effect.Effect<{
    stdout: string;
    stderr: string;
    exitCode: number | null;
}, Error>;
/**
 * Effect-TS: Send signal as Effect
 */
export declare function SendSignalEffect(pid: number, signal: NodeJS.Signals): Effect.Effect<void, Error>;
/**
 * Effect-TS: Get process info as Effect
 */
export declare function GetProcessEffect(pid: number): Effect.Effect<Option.Option<ProcessInfo>>;
/**
 * Export process module
 */
export declare const Process: {
    ValidateCommand: typeof ValidateCommand;
    ValidateArgs: typeof ValidateArgs;
    SpawnProcess: typeof SpawnProcess;
    ExecuteCommand: typeof ExecuteCommand;
    ForkProcess: typeof ForkProcess;
    SendSignal: typeof SendSignal;
    TerminateProcess: typeof TerminateProcess;
    KillProcess: typeof KillProcess;
    GetProcess: typeof GetProcess;
    GetAllProcesses: typeof GetAllProcesses;
    GetRunningProcesses: typeof GetRunningProcesses;
    GetStoppedProcesses: typeof GetStoppedProcesses;
    UnregisterProcess: typeof UnregisterProcess;
    CleanupAllProcesses: typeof CleanupAllProcesses;
    MonitorProcess: typeof MonitorProcess;
    IsProcessRunning: typeof IsProcessRunning;
    GetCurrentPid: typeof GetCurrentPid;
    GetParentPid: typeof GetParentPid;
};
/**
 * Export constants
 */
export declare const ProcessConstants: {
    DEFAULT_TIMEOUT: number;
    DEFAULT_MAX_BUFFER: number;
    DEFAULT_HEARTBEAT_INTERVAL: number;
    DEFAULT_KILL_TIMEOUT: number;
    DEFAULT_MAX_RESTARTS: number;
    DEFAULT_RESTART_DELAY: number;
};
//# sourceMappingURL=Process.d.ts.map