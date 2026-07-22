/**
 * @module Handler/HandlerContext
 * @description
 * Shared context type passed to domain handler modules.
 * Provides access to the GRPCServerService state and methods
 * that handlers need without creating circular dependencies.
 */

import type { EventEmitter } from "events";

import type { MountainClientService } from "../../Mountain/Client/Service.js";

/**
 * Context object passed to all handler modules.
 * Exposes the subset of GRPCServerService state each handler needs.
 */
export interface HandlerContext {

	/** EventEmitter instance for emitting domain events */
	readonly Emitter: EventEmitter;

	/** EventEmitter for workspace document lifecycle events.
	 * Fires: "didOpenTextDocument", "didChangeTextDocument",
	 * "didCloseTextDocument", "didSaveTextDocument".
	 * Listeners receive a TextDocument-shaped object. */
	readonly WorkspaceEventEmitter: EventEmitter;

	/** Extension registry keyed by identifier string */
	readonly ExtensionRegistry: Map<string, any>;

	/** Activation event to extension identifier mapping */
	readonly ActivationEventIndex: Map<string, string[]>;

	/** Set of already-activated extension identifiers */
	readonly ActivatedExtensions: Set<string>;

	/** Cached document content keyed by URI string */
	readonly DocumentContentCache: Map<string, string>;

	/** Stored initialization data from Mountain */
	ExtensionHostInitData: any;

	/** Whether the extension host has been initialized */
	ExtensionHostReady: boolean;

	/** Reverse gRPC client for sending messages to Mountain */
	MountainClient: MountainClientService | null;

	/** Send a notification to Mountain */
	SendToMountain(Method: string, Parameters: any): Promise<void>;

	/** Connect to Mountain gRPC server */
	ConnectToMountain(): Promise<void>;

	/**
	 * Fire-and-forget activation event dispatcher. Assigned by the
	 * GRPCServerService when it registers the routing table so
	 * shim code (eg. the workspace `openTextDocument` path) can
	 * trigger `onLanguage:X` / `onFileSystem:X` activations without
	 * importing `HandleActivateByEvent` directly (avoiding a
	 * circular import between handler modules and the router).
	 */
	ActivateByEvent?(Event: string): Promise<void>;
}

export default HandlerContext;
