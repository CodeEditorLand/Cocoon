/*---------------------------------------------------------------------------------------------
 * Cocoon Managed Sockets Shim (managed-sockets-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a basic stub implementation for the `IExtHostManagedSockets` service.
 * In a full VS Code environment, this service plays a critical role in scenarios
 * involving remote development, port forwarding, and tunneling. It allows extensions
 * to create and interact with network sockets whose lifecycle and underlying transport
 * are managed by the editor.
 *
 * For Cocoon's MVP (Minimum Viable Product), full managed socket functionality is
 * considered out of scope due to its complexity. This shim provides the API surface
 * for type compatibility. Most methods are No-Operations (NOPs) or throw errors
 * indicating that the functionality is not supported in Cocoon.
 *
 * Responsibilities (as a stub):
 * - Implementing the `IExtHostManagedSockets` interface with NOPs or error-throwing stubs.
 * - Logging warnings when its methods are called.
 * - Providing a NOP `onDidResurrectConnection` event.
 * - Implementing RPC stubs for methods expected in `ExtHostManagedSocketsShape`
 *   (called by `MainThreadManagedSockets`), primarily for contract definition and logging.
 *
 * Key Interactions:
 * - Registered with DI in `Cocoon/index.ts`.
 * - In a full implementation, would interact with `MainThreadManagedSockets` via RPC.
 * - Uses `BaseCocoonShim` for logging.
 *
 * TODO (Major Features for Full Implementation):
 * - Implement RPC proxy to `MainThreadManagedSocketsShape`.
 * - Implement `connectPort` and `createServer` by making RPC calls to MainThread.
 * - Manage local representations of managed sockets (e.g., `NodeJS.Socket`-like emitters)
 *   keyed by handles received from MainThread.
 * - Implement full `ExtHostManagedSocketsShape` RPC methods to handle data (`$onSocketOutput`),
 *   close (`$onSocketClose`), end (`$onSocketEnd`), new connections (`$onServerSocketConnection`),
 *   and other lifecycle events from MainThread, piping them to the correct local socket representation.
 * - Handle `setTunnelSocket` for port forwarding scenarios.
 * - Implement `writeSocket`, `endSocket` by RPCing to MainThread.
 * - Implement `getSocket` if direct access to underlying local sockets is feasible.
 * - Fire `onDidResurrectConnection` based on MainThread notifications.
 *--------------------------------------------------------------------------------------------*/

import type { VSBuffer } from "vs/base/common/buffer";
import type { SerializedError } from "vs/base/common/errors"; // For $onSocketClose error type
import { Event as VscodeEvent } from "vs/base/common/event"; // For VscodeEvent.None

import {
	// ExtHostContext, // If registering as RPC target
	// MainContext, // If getting proxy
	type ExtHostManagedSocketsShape as VscodeExtHostManagedSocketsShape, // RPC shape this service implements
	// type MainThreadManagedSocketsShape as VscodeMainThreadManagedSocketsShape, // Proxy type
} from "vs/workbench/api/common/extHost.protocol";
import type {
	IExtHostManagedSockets as VscodeIExtHostManagedSockets,
	// ManagedSocketContext, // DTO for context in some MainThread calls
	// SocketDetails, // DTO for socket info
	// SocketOptions, ServerListenOptions // DTOs for creation options
} from "vs/workbench/api/common/extHostManagedSockets";

import {
	BaseCocoonShim,
	// refineErrorForShim, // If handling RPC errors from MainThread
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	// type ProxyIdentifier, // If getting proxy
} from "./_baseShim";

