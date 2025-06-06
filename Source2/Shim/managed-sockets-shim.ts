/*---------------------------------------------------------------------------------------------
 * Cocoon Managed Sockets Shim 
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
 *
 * Last Reviewed/Updated: Based on latest extraction timestamp.
 *--------------------------------------------------------------------------------------------*/

import type { VSBuffer } from "vs/base/common/buffer";
import type { SerializedError } from "vs/base/common/errors"; // For $onSocketClose error type
import { Event as VscodeEvent } from "vs/base/common/event"; // For VscodeEvent.None

// Import VS Code protocol types for RPC shape implementation
import {
	// ExtHostContext, // Uncomment if registering as RPC target
	// MainContext, // Uncomment if getting proxy to MainThread
	type ExtHostManagedSocketsShape as VscodeExtHostManagedSocketsShape, // RPC shape this service implements
	// type MainThreadManagedSocketsShape as VscodeMainThreadManagedSocketsShape, // Proxy type
} from "vs/workbench/api/common/extHost.protocol";
// Import VS Code service interface for DI and API shape
import type {
	IExtHostManagedSockets as VscodeIExtHostManagedSockets,
	// Other related types from VS Code if used in method signatures, e.g.:
	// ManagedSocketContext, // DTO for context in some MainThread calls
	// SocketDetails, // DTO for socket info
	// SocketOptions, ServerListenOptions // DTOs for creation options
} from "vs/workbench/api/common/extHostManagedSockets";

import {
	BaseCocoonShim,
	// refineErrorForShim, // Uncomment if handling RPC errors from MainThread
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	// type ProxyIdentifier, // Uncomment if getting proxy
} from "./_baseShim";

/**
 * Cocoon's stub implementation of `IExtHostManagedSockets`.
 * Most methods are NOPs or throw errors, indicating the feature is not supported in Cocoon MVP.
 */
