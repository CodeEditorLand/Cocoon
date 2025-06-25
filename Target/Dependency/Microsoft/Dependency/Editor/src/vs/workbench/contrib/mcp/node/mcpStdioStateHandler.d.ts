import { ChildProcessWithoutNullStreams } from 'child_process';
import { IDisposable } from '../../../../base/common/lifecycle.js';
/**
 * Manages graceful shutdown of MCP stdio connections following the MCP specification.
 *
 * Per spec, shutdown should:
 * 1. Close the input stream to the child process
 * 2. Wait for the server to exit, or send SIGTERM if it doesn't exit within 10 seconds
 * 3. Send SIGKILL if the server doesn't exit within 10 seconds after SIGTERM
 * 4. Allow forceful killing if called twice
 */
export declare class McpStdioStateHandler implements IDisposable {
    private readonly _child;
    private readonly _graceTimeMs;
    private static readonly GRACE_TIME_MS;
    private _procState;
    private _nextTimeout?;
    get stopped(): boolean;
    constructor(_child: ChildProcessWithoutNullStreams, _graceTimeMs?: number);
    /**
     * Initiates graceful shutdown. If called while shutdown is already in progress,
     * forces immediate termination.
     */
    stop(): void;
    private killPolite;
    private killForceful;
    write(message: string): void;
    dispose(): void;
}
