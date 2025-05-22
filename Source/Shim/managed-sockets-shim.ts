/*---------------------------------------------------------------------------------------------
 * Cocoon Managed Sockets Shim (managed-sockets-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a basic shim for the `IExtHostManagedSockets` service.
 * In VS Code, this service allows extensions to work with network sockets that are
 * managed by the editor, often for remote development or tunneling scenarios.
 *
 * For Cocoon's MVP, this service is likely a NOP (No Operation) or heavily stubbed,
 *
 * as full managed socket functionality is complex and may not be a core MVP requirement.
 *
 * Key Interactions:
 * - Injected into `AbstractExtHostExtensionService`.
 * - Would interact with `MainThreadManagedSockets` via RPC in a full implementation.
 *--------------------------------------------------------------------------------------------*/

import { VSBuffer } from "vs/base/common/buffer";
import {
	IExtHostManagedSockets as VscodeIExtHostManagedSockets /* Other related types */,
} from "vs/workbench/api/common/extHostManagedSockets";

// Actual VS Code interface

import {
	BaseCocoonShim,
	IExtHostRpcService,
	ILogService,
	ProxyIdentifier,
} from "./_baseShim";

// TODO: Import MainContext, ExtHostContext, and DTOs if RPC calls are made
// import { MainContext, ExtHostContext, MainThreadManagedSocketsShape, ExtHostManagedSocketsShape } from "vs/workbench/api/common/extHost.protocol";

// TODO: Define MainThreadManagedSocketsShape if RPC is used.
// interface MainThreadManagedSocketsProxyShape {
//     $registerSocketFactory(socketFactoryId: number): Promise<void>;

//     $unregisterSocketFactory(socketFactoryId: number): Promise<void>;

// ... other methods
//
// }

// TODO: Define ExtHostManagedSocketsShape if this service receives RPC calls.
// interface CocoonExtHostManagedSocketsRpcShape {

//     $openRemoteSocket(socketFactoryId: number): Promise<number>;

// ... other methods
//
// }

export interface CocoonIExtHostManagedSockets
	extends VscodeIExtHostManagedSockets {
	// No Cocoon-specific extensions needed for this service currently.
}

export class ShimExtHostManagedSockets
	extends BaseCocoonShim
	implements CocoonIExtHostManagedSockets
{
	public readonly _serviceBrand: undefined;

	// #mainThreadManagedSocketsProxy: MainThreadManagedSocketsProxyShape | null = null;

	constructor(
		rpcService: IExtHostRpcService | undefined,

		logService: ILogService | undefined,
	) {
		super("ExtHostManagedSockets", rpcService, logService);

		// this._log("Initialized (basic stub).");

		// if (this._rpcService) {

		//     this.#mainThreadManagedSocketsProxy = this._getProxy(
		//         MainContext.MainThreadManagedSockets as ProxyIdentifier<MainThreadManagedSocketsProxyShape>
		//     );

		// If it has RPC methods
		//     this._rpcService.set(ExtHostContext.ExtHostManagedSockets, this);

		// }

		// if (!this.#mainThreadManagedSocketsProxy) {

		//     this._logWarn("MainThreadManagedSockets proxy not available. Managed socket features will be stubbed.");

		// }
	}

	// --- IExtHostManagedSockets Implementation (Stubs for MVP) ---

	public get onDidResurrectConnection(): VscodeEvent<number> {
		this._logWarnOnce(
			"onDidResurrectConnection STUB - returning NOP event.",
		);

		return VscodeEvent.None;
	}

	public connectPort(
		remoteAuthority: string,

		host: string,

		port: number,

		isSSL: boolean,

		proposedHandle?: number,
	): Promise<number> {
		this._logWarn(
			`connectPort(${remoteAuthority}, ${host}:${port}, ssl=${isSSL}) STUB - throwing NotSupportedError.`,
		);

		return Promise.reject(
			new Error(
				"Managed Sockets: connectPort not supported in Cocoon MVP.",
			),
		);
	}

	public createServer(
		remoteAuthority: string,

		host: string,

		port: number,

		isSSL: boolean,

		proposedHandle?: number,

		options?: any,
	): Promise<number> {
		this._logWarn(
			`createServer(${remoteAuthority}, ${host}:${port}, ssl=${isSSL}) STUB - throwing NotSupportedError.`,
		);

		return Promise.reject(
			new Error(
				"Managed Sockets: createServer not supported in Cocoon MVP.",
			),
		);
	}

	public async setTunnelSocket(
		handle: number,

		socket: any /* net.Socket | NodeJsSocket */,

		localHost: string,

		localPort: number,
	): Promise<void> {
		this._logWarn(`setTunnelSocket for handle ${handle} STUB - NOP.`);

		// In a real implementation, this would associate a local socket with a managed tunnel.
	}

	public async disposeSocket(handle: number): Promise<void> {
		this._logWarn(`disposeSocket for handle ${handle} STUB - NOP.`);
	}

	public async writeSocket(
		handle: number,

		buffer: VSBuffer,

		options?: { fin?: boolean | undefined } | undefined,
	): Promise<void> {
		this._logWarn(
			`writeSocket for handle ${handle} (len: ${buffer.byteLength}) STUB - NOP.`,
		);
	}

	public async endSocket(handle: number): Promise<void> {
		this._logWarn(`endSocket for handle ${handle} STUB - NOP.`);
	}

	public async getSocket(
		handle: number,
	): Promise<any /* net.Socket | NodeJsSocket */ | undefined> {
		this._logWarn(
			`getSocket for handle ${handle} STUB - returning undefined.`,
		);

		return undefined;
	}

	// Methods from ExtHostManagedSocketsShape (called by MainThread)
	// These would handle actual socket operations if proxied.
	public async $openRemoteSocket(_socketFactoryId: number): Promise<number> {
		this._logWarn(
			"RPC $openRemoteSocket STUB - throwing NotSupportedError.",
		);

		throw new Error("$openRemoteSocket not implemented in shim.");
	}

	public $remoteSocketWrite(_socketId: number, _buffer: VSBuffer): void {
		this._logWarn("RPC $remoteSocketWrite STUB - NOP.");
	}

	public $remoteSocketEnd(_socketId: number): void {
		this._logWarn("RPC $remoteSocketEnd STUB - NOP.");
	}

	public async $remoteSocketDrain(_socketId: number): Promise<void> {
		this._logWarn("RPC $remoteSocketDrain STUB - NOP.");
	}

	// TODO: $onDidManagedSocketHaveData, $onDidManagedSocketClose, $onDidManagedSocketEnd would be called by main thread
	// to deliver data or close events for sockets opened via $openRemoteSocket.
}