export class ShimExtHostManagedSockets
	extends BaseCocoonShim
	implements VscodeIExtHostManagedSockets, VscodeExtHostManagedSocketsShape
{
	// Implements DI interface and RPC target shape (for methods called BY MainThread)
	public readonly _serviceBrand: undefined;
	// private _mainThreadManagedSocketsProxy: VscodeMainThreadManagedSocketsShape | null = null;

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostManagedSockets", rpcService, logService);
		this._logInfo(
			"Initialized (STUBBED implementation). Full managed socket functionality is NOT SUPPORTED in Cocoon MVP.",
		);

		// Example of RPC proxy initialization and self-registration (if this shim were more functional):
		// if (this._rpcService) {
		//     this._mainThreadManagedSocketsProxy = this._getProxy(
		//         MainContext.MainThreadManagedSockets as ProxyIdentifier<VscodeMainThreadManagedSocketsShape>
		//     );
		//     try {
		//         this._rpcService.set(ExtHostContext.ExtHostManagedSockets as ProxyIdentifier<VscodeExtHostManagedSocketsShape>, this);
		//         this._logInfo("Registered self for RPC calls from MainThread (ExtHostManagedSockets).");
		//     } catch (e:any) {
		//         this._logError("Failed to register self as RPC target for ExtHostManagedSockets:", e);
		//     }
		// }
		// if (!this._mainThreadManagedSocketsProxy) {
		//     this._logWarn("MainThreadManagedSockets RPC proxy NOT available. All managed socket features will be non-functional.");
		// }
	}

	/**
	 * This shim, in its current stubbed form, does not require RPC for its implemented (stubbed) methods.
	 */
	protected override _requiresRpc(): boolean {
		return false;
	}

	// --- IExtHostManagedSockets Implementation (Stubs for MVP) ---

	/**
	 * Event that fires when a previously disconnected managed socket connection is "resurrected".
	 * This is a No-Operation (NOP) event in the current stub implementation.
	 */
	public get onDidResurrectConnection(): VscodeEvent<number> {
		// Event payload is the socket handle (number)
		this._logWarnOnce(
			"API STUB: `vscode.env.onDidResurrectConnection` accessed. Returning a NOP event (VscodeEvent.None).",
		);
		return VscodeEvent.None;
	}

	/**
	 * Attempts to establish a managed socket connection to a port on a specified remote host.
	 * This functionality is not supported in Cocoon MVP and will throw an error.
	 */
	public connectPort(
		remoteAuthority: string,
		host: string,
		port: number,
		isSSL: boolean,
		_proposedHandle?: number, // _proposedHandle is often for internal VS Code use or specific scenarios
	): Promise<number /* The socket handle */> {
		const errorMessage = `API Not Implemented: Managed Sockets 'connectPort' (remote: '${remoteAuthority}', target: ${host}:${port}, ssl: ${isSSL}) is not supported in this version of Cocoon.`;
		this._logError(errorMessage);
		return Promise.reject(new Error(errorMessage));
	}

	/**
	 * Attempts to create a managed server socket listening on a port on a specified remote host.
	 * This functionality is not supported in Cocoon MVP and will throw an error.
	 */
	public createServer(
		remoteAuthority: string,
		host: string,
		port: number,
		isSSL: boolean,
		_proposedHandle?: number,
		_options?: any, // e.g., ServerListenOptions, currently unused in stub
	): Promise<number /* The server socket handle */> {
		const errorMessage = `API Not Implemented: Managed Sockets 'createServer' (remote: '${remoteAuthority}', listenOn: ${host}:${port}, ssl: ${isSSL}) is not supported in this version of Cocoon.`;
		this._logError(errorMessage);
		return Promise.reject(new Error(errorMessage));
	}

	/**
	 * Associates a locally created Node.js socket with a managed tunnel, identified by its handle.
	 * This is a No-Operation (NOP) in the current stub implementation.
	 */
	public async setTunnelSocket(
		handle: number,
		_socket: any /* net.Socket | NodeJsSocket - the actual socket object */,
		_localHost: string, // Hostname of the local side of the tunnel
		_localPort: number, // Port number of the local side of the tunnel
	): Promise<void> {
		this._logWarn(
			`API STUB: Managed Sockets 'setTunnelSocket(handle: ${handle})' called. This is a No-Operation.`,
		);
		return Promise.resolve();
	}

	/**
	 * Disposes of a managed socket, closing the connection and releasing associated resources.
	 * This is a No-Operation (NOP) in the current stub implementation.
	 */
	public async disposeSocket(handle: number): Promise<void> {
		this._logWarn(
			`API STUB: Managed Sockets 'disposeSocket(handle: ${handle})' called. This is a No-Operation.`,
		);
		return Promise.resolve();
	}

	/**
	 * Writes data (as a `VSBuffer`) to a managed socket.
	 * This is a No-Operation (NOP) in the current stub implementation.
	 */
	public async writeSocket(
		handle: number,
		buffer: VSBuffer,
		_options?: { fin?: boolean | undefined } | undefined, // Options for the write, e.g., if it's the final segment
	): Promise<void> {
		this._logWarn(
			`API STUB: Managed Sockets 'writeSocket(handle: ${handle}, bufferLen: ${buffer.byteLength})' called. This is a No-Operation.`,
		);
		return Promise.resolve();
	}

	/**
	 * Signals that no more data will be written to the managed socket from the caller's side.
	 * This is a No-Operation (NOP) in the current stub implementation.
	 */
	public async endSocket(handle: number): Promise<void> {
		this._logWarn(
			`API STUB: Managed Sockets 'endSocket(handle: ${handle})' called. This is a No-Operation.`,
		);
		return Promise.resolve();
	}

	/**
	 * Retrieves the underlying local Node.js socket associated with a managed socket handle.
	 * Returns `undefined` in the current stub implementation.
	 */
	public async getSocket(
		handle: number,
	): Promise<any /* net.Socket | NodeJsSocket */ | undefined> {
		this._logWarn(
			`API STUB: Managed Sockets 'getSocket(handle: ${handle})' called. Returning undefined.`,
		);
		return Promise.resolve(undefined);
	}

	// --- Methods from ExtHostManagedSocketsShape (called BY MainThread) ---
	// These stubs fulfill the RPC contract if MainThread were to call them.

	/**
	 * (RPC Stub) Called by MainThread to request the ExtHost to open a remote socket
	 * via a registered socket factory (which is not implemented in this shim).
	 * Throws an error to indicate it's not implemented.
	 */
	public async $openRemoteSocket(
		_socketFactoryId: number,
		_req: any /* DTO for remoteExtensionsUtil.Request */,
	): Promise<number> {
		const message =
			"RPC STUB: $openRemoteSocket called on ExtHostManagedSockets. This functionality is not implemented in Cocoon's current shim.";
		this._logError(message); // Log as error because it's an incoming RPC call for unimplemented feature
		throw new Error(message);
	}

	/** (RPC Stub) Called by MainThread to deliver data received on a managed socket. NOP. */
	public $onSocketOutput(_socketId: number, _data: VSBuffer): void {
		this._logWarnOnce(
			`RPC STUB: $onSocketOutput received for socket ${_socketId}. Data ignored (No-Operation).`,
		);
	}

	/** (RPC Stub) Called by MainThread to indicate a managed socket was closed. NOP. */
	public $onSocketClose(_socketId: number, _error?: SerializedError): void {
		this._logWarnOnce(
			`RPC STUB: $onSocketClose received for socket ${_socketId}. Close signal ignored (No-Operation). Error (if any): ${JSON.stringify(_error)}`,
		);
	}

	/** (RPC Stub) Called by MainThread to indicate a managed socket was ended by the remote peer. NOP. */
	public $onSocketEnd(_socketId: number): void {
		this._logWarnOnce(
			`RPC STUB: $onSocketEnd received for socket ${_socketId}. End signal ignored (No-Operation).`,
		);
	}

	/** (RPC Stub) Called by MainThread after socket data has been processed, for flow control. NOP. */
	public async $onSocketDrain(_socketId: number): Promise<void> {
		this._logWarnOnce(
			`RPC STUB: $onSocketDrain received for socket ${_socketId}. Drain signal processed as No-Operation.`,
		);
		return Promise.resolve();
	}

	/** (RPC Stub) Called by MainThread for new connections on a server socket. NOP. */
	public async $onServerSocketConnection(
		_requestId: number,
		_initialDataChunk: VSBuffer,
		_socketId: number,
	): Promise<void> {
		this._logWarnOnce(
			`RPC STUB: $onServerSocketConnection received for request ${_requestId}. New server socket connection ignored (No-Operation).`,
		);
	}

	/** (RPC Stub) Called by MainThread after a new socket is accepted on a listening server socket. NOP. */
	public async $onDidAcceptNewSocket(
		_socketId: number,
		_initialDataChunk: VSBuffer,
		_socketListenId: number,
	): Promise<void> {
		this._logWarnOnce(
			`RPC STUB: $onDidAcceptNewSocket received for socket ${_socketId}. New accepted socket ignored (No-Operation).`,
		);
	}

	/**
	 * Disposes of resources held by this shim instance.
	 * (Currently none specific to this stub beyond what BaseCocoonShim handles).
	 */
	public override dispose(): void {
		super.dispose(); // From BaseCocoonShim
		this._logInfo("Disposed.");
	}
}
