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
 * FUTURE: Process pool - implement worker thread pool for frequent spawns
 * FUTURE: Process tree - track parent-child relationships with pid mapping
 * FUTURE: Windows job objects - use win32 api for process group management
 * FUTURE: macOS Launch Services - use NSRunningApplication for monitoring
 * FUTURE: Linux namespaces - use /proc/[pid]/ns for namespace detection
 * DEPENDENCY: Mountain ProcessInfo/ProcessConfig DTOs - pending backend
 * DEPENDENCY: Wind Effect-TS Process service - integrate with Wind
 * SECURITY: Sandboxing - use chroot, seccomp, or sandbox-js
 * SECURITY: Whitelist - validate against allowed executables list
 * PERFORMANCE: Metrics - use pidusage or native os module for stats
 * LOGGING: Buffer output - use RingBuffer for process stdout/stderr
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
	status: "running" | "stopped" | "error";
	exitCode: number | null;
	signal: NodeJS.Signals | null;
	parentPid?: number;
}

/**
 * Process signal
 */
export enum ProcessSignal {
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
	SIGUNUSED = "SIGUNUSED",
}

/**
 * Default process configuration
 */
export const DEFAULT_TIMEOUT = 30000;
export const DEFAULT_MAX_BUFFER = 1024 * 1024; // 1MB
export const DEFAULT_HEARTBEAT_INTERVAL = 5000;
export const DEFAULT_KILL_TIMEOUT = 5000;
export const DEFAULT_MAX_RESTARTS = 3;
export const DEFAULT_RESTART_DELAY = 1000;

/**
 * Process registry for tracking managed processes
 */
const ProcessRegistry = new Map<number, ProcessInfo>();

/**
 * Check if child_process module is available
 */
function IsChildProcessAvailable(): boolean {
	try {
		return typeof require === "function" && require("child_process");
	} catch {
		return false;
	}
}

/**
 * Get child_process module
 */
function GetChildProcessModule(): any {
	if (!IsChildProcessAvailable()) {
		return null;
	}
	try {
		return require("child_process");
	} catch {
		return null;
	}
}

/**
 * Validate command for security
 */
export function ValidateCommand(command: string): boolean {
	if (!command || typeof command !== "string") {
		return false;
	}

	const trimmed = command.trim();
	if (trimmed === "") {
		return false;
	}

	// Check for suspicious patterns
	const dangerousPatterns = [
		/;\s*\w/, // Command chaining
		/\|\s*\w/, // Pipe chaining
		/&&\s*\w/, // AND operator
		/\|\|\s*\w/, // OR operator
		/>\s*\/dev/, // Redirect output
		/>\s*\/tmp/, // Write to temp
		/`[^`]*`/, // Command substitution
		/\$\(.*,?\)/, // Command substitution
		/\/\.\.\/|\\\\\\.\\/, // Path traversal
		/rm\s+-rf/, // Dangerous command
	];

	for (const pattern of dangerousPatterns) {
		if (pattern.test(command)) {
			return false;
		}
	}

	return true;
}

/**
 * Validate arguments for security
 */
export function ValidateArgs(args: string[]): boolean {
	if (!Array.isArray(args)) {
		return false;
	}

	const dangerousPatterns = [
		/;\s*\w/,
		/`\s*[^`]*`/,
		/\$\s*\(\s*[^)]*\)/,
		/>\s*\//,
		/>\s*\w/,
	];

	for (const arg of args) {
		if (!arg || typeof arg !== "string") {
			return false;
		}

		for (const pattern of dangerousPatterns) {
			if (pattern.test(arg)) {
				return false;
			}
		}
	}

	return true;
}

/**
 * Spawn a child process
 */
