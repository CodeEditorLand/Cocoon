/*---------------------------------------------------------------------------------------------
 * Cocoon Managed Sockets Shim (managed-sockets-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a basic stub implementation for the `IExtHostManagedSockets` service.
 * In a full VS Code environment, this service plays a critical role in scenarios
 * involving remote development, port forwarding, and tunneling. It allows extensions
 * to create and interact with network sockets whose lifecycle and underlying transport
 * are managed by the editor, providing a level of abstraction and control, especially
 * when network paths between the extension host and the target are not direct.
 *
 * For Cocoon's MVP (Minimum Viable Product), full managed socket functionality is
 * considered out of scope due to its complexity (requiring low-level network operation
 * proxying and management). Therefore, this shim provides only the API surface required
 * for type compatibility if other services depend on `IExtHostManagedSockets`. Most of
 * its methods are No-Operations (NOPs) or will throw errors indicating that the
 * functionality is not supported in the current version of Cocoon.
 *
 * Responsibilities (as a stub):
 * - Implementing the `IExtHostManagedSockets` interface with NOPs or error-throwing stubs
 *   for all its methods to ensure type compatibility for DI.
 * - Logging warnings when its methods are called to clearly indicate that the requested
 *   managed socket functionality is not implemented.
 * - Providing a NOP `onDidResurrectConnection` event, which in a full system would
 *   signal the revival of persistent socket connections (e.g., after a reload or
 *   when a remote connection is re-established).
 *
 * Key Interactions:
 * - An instance of `ShimExtHostManagedSockets` is registered with Dependency Injection
 *   in `Cocoon/index.ts`. It might be injected into the `ExtHostExtensionService` or
 *   other ExtHost services if they have optional dependencies on managed socket capabilities.
 * - In a full implementation, this service would interact extensively with a
 *   `MainThreadManagedSockets` service on the Mountain host via RPC to manage
 *   socket creation, data transfer, and lifecycle events.
 * - Uses `BaseCocoonShim` for standardized logging utilities.
 *
 *--------------------------------------------------------------------------------------------*/

// For method signatures like writeSocket
import type { VSBuffer } from "vs/base/common/buffer";
// For VscodeEvent.None as NOP event
import { Event as VscodeEvent } from "vs/base/common/event";
// Import the actual VS Code interface definition for IExtHostManagedSockets
import type {
	IExtHostManagedSockets as VscodeIExtHostManagedSockets,
	// Other related types from VS Code if used in method signatures, e.g.:
	// type ManagedSocketContext, type SocketDetails, SocketOptions, ServerListenOptions
} from "vs/workbench/api/common/extHostManagedSockets";

import {
	BaseCocoonShim,
	// Updated type from BaseCocoonShim
	type ILogServiceForShim,
	// Updated type from BaseCocoonShim
	type IRpcProtocolServiceAdapter,
	// Uncomment if RPC is used for a full implementation
	// type ProxyIdentifier,
} from "./_baseShim";

// TODO: Import MainContext, ExtHostContext, and DTOs (MainThreadManagedSocketsShape, ExtHostManagedSocketsShape)
// from `extHost.protocol.ts` if/when RPC calls are implemented for this service.
// import { MainContext, ExtHostContext } from "vs/workbench/api/common/extHost.protocol";

// import type { MainThreadManagedSocketsShape, ExtHostManagedSocketsShape } from "vs/workbench/api/common/extHost.protocol";

/**
 * Placeholder for the RPC interface of a `MainThreadManagedSockets` service on Mountain.
 * This would define methods for creating and managing sockets on the main thread side.
 */
// interface MainThreadManagedSocketsProxyShape extends MainThreadManagedSocketsShape {

// Example methods might include:
//
// $socketCreate(options: SocketOptions): Promise<number /* handle */>;

//
// $socketWrite(handle: number, buffer: VSBuffer): Promise<void>;

//
// $socketEnd(handle: number): Promise<void>;

//
// ... and many more for connect, listen, dispose, data events, etc.
//
// }

/**
 * Placeholder for the RPC shape of methods on this `ExtHostManagedSockets` service
 * that would be called BY Mountain (if this service received RPC calls).
 * This would typically align with `ExtHostManagedSocketsShape` from `extHost.protocol.ts`.
 */
// interface CocoonExtHostManagedSocketsRpcShape extends ExtHostManagedSocketsShape {

// Example from VscodeExtHostManagedSocketsShape:
//
// $onSocketOutput(handle: number, data: VSBuffer): void;

//
// $onSocketClose(handle: number, error?: SerializedError): void;

//
// $onSocketEnd(handle: number): void;

//
// $onSocketDrain(handle: number): Promise<void>;

//
// }

/**
 * Cocoon's stub implementation of `IExtHostManagedSockets`.
 * Most methods are currently NOPs or throw errors, indicating that the managed
 * sockets feature is not supported in Cocoon's MVP. This class primarily serves
 * to fulfill DI requirements and provide a clear indication of unimplemented features.
 */