/** Cocoon's stub implementation of `IExtHostManagedSockets`. */
export class ShimExtHostManagedSockets
	extends BaseCocoonShim
	implements VscodeIExtHostManagedSockets, VscodeExtHostManagedSocketsShape
{
	// Implements DI interface and RPC target shape
	public readonly _serviceBrand: undefined;
	// private _mainThreadManagedSocketsProxy: VscodeMainThreadManagedSocketsShape | null = null;

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostManagedSockets", rpcService, logService);
		this._logInfo(
			"Initialized (STUBBED implementation). Full managed socket functionality is NOT SUPPORTED.",
		);
		// if (this._rpcService) {
		// this._mainThreadManagedSocketsProxy = this._getProxy(
		// MainContext.MainThreadManagedSockets as ProxyIdentifier<VscodeMainThreadManagedSocketsShape>
		// );
		// this._rpcService.set(ExtHostContext.ExtHostManagedSockets as ProxyIdentifier<VscodeExtHostManagedSocketsShape>, this);
		// }
		// if (!this._mainThreadManagedSocketsProxy) {
		// this._logWarn("MainThreadManagedSockets RPC proxy NOT available. Managed socket features will be non-functional.");
		// }
	}

	protected override _requiresRpc(): boolean {
		return false;
	} // Stub doesn't require RPC

	public get onDidResurrectConnection(): VscodeEvent<number> {
		this._logWarnOnce(
			"STUB: `vscode.env.onDidResurrectConnection` accessed. Returning NOP event.",
		);
		return VscodeEvent.None;
	}

	public connectPort(
		remoteAuthority: string,
		host: string,
		port: number,
		isSSL: boolean,
		_proposedHandle?: number,
	): Promise<number> {
		const errorMessage = `API Not Implemented: Managed Sockets 'connectPort' (remote: '${remoteAuthority}', target: ${host}:${port}, ssl: ${isSSL}) is not supported in Cocoon.`;
		this._logError(errorMessage);
		return Promise.reject(new Error(errorMessage));
	}

	public createServer(
		remoteAuthority: string,
		host: string,
		port: number,
		isSSL: boolean,
		_proposedHandle?: number,
		_options?: any,
	): Promise<number> {
		const errorMessage = `API Not Implemented: Managed Sockets 'createServer' (remote: '${remoteAuthority}', listenOn: ${host}:${port}, ssl: ${isSSL}) is not supported in Cocoon.`;
		this._logError(errorMessage);
		return Promise.reject(new Error(errorMessage));
	}

	public async setTunnelSocket(
		handle: number,
		_socket: any,
		_localHost: string,
		_localPort: number,
	): Promise<void> {
		this._logWarn(
			`STUB: Managed Sockets 'setTunnelSocket(handle: ${handle})' called. NOP.`,
		);
		return Promise.resolve();
	}

	public async disposeSocket(handle: number): Promise<void> {
		this._logWarn(
			`STUB: Managed Sockets 'disposeSocket(handle: ${handle})' called. NOP.`,
		);
		return Promise.resolve();
	}

	public async writeSocket(
		handle: number,
		buffer: VSBuffer,
		_options?: { fin?: boolean },
	): Promise<void> {
		this._logWarn(
			`STUB: Managed Sockets 'writeSocket(handle: ${handle}, bufferLen: ${buffer.byteLength})' called. NOP.`,
		);
		return Promise.resolve();
	}

	public async endSocket(handle: number): Promise<void> {
		this._logWarn(
			`STUB: Managed Sockets 'endSocket(handle: ${handle})' called. NOP.`,
		);
		return Promise.resolve();
	}

	public async getSocket(handle: number): Promise<any | undefined> {
		this._logWarn(
			`STUB: Managed Sockets 'getSocket(handle: ${handle})' called. Returning undefined.`,
		);
		return Promise.resolve(undefined);
	}

	// --- Methods from ExtHostManagedSocketsShape (called BY MainThread) ---
	public async $openRemoteSocket(
		_socketFactoryId: number,
		_req: any /* some DTO */,
	): Promise<number> {
		const message =
			"RPC STUB: $openRemoteSocket called on ExtHostManagedSockets. Not implemented in Cocoon.";
		this._logError(message);
		throw new Error(message);
	}
	public $onSocketOutput(_socketId: number, _data: VSBuffer): void {
		this._logWarnOnce(
			`RPC STUB: $onSocketOutput for socket ${_socketId} - Data ignored (NOP).`,
		);
	}
	public $onSocketClose(_socketId: number, _error?: SerializedError): void {
		this._logWarnOnce(
			`RPC STUB: $onSocketClose for socket ${_socketId} - Close signal ignored (NOP).`,
		);
	}
	public $onSocketEnd(_socketId: number): void {
		this._logWarnOnce(
			`RPC STUB: $onSocketEnd for socket ${_socketId} - End signal ignored (NOP).`,
		);
	}
	public async $onSocketDrain(_socketId: number): Promise<void> {
		this._logWarnOnce(
			`RPC STUB: $onSocketDrain for socket ${_socketId} - Drain signal processed as NOP.`,
		);
		return Promise.resolve();
	}
	public async $onServerSocketConnection(
		_requestId: number,
		_initialDataChunk: VSBuffer,
		_socketId: number,
	): Promise<void> {
		this._logWarnOnce(
			`RPC STUB: $onServerSocketConnection for request ${_requestId} - New server socket connection ignored (NOP).`,
		);
	}
	public async $onDidAcceptNewSocket(
		_socketId: number,
		_initialDataChunk: VSBuffer,
		_socketListenId: number,
	): Promise<void> {
		this._logWarnOnce(
			`RPC STUB: $onDidAcceptNewSocket for socket ${_socketId} - New accepted socket ignored (NOP).`,
		);
	}

	public override dispose(): void {
		super.dispose();
		this._logInfo("Disposed.");
	}
}