export async function SpawnProcess(
	command: string,
	args: string[] = [],
	options: ProcessSpawnOptions = {},
): Promise<ProcessInfo | null> {
	// Security validation
	if (!ValidateCommand(command)) {
		console.error("[Process] Invalid command:", command);
		return null;
	}

	if (!ValidateArgs(args)) {
		console.error("[Process] Invalid arguments:", args);
		return null;
	}

	const childProcess = GetChildProcessModule();
	if (!childProcess) {
		console.error("[Process] child_process module not available");
		return null;
	}

	try {
		const spawnOptions: any = {
			cwd: options.cwd,
			env: options.env || GetMergedEnvironment(options.env),
			detached: options.detached || false,
			shell: options.shell || false,
			windowsHide: options.windowsHide !== false,
			stdio: ["pipe", "pipe", "pipe"],
		};

		const childProc = childProcess.spawn(command, args, spawnOptions);

		const processInfo: ProcessInfo = {
			pid: childProc.pid,
			command,
			args,
			cwd: options.cwd || process.cwd(),
			env: options.env || {},
			startTime: Date.now(),
			status: "running",
			exitCode: null,
			signal: null,
			parentPid: process.pid,
		};

		// Register process
		ProcessRegistry.set(childProc.pid, processInfo);

		// Handle exit
		childProc.on(
			"exit",
			(code: number | null, signal: NodeJS.Signals | null) => {
				processInfo.status = "stopped";
				processInfo.exitCode = code;
				processInfo.signal = signal;
				console.log(
					`[Process] Process ${childProc.pid} exited: code=${code}, signal=${signal}`,
				);
			},
		);

		// Handle error
		childProc.on("error", (error: Error) => {
			processInfo.status = "error";
			console.error(`[Process] Process ${childProc.pid} error:`, error);
		});

		console.log(
			`[Process] Spawned process: pid=${childProc.pid}, command=${command}`,
		);
		return processInfo;
	} catch (error) {
		console.error("[Process] Failed to spawn process:", error);
		return null;
	}
}

/**
 * Execute a command and get result
 */
export async function ExecuteCommand(
	command: string,
	args: string[] = [],
	options: ProcessSpawnOptions = {},
): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
	if (!ValidateCommand(command)) {
		throw new Error("Invalid command");
	}

	if (!ValidateArgs(args)) {
		throw new Error("Invalid arguments");
	}

	const childProcess = GetChildProcessModule();
	if (!childProcess) {
		throw new Error("child_process module not available");
	}

	return new Promise((resolve) => {
		const execOptions: any = {
			cwd: options.cwd,
			env: options.env || GetMergedEnvironment(options.env),
			timeout: options.timeout || DEFAULT_TIMEOUT,
			maxBuffer: options.maxBuffer || DEFAULT_MAX_BUFFER,
			windowsHide: options.windowsHide !== false,
			killSignal: "SIGTERM",
		};

		childProcess.execFile(
			command,
			args,
			execOptions,
			(error: any, stdout: string, stderr: string) => {
				if (error) {
					resolve({
						stdout: stdout || "",
						stderr: stderr || error.message || "",
						exitCode: error.code || null,
					});
				} else {
					resolve({
						stdout: stdout || "",
						stderr: stderr || "",
						exitCode: 0,
					});
				}
			},
		);
	});
}

/**
 * Fork a child process
 */
export async function ForkProcess(
	modulePath: string,
	args: string[] = [],
	options: ProcessSpawnOptions = {},
): Promise<ProcessInfo | null> {
	const childProcess = GetChildProcessModule();
	if (!childProcess) {
		console.error("[Process] child_process module not available");
		return null;
	}

	// Validate module path
	if (
		!modulePath ||
		typeof modulePath !== "string" ||
		modulePath.trim() === ""
	) {
		console.error("[Process] Invalid module path");
		return null;
	}

	try {
		const forkOptions: any = {
			cwd: options.cwd,
			env: options.env || GetMergedEnvironment(options.env),
			silent: false,
			windowsHide: options.windowsHide !== false,
		};

		const childProc = childProcess.fork(modulePath, args, forkOptions);

		const processInfo: ProcessInfo = {
			pid: childProc.pid,
			command: "node",
			args: [modulePath, ...args],
			cwd: options.cwd || process.cwd(),
			env: options.env || {},
			startTime: Date.now(),
			status: "running",
			exitCode: null,
			signal: null,
			parentPid: process.pid,
		};

		ProcessRegistry.set(childProc.pid, processInfo);

		childProc.on(
			"exit",
			(code: number | null, signal: NodeJS.Signals | null) => {
				processInfo.status = "stopped";
				processInfo.exitCode = code;
				processInfo.signal = signal;
			},
		);

		console.log(
			`[Process] Forked process: pid=${childProc.pid}, module=${modulePath}`,
		);
		return processInfo;
	} catch (error) {
		console.error("[Process] Failed to fork process:", error);
		return null;
	}
}