export class ShimExtHostManagedSockets
	extends BaseCocoonShim
	implements VscodeIExtHostManagedSockets
{
	// Ensure implementation of the VS Code interface
	// If also implementing RPC shape for calls from MainThread:
	// , CocoonExtHostManagedSocketsRpcShape
	// Required by VS Code's service type system for DI.
	public readonly _serviceBrand: undefined;

	// private _mainThreadManagedSocketsProxy: MainThreadManagedSocketsProxyShape | null = null;

	/**
	 * Creates an instance of ShimExtHostManagedSockets.
	 * @param rpcService The RPC service adapter (passed to `BaseCocoonShim`, currently unused by this stub's core logic).
	 * @param logService The logging service instance.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostManagedSockets", rpcService, logService);

		this._logInfo(
			"Initialized (basic STUB implementation). Full managed socket functionality is not supported.",
		);

		// If this service were to make RPC calls or receive them for a full implementation:
		// if (this._rpcService) {

		//     this._mainThreadManagedSocketsProxy = this._getProxy(
		//         MainContext.MainThreadManagedSockets as ProxyIdentifier<MainThreadManagedSocketsProxyShape>
		//     );

		// If this service has methods called BY MainThread (i.e., it implements ExtHostManagedSocketsShape):
		//
		//     this._rpcService.set(ExtHostContext.ExtHostManagedSockets as ProxyIdentifier<CocoonExtHostManagedSocketsRpcShape>, this);

		// }

		// if (!this._mainThreadManagedSocketsProxy) {

		//     this._logWarn("MainThreadManagedSockets RPC proxy not available. All managed socket features will be non-functional if attempted.");

		// }
	}

	/**
	 * This shim, in its current stubbed form, does not require RPC for its core functionality
	 * as it doesn't proxy any operations.
	 * @returns `false`.
	 */
	protected override _requiresRpc(): boolean {
		return false;
	}

	// --- IExtHostManagedSockets Implementation (Stubs for MVP) ---

	/**
	 * Event that fires when a previously disconnected managed socket connection is "resurrected"
	 * by the system (e.g., after a reload or when a remote connection is re-established).
	 * The event payload is the numeric handle of the resurrected socket.
	 * This is a No-Operation (NOP) event in the current stub implementation.
	 */
	public get onDidResurrectConnection(): VscodeEvent<number> {
		this._logWarnOnce(
			"STUB: `vscode.debug.onDidResurrectConnection` accessed. Returning a NOP event (VscodeEvent.None) as managed sockets are not implemented.",
		);

		return VscodeEvent.None;
	}

	/**
	 * Attempts to establish a managed socket connection to a port on a specified remote host.
	 * This functionality is not supported in Cocoon MVP and will throw an error to indicate this.
	 * @returns A promise that rejects with an error indicating the feature is not supported.
	 */
	public connectPort(
		remoteAuthority: string,

		host: string,

		port: number,

		isSSL: boolean,

		// _proposedHandle is often for internal VS Code use or specific advanced scenarios.
		_proposedHandle?: number,
	): Promise<number /* The socket handle */> {
		const errorMessage = `Managed Sockets API method 'connectPort' (remote: '${remoteAuthority}', target: ${host}:${port}, ssl: ${isSSL}) is not supported in this version of Cocoon.`;

		// Log as error because it's an attempt to use a non-functional critical feature.
		this._logError(errorMessage);

		return Promise.reject(new Error(errorMessage));
	}

	/**
	 * Attempts to create a managed server socket listening on a port on a specified remote host.
	 * This functionality is not supported in Cocoon MVP and will throw an error.
	 * @returns A promise that rejects with an error indicating the feature is not supported.
	 */
	public createServer(
		remoteAuthority: string,

		host: string,

		port: number,

		isSSL: boolean,

		_proposedHandle?: number,

		// e.g., ServerListenOptions from VS Code, currently unused in stub
		_options?: any,
	): Promise<number /* The server socket handle */> {
		const errorMessage = `Managed Sockets API method 'createServer' (remote: '${remoteAuthority}', listenOn: ${host}:${port}, ssl: ${isSSL}) is not supported in this version of Cocoon.`;

		this._logError(errorMessage);

		return Promise.reject(new Error(errorMessage));
	}

	/**
	 * Associates a locally created Node.js socket with a managed tunnel, identified by its handle.
	 * This is typically used in port forwarding scenarios where an extension sets up one end of a tunnel.
	 * This is a No-Operation (NOP) in the current stub implementation.
	 * @param handle The handle of the managed tunnel.
	 */
	public async setTunnelSocket(
		handle: number,

		_socket: any /* net.Socket | NodeJsSocket - the actual local socket object */,

		// Hostname of the local side of the tunnel (where _socket is listening/connected)
		_localHost: string,

		// Port number of the local side of the tunnel
		_localPort: number,
	): Promise<void> {
		this._logWarn(
			`STUB: Managed Sockets API method 'setTunnelSocket(handle: ${handle})' called. This is a No-Operation.`,
		);

		return Promise.resolve();
	}

	/**
	 * Disposes of a managed socket, closing the connection and releasing any associated resources.
	 * This is a No-Operation (NOP) in the current stub implementation.
	 * @param handle The handle of the socket to dispose.
	 */
	public async disposeSocket(handle: number): Promise<void> {
		this._logWarn(
			`STUB: Managed Sockets API method 'disposeSocket(handle: ${handle})' called. This is a No-Operation.`,
		);

		return Promise.resolve();
	}

	/**
	 * Writes data (as a `VSBuffer`) to a managed socket identified by its handle.
	 * This is a No-Operation (NOP) in the current stub implementation.
	 * @param handle The handle of the socket to write to.
	 * @param buffer The `VSBuffer` containing the data to write.
	 * @param _options Optional parameters for the write operation (e.g., `fin` to indicate final segment).
	 */
	public async writeSocket(
		handle: number,

		buffer: VSBuffer,

		_options?: { fin?: boolean | undefined } | undefined,
	): Promise<void> {
		this._logWarn(
			`STUB: Managed Sockets API method 'writeSocket(handle: ${handle}, bufferLength: ${buffer.byteLength})' called. This is a No-Operation.`,
		);

		return Promise.resolve();
	}

	/**
	 * Signals that no more data will be written to the managed socket from the caller's side
	 * (half-close).
	 * This is a No-Operation (NOP) in the current stub implementation.
	 * @param handle The handle of the socket to end.
	 */
	public async endSocket(handle: number): Promise<void> {
		this._logWarn(
			`STUB: Managed Sockets API method 'endSocket(handle: ${handle})' called. This is a No-Operation.`,
		);

		return Promise.resolve();
	}

	/**
	 * Retrieves the underlying local Node.js socket associated with a managed socket handle, if applicable.
	 * This might be used if an extension needs direct, low-level access to the socket after it's
	 * been established or managed by the system.
	 * Returns `undefined` in the current stub implementation.
	 * @param handle The handle of the managed socket.
	 * @returns A promise resolving to the socket object (e.g., `net.Socket`) or `undefined`.
	 */
	public async getSocket(
		handle: number,
	): Promise<any /* net.Socket | NodeJsSocket */ | undefined> {
		this._logWarn(
			`STUB: Managed Sockets API method 'getSocket(handle: ${handle})' called. Returning undefined.`,
		);

		return Promise.resolve(undefined);
	}

	// --- Methods from ExtHostManagedSocketsShape (called BY MainThread, if this service were fully implemented and registered for RPC) ---
	// These would handle actual socket operations if they were proxied from Mountain to this ExtHost service.
	// For an MVP stub, their presence (even as NOPs or error-throwers) defines the RPC contract shape.
	// They signal that the corresponding MainThread feature is not expected to call back to these,

	// or if it does, the functionality is not present in Cocoon.

	/**
	 * (RPC Stub) Called by MainThread to request the ExtHost to open a remote socket,
	 *
	 * typically via a registered socket factory (which is also not implemented in this shim).
	 * Throws an error as this functionality is not implemented.
	 */
	public async $openRemoteSocket(
		_socketFactoryId: number /* _req: SomeRequestDTO */,
	): Promise<number> {
		const message =
			"RPC Method $openRemoteSocket called on ExtHostManagedSockets, but it is not implemented in Cocoon's current stub shim.";

		// Log as error as this implies an unexpected call from MainThread.
		this._logError(message);

		throw new Error(message);
	}

	/** (RPC Stub) Called by MainThread to deliver data received on a managed socket to the ExtHost. NOP. */
	public $remoteSocketWrite(_socketId: number, _buffer: VSBuffer): void {
		this._logWarnOnce(
			"RPC Method $remoteSocketWrite STUB on ExtHostManagedSockets - Data received from MainThread ignored (No-Operation).",
		);
	}

	/** (RPC Stub) Called by MainThread to signal that a managed socket was ended by the remote peer. NOP. */
	public $remoteSocketEnd(_socketId: number): void {
		this._logWarnOnce(
			"RPC Method $remoteSocketEnd STUB on ExtHostManagedSockets - Socket end signal from MainThread ignored (No-Operation).",
		);
	}

	/** (RPC Stub) Called by MainThread after socket data has been processed by the remote end, for flow control. NOP. */
	public async $remoteSocketDrain(_socketId: number): Promise<void> {
		this._logWarnOnce(
			"RPC Method $remoteSocketDrain STUB on ExtHostManagedSockets - Socket drain signal from MainThread processed as No-Operation.",
		);

		return Promise.resolve();
	}

	/**
	 * Disposes of resources held by this shim instance.
	 * (Currently, this shim holds no complex resources like event emitters that require
	 * explicit disposal beyond what `BaseCocoonShim` handles via `_instanceDisposables`).
	 */
	public override dispose(): void {
		// From BaseCocoonShim
		super.dispose();

		// If this shim had its own event emitters or complex resources, they would be disposed here.
		// Use Info for major lifecycle.
		this._logInfo("Disposed.");
	}
}