/**
 * Send signal to process
 */
export function SendSignal(
	pid: number,
	signal: NodeJS.Signals | string,
): boolean {
	try {
		process.kill(pid, signal);
		return true;
	} catch (error) {
		console.error(
			`[Process] Failed to send signal ${signal} to pid ${pid}:`,
			error,
		);
		return false;
	}
}

/**
 * Terminate process gracefully
 */
export function TerminateProcess(
	pid: number,
	timeout: number = DEFAULT_KILL_TIMEOUT,
): boolean {
	const processInfo = ProcessRegistry.get(pid);
	if (!processInfo) {
		console.warn(`[Process] Process ${pid} not found in registry`);
		return false;
	}

	if (processInfo.status !== "running") {
		console.warn(`[Process] Process ${pid} is not running`);
		return false;
	}

	try {
		// Send SIGTERM first
		if (!SendSignal(pid, ProcessSignal.SIGTERM)) {
			return false;
		}

		// Wait for graceful shutdown
		const startTime = Date.now();
		const checkInterval = setInterval(() => {
			const updatedInfo = ProcessRegistry.get(pid);
			if (!updatedInfo || updatedInfo.status !== "running") {
				clearInterval(checkInterval);
				return;
			}

			if (Date.now() - startTime > timeout) {
				clearInterval(checkInterval);
				// Force kill if not terminated
				SendSignal(pid, ProcessSignal.SIGKILL);
			}
		}, 100);

		return true;
	} catch (error) {
		console.error(`[Process] Failed to terminate process ${pid}:`, error);
		return false;
	}
}

/**
 * Kill process immediately
 */
export function KillProcess(pid: number): boolean {
	const processInfo = ProcessRegistry.get(pid);
	if (!processInfo) {
		console.warn(`[Process] Process ${pid} not found in registry`);
		return false;
	}

	if (!SendSignal(pid, ProcessSignal.SIGKILL)) {
		return false;
	}

	console.log(`[Process] Killed process ${pid}`);
	return true;
}

/**
 * Get process information by PID
 */
export function GetProcess(pid: number): Option.Option<ProcessInfo> {
	const processInfo = ProcessRegistry.get(pid);
	return processInfo ? Option.some(processInfo) : Option.none();
}

/**
 * Get all managed processes
 */
export function GetAllProcesses(): ProcessInfo[] {
	return Array.from(ProcessRegistry.values());
}

/**
 * Get running processes
 */
export function GetRunningProcesses(): ProcessInfo[] {
	return Array.from(ProcessRegistry.values()).filter(
		(p) => p.status === "running",
	);
}

/**
 * Get stopped processes
 */
export function GetStoppedProcesses(): ProcessInfo[] {
	return Array.from(ProcessRegistry.values()).filter(
		(p) => p.status === "stopped" || p.status === "error",
	);
}

/**
 * Unregister process
 */
export function UnregisterProcess(pid: number): boolean {
	return ProcessRegistry.delete(pid);
}

/**
 * Clean up all processes
 */
export function CleanupAllProcesses(): void {
	const processes = GetRunningProcesses();
	for (const procInfo of processes) {
		console.log(`[Process] Cleaning up process ${procInfo.pid}`);
		KillProcess(procInfo.pid);
	}
	ProcessRegistry.clear();
}

/**
 * Get merged environment
 */
function GetMergedEnvironment(
	additionalEnv?: Record<string, string>,
): Record<string, string> {
	const env: Record<string, string> = {};

	// Copy process.env values, handling undefined
	if (typeof process !== "undefined" && process.env) {
		for (const [key, value] of Object.entries(process.env)) {
			if (value !== undefined) {
				env[key] = value;
			}
		}
	}

	if (additionalEnv) {
		for (const [key, value] of Object.entries(additionalEnv)) {
			if (value !== undefined) {
				env[key] = value;
			}
		}
	}

	return env;
}

/**
 * Monitor process health
 */
export async function MonitorProcess(
	pid: number,
	options: ProcessMonitorOptions = {},
): Promise<boolean> {
	const processInfo = ProcessRegistry.get(pid);
	if (!processInfo) {
		return false;
	}

	const heartbeatInterval =
		options.heartbeatInterval || DEFAULT_HEARTBEAT_INTERVAL;
	const killTimeout = options.killTimeout || DEFAULT_KILL_TIMEOUT;

	return new Promise((resolve) => {
		const interval = setInterval(() => {
			const updatedInfo = ProcessRegistry.get(pid);
			if (!updatedInfo) {
				clearInterval(interval);
				resolve(false);
				return;
			}

			if (updatedInfo.status !== "running") {
				clearInterval(interval);
				resolve(updatedInfo.status === "stopped");
				return;
			}
		}, heartbeatInterval);

		// Auto-kill after timeout
		setTimeout(() => {
			clearInterval(interval);
			if (ProcessRegistry.has(pid)) {
				TerminateProcess(pid, killTimeout);
			}
			resolve(false);
		}, killTimeout * 10);
	});
}

/**
 * Check if process is running
 */
export function IsProcessRunning(pid: number): boolean {
	try {
		// Send signal 0 to check if process exists
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

/**
 * Get current process ID
 */
export function GetCurrentPid(): number {
	return process.pid;
}

/**
 * Get parent process ID
 */
export function GetParentPid(): number {
	return process.ppid;
}

/**
 * Effect-TS: Spawn process as Effect
 */
export function SpawnProcessEffect(
	command: string,
	args: string[],
	options: ProcessSpawnOptions,
): Effect.Effect<ProcessInfo | null, Error> {
	return Effect.tryPromise({
		try: () => SpawnProcess(command, args, options),
		catch: (error) => new Error(`Failed to spawn process: ${error}`),
	});
}

/**
 * Effect-TS: Execute command as Effect
 */
export function ExecuteCommandEffect(
	command: string,
	args: string[],
	options: ProcessSpawnOptions = {},
): Effect.Effect<
	{ stdout: string; stderr: string; exitCode: number | null },
	Error
> {
	return Effect.tryPromise({
		try: () => ExecuteCommand(command, args, options),
		catch: (error) => new Error(`Failed to execute command: ${error}`),
	});
}

/**
 * Effect-TS: Send signal as Effect
 */
export function SendSignalEffect(
	pid: number,
	signal: NodeJS.Signals,
): Effect.Effect<void, Error> {
	return Effect.try(() => {
		if (!SendSignal(pid, signal)) {
			throw new Error(
				`Failed to send signal ${signal} to process ${pid}`,
			);
		}
	});
}

/**
 * Effect-TS: Get process info as Effect
 */
export function GetProcessEffect(
	pid: number,
): Effect.Effect<Option.Option<ProcessInfo>> {
	return Effect.sync(() => GetProcess(pid));
}

/**
 * Export process module
 */
export const Process = {
	ValidateCommand,
	ValidateArgs,
	SpawnProcess,
	ExecuteCommand,
	ForkProcess,
	SendSignal,
	TerminateProcess,
	KillProcess,
	GetProcess,
	GetAllProcesses,
	GetRunningProcesses,
	GetStoppedProcesses,
	UnregisterProcess,
	CleanupAllProcesses,
	MonitorProcess,
	IsProcessRunning,
	GetCurrentPid,
	GetParentPid,
};

/**
 * Export constants
 */
export const ProcessConstants = {
	DEFAULT_TIMEOUT,
	DEFAULT_MAX_BUFFER,
	DEFAULT_HEARTBEAT_INTERVAL,
	DEFAULT_KILL_TIMEOUT,
	DEFAULT_MAX_RESTARTS,
	DEFAULT_RESTART_DELAY,
};
