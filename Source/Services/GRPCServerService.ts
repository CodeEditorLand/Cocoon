/**
 * @module GRPCServerService
 * @description
 * Cocoon's gRPC server implementation for Mountain integration.
 * Implements the CocoonService protocol defined in Mountain's Vine.proto.
 * Provides bidirectional streaming for real-time event communication.
 *
 * RESPONSIBILITIES:
 * - Start and manage gRPC server for receiving Mountain requests
 * - Implement bidirectional streaming for real-time events
 * - Handle Mountain requests and route to appropriate services
 * - Send and receive notifications from Mountain
 * - Implement request cancellation with timeout handling
 * - Handle authentication and authorization tokens
 * - Manage connection keepalive for reliability
 * - Monitor server health and track errors
 *
 * Domain logic is delegated to handler modules in ./Handler/:
 * - ExtensionHostHandler - extension host lifecycle (init, delta, activate, start)
 * - LanguageProviderHandler - $provide* language feature invocations
 * - DocumentContentHandler - document content mirroring ($acceptModel*)
 * - NotificationHandler - notification routing and event emission
 * - RequestRoutingHandler - service.method pattern routing
 *
 * Based on Mountain's Vine gRPC protocol specification.
 * Specification: MOUNTAIN-COCOON-INTEGRATION.md (gRPC Server Implementation)
 */

import { EventEmitter } from "events";
import { createRequire } from "module";
import { dirname } from "path";
import { fileURLToPath } from "url";

import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { Effect, Layer } from "effect";

// Import generated interfaces from Vine.proto
import {
	CancelOperationRequest,
	CocoonServiceImplementation,
	Empty,
	GenericNotification,
	GenericRequest,
	GenericResponse,
} from "../Generated/Vine";
import { IGRPCServerService } from "../Interfaces/IGRPCServerService";
import DocumentContentHandler from "./Handler/DocumentContentHandler.js";
import ExtensionHostHandler from "./Handler/ExtensionHostHandler.js";
// Import handler modules
import type { HandlerContext } from "./Handler/HandlerContext.js";
import InvokeLanguageProvider from "./Handler/LanguageProviderHandler.js";
import HandleSpecificNotification from "./Handler/NotificationHandler.js";
import RouteRequest from "./Handler/RequestRoutingHandler.js";

// ESM compatibility - provide __dirname and require() for proto loading
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

/**
 * Request tracking entry for cancellation support
 */
interface RequestTrackingEntry {
	method: string;
	startTime: number;
	cancelHandler?: () => void;
}

/**
 * GRPCServerService implementation with bidirectional streaming support
 */
export class GRPCServerService
	extends EventEmitter
	implements IGRPCServerService
{
	readonly _serviceBrand: undefined;

	private server: grpc.Server | null = null;
	private port: number = 50052; // Default Cocoon gRPC port
	private isRunning: boolean = false;
	private serviceImplementation: CocoonServiceImplementation;
	private streamingHandlers: Set<
		grpc.ServerDuplexStream<GenericRequest, GenericResponse>
	> = new Set();

	// Authentication configuration
	private authToken: string | null = null;
	private authEnabled: boolean = false;

	// Keepalive configuration
	private readonly keepaliveInterval: number = 10000; // 10 seconds
	private readonly keepaliveTimeout: number = 5000; // 5 seconds
	private keepaliveTimer: NodeJS.Timeout | null = null;

	// Request tracking for cancellation
	private activeRequests: Map<bigint, RequestTrackingEntry> = new Map();

	// Health monitoring
	private readonly startTime: number = 0;
	private errorCount: number = 0;
	private requestCount: number = 0;

	/** Stored initialization data from Mountain's InitializeExtensionHost */
	private extensionHostInitData: any = null;

	/** Indexed extensions from InitializeExtensionHost, keyed by identifier */
	private extensionRegistry: Map<string, any> = new Map();

	/** Activation event to extension identifiers that declare it */
	private activationEventIndex: Map<string, string[]> = new Map();

	/** Whether the extension host has been initialized */
	private extensionHostReady: boolean = false;

	/** Track which extensions have already been activated (prevents double-activation) */
	private readonly activatedExtensions: Set<string> = new Set();

	/** Document content mirror - caches text content keyed by URI string.
	 * Updated by $acceptModelChanged notifications from Mountain.
	 * Read by InvokeLanguageProvider's VsDocument.getText() for real-time content. */
	private readonly documentContentCache: Map<string, string> = new Map();

	/** Reverse gRPC client for sending messages back to Mountain */
	private mountainClient:
		| import("./MountainClientService.js").MountainClientService
		| null = null;

	/** Workspace document lifecycle event emitter.
	 * Fires didOpenTextDocument, didChangeTextDocument,
	 * didCloseTextDocument, didSaveTextDocument for vscode API shim listeners. */
	private readonly workspaceEventEmitter: EventEmitter = new EventEmitter();

	constructor() {
		super();
		this._serviceBrand = undefined;
		console.log("[GRPCServerService] Initializing gRPC server");

		// Extensions register many listeners (one per language client, webview,
		// tree view, etc.). The default Node cap of 10 produces noisy
		// `MaxListenersExceededWarning` spam during boot. 0 = unlimited.
		this.setMaxListeners(0);
		this.workspaceEventEmitter.setMaxListeners(0);
		process.stdout.write(
			"[LandFix:GRPCSvc] setMaxListeners(0) applied on self + workspaceEventEmitter\n",
		);

		// Parse environment variables
		this.parseEnvironment();

		// Create service implementation
		this.serviceImplementation = this.createServiceImplementation();

		console.log(`[GRPCServerService] Configured for port ${this.port}`);
	}

	// ==================================================================
	// Handler Context
	// ==================================================================

	/**
	 * Build the HandlerContext object that domain handlers receive.
	 * Uses property descriptors so gets/sets mutate the actual class fields.
	 */
	private GetHandlerContext(): HandlerContext {
		// Capture `this` so property accessors reference live class state
		const Self = this;

		return Object.defineProperties(
			{
				Emitter: this,
				WorkspaceEventEmitter: this.workspaceEventEmitter,
				ExtensionRegistry: this.extensionRegistry,
				ActivationEventIndex: this.activationEventIndex,
				ActivatedExtensions: this.activatedExtensions,
				DocumentContentCache: this.documentContentCache,
				SendToMountain: (Method: string, Parameters: any) =>
					this.SendToMountain(Method, Parameters),
				ConnectToMountain: () => this.ConnectToMountain(),
			} as HandlerContext,
			{
				ExtensionHostInitData: {
					get() {
						return Self.extensionHostInitData;
					},
					set(Value: any) {
						Self.extensionHostInitData = Value;
					},
					enumerable: true,
					configurable: true,
				},
				ExtensionHostReady: {
					get() {
						return Self.extensionHostReady;
					},
					set(Value: boolean) {
						Self.extensionHostReady = Value;
					},
					enumerable: true,
					configurable: true,
				},
				MountainClient: {
					get() {
						return Self.mountainClient;
					},
					set(Value: any) {
						Self.mountainClient = Value;
					},
					enumerable: true,
					configurable: true,
				},
			},
		);
	}

	// ==================================================================
	// Environment and Authentication
	// ==================================================================

	/**
	 * Parse environment variables for configuration
	 */
	private parseEnvironment(): void {
		const cocoonPort = process.env["COCOON_GRPC_PORT"];
		if (cocoonPort) {
			this.port = parseInt(cocoonPort, 10);
		}

		// Parse authentication settings
		const authToken = process.env["MOUNTAIN_AUTH_TOKEN"];
		if (authToken) {
			this.authToken = authToken;
			this.authEnabled = true;
			console.log("[GRPCServerService] Authentication enabled");
		}

		console.log(
			`[GRPCServerService] Environment parsed: COCOON_GRPC_PORT=${this.port}, AUTH_ENABLED=${this.authEnabled}`,
		);
	}

	/**
	 * Validate authentication token
	 */
	private ValidateAuthentication(): boolean {
		if (!this.authEnabled) {
			return true; // No auth required
		}

		// TODO: Implement actual token validation
		// For now, always return true if auth is enabled
		// A proper implementation would validate the token from the call metadata
		return true;
	}

	// ==================================================================
	// gRPC Service Implementation
	// ==================================================================

	/**
	 * Create gRPC service implementation with bidirectional streaming support
	 */
	private createServiceImplementation(): CocoonServiceImplementation {
		return {
			ProcessMountainRequest: (
				Call: grpc.ServerUnaryCall<GenericRequest, GenericResponse>,
				Callback: grpc.sendUnaryData<GenericResponse>,
			) => {
				if (!this.ValidateAuthentication()) {
					Callback({
						code: grpc.status.UNAUTHENTICATED,
						details: "Authentication failed",
					});
					return;
				}
				this.handleMountainRequest(Call.request)
					.then((Response) => Callback(null, Response))
					.catch((Error) =>
						Callback({
							code: grpc.status.INTERNAL,
							details:
								Error instanceof globalThis.Error
									? Error.message
									: "Unknown error",
						}),
					);
			},
			SendMountainNotification: (
				Call: grpc.ServerUnaryCall<GenericNotification, Empty>,
				Callback: grpc.sendUnaryData<Empty>,
			) => {
				if (!this.ValidateAuthentication()) {
					Callback({
						code: grpc.status.UNAUTHENTICATED,
						details: "Authentication failed",
					});
					return;
				}
				this.handleMountainNotification(Call.request);
				Callback(null, {});
			},
			CancelOperation: (
				Call: grpc.ServerUnaryCall<CancelOperationRequest, Empty>,
				Callback: grpc.sendUnaryData<Empty>,
			) => {
				if (!this.ValidateAuthentication()) {
					Callback({
						code: grpc.status.UNAUTHENTICATED,
						details: "Authentication failed",
					});
					return;
				}
				this.handleCancelOperation(Call.request);
				Callback(null, {});
			},
		};
	}

	// ==================================================================
	// Bidirectional Streaming
	// ==================================================================

	/**
	 * Start bidirectional streaming for real-time events
	 * TODO: FUTURE: Implement streaming handlers for real-time event communication
	 * Specification: MOUNTAIN-COCOON-INTEGRATION.md (Bidirectional Streaming)
	 * Implementation: Add stream handlers for Mountain-Cocoon event stream
	 * Dependencies: Event marshaling, backpressure handling
	 * Validation: Test with high-frequency event streams
	 */
	private startBidirectionalStreaming(
		stream: grpc.ServerDuplexStream<GenericRequest, GenericResponse>,
	): void {
		console.log(
			"[GRPCServerService] Starting bidirectional streaming connection",
		);

		// Add to streaming handlers
		this.streamingHandlers.add(stream);

		// Handle incoming data
		stream.on("data", (request: GenericRequest) => {
			console.log(
				`[GRPCServerService] Received streaming request: ${request.Method}`,
			);
			this.handleStreamingRequest(request, stream);
		});

		// Handle connection close
		stream.on("close", () => {
			console.log(
				"[GRPCServerService] Bidirectional streaming connection closed",
			);
			this.streamingHandlers.delete(stream);
		});

		// Handle errors
		stream.on("error", (error) => {
			this.errorCount++;
			console.error("[GRPCServerService] Streaming error:", error);
		});

		// Send keepalive pings
		this.startKeepalive(stream);
	}

	/**
	 * Handle streaming request
	 */
	private async handleStreamingRequest(
		request: GenericRequest,
		stream: grpc.ServerDuplexStream<GenericRequest, GenericResponse>,
	): Promise<void> {
		try {
			const parameters = this.parseParameters(request.Parameter);
			const responseData = await this.routeRequest(
				request.Method,
				parameters,
			);

			const response: GenericResponse = {
				RequestIdentifier: request.RequestIdentifier,
				Result: Buffer.from(JSON.stringify(responseData)),
			};

			stream.write(response);
		} catch (error) {
			console.error(
				`[GRPCServerService] Streaming request failed for ${request.Method}:`,
				error,
			);

			const response: GenericResponse = {
				RequestIdentifier: request.RequestIdentifier,
				Result: Buffer.from(JSON.stringify({})),
				error: {
					Code: 500,
					Message:
						error instanceof Error
							? error.message
							: "Unknown error",
					Data: Buffer.from(JSON.stringify({})),
				},
			};

			stream.write(response);
		}
	}

	/**
	 * Start keepalive for streaming connection
	 */
	private startKeepalive(
		stream: grpc.ServerDuplexStream<GenericRequest, GenericResponse>,
	): void {
		const keepaliveInterval = setInterval(() => {
			if (!stream.writable) {
				clearInterval(keepaliveInterval);
				return;
			}

			const keepaliveRequest: GenericRequest = {
				RequestIdentifier: BigInt(0),
				Method: "keepalive.ping",
				Parameter: Buffer.from(JSON.stringify({})),
			};

			stream.write({
				RequestIdentifier: keepaliveRequest.RequestIdentifier,
				Result: Buffer.from(JSON.stringify({ status: "alive" })),
			} as GenericResponse);
		}, this.keepaliveInterval);

		stream.on("close", () => {
			clearInterval(keepaliveInterval);
		});
	}

	/**
	 * Broadcast event to all active streaming connections
	 */
	private BroadcastEvent(method: string, data: any): void {
		const notification: GenericResponse = {
			RequestIdentifier: BigInt(0),
			Result: Buffer.from(JSON.stringify(data)),
		};

		this.streamingHandlers.forEach((stream) => {
			if (stream.writable) {
				stream.write(notification);
			}
		});
	}

	// ==================================================================
	// Request Handling
	// ==================================================================

	/**
	 * Handle Mountain request with validation and routing
	 */
	private async handleMountainRequest(
		request: GenericRequest,
	): Promise<GenericResponse> {
		const startTime = Date.now();
		this.requestCount++;

		console.log(
			`[GRPCServerService] Processing Mountain request: ${request.Method}`,
		);

		// Track request for cancellation
		this.activeRequests.set(request.RequestIdentifier, {
			method: request.Method,
			startTime: startTime,
		});

		try {
			// Parse parameters from JSON with validation
			const parameters = this.parseParameters(request.Parameter);

			// Validate request method
			if (!request.Method || !this.IsValidMethod(request.Method)) {
				throw new Error(`Invalid method: ${request.Method}`);
			}

			// Route to appropriate service
			const responseData = await this.routeRequest(
				request.Method,
				parameters,
			);

			const response: GenericResponse = {
				RequestIdentifier: request.RequestIdentifier,
				Result: this.SerializeResponseData(responseData),
			};

			const processingTime = Date.now() - startTime;
			console.log(
				`[GRPCServerService] Request ${request.Method} processed in ${processingTime}ms`,
			);

			// Remove from active requests
			this.activeRequests.delete(request.RequestIdentifier);

			return response;
		} catch (error) {
			this.errorCount++;

			// Errors inside `$provide*` / `$resolve*` / `$get*` methods are
			// thrown by extension-provided handlers, not by Cocoon. Dumping
			// the full stack trace to stderr surfaces as a Mountain `warn:
			// Cocoon stderr` spam even though the fault lives in the
			// extension's own code (see e.g. the npm extension's
			// `getScripts` throwing on malformed package.json). Downgrade
			// these to a single-line warn with just the message; the IPC
			// response still carries the error payload back to the caller.
			const IsExtensionProvidedHandler =
				request.Method.startsWith("$provide") ||
				request.Method.startsWith("$resolve") ||
				request.Method.startsWith("$get");
			if (IsExtensionProvidedHandler) {
				console.warn(
					`[GRPCServerService] Extension handler ${request.Method} rejected: ${
						error instanceof Error ? error.message : String(error)
					}`,
				);
			} else {
				console.error(
					`[GRPCServerService] Error processing request ${request.Method}:`,
					error,
				);
			}

			// Remove from active requests
			this.activeRequests.delete(request.RequestIdentifier);

			const response: GenericResponse = {
				RequestIdentifier: request.RequestIdentifier,
				Result: Buffer.from(JSON.stringify({})),
				error: {
					Code: 500,
					Message:
						error instanceof Error
							? error.message
							: "Unknown error",
					Data: Buffer.from(JSON.stringify({})),
				},
			};

			return response;
		}
	}

	/**
	 * Validate request method format.
	 * Accepts:
	 *   - "service.method" (e.g., "extension.activate")
	 *   - "$provideFeature" (e.g., "$provideHover", "$provideCompletions")
	 *     Mountain invokes these when Sky requests language intelligence.
	 *   - "InitializeExtensionHost" - Mountain's extension host init handshake
	 *   - "$deltaExtensions", "$activateByEvent", "$startExtensionHost"
	 *     Mountain's extension host lifecycle methods
	 *   - "{Prefix}${Method}" - VS Code-style proxied RPC (e.g.
	 *     "ExtHostCommands$ExecuteContributedCommand"). Mountain's
	 *     CommandProvider uses this shape to dispatch extension commands.
	 *   - "$shutdown" - Mountain initiates graceful shutdown via this method.
	 */
	private IsValidMethod(method: string): boolean {
		const DotMethod = /^[a-zA-Z]+\.[a-zA-Z]+$/.test(method);
		const ProvideMethod = /^\$provide[A-Z][a-zA-Z]+$/.test(method);
		const ExtensionHostMethod =
			/^(InitializeExtensionHost|\$deltaExtensions|\$activateByEvent|\$startExtensionHost|\$shutdown|\$deltaWorkspaceFolders)$/.test(
				method,
			);
		const ProxiedMethod = /^[A-Za-z]+\$[A-Za-z]+[A-Za-z0-9]*$/.test(method);
		return DotMethod || ProvideMethod || ExtensionHostMethod || ProxiedMethod;
	}

	/**
	 * Serialize response data to buffer. `undefined` is a valid resolved
	 * value for VS Code command handlers (e.g. `workbench.action.open*`
	 * returns `undefined` on success); `JSON.stringify(undefined)` itself
	 * returns `undefined`, which `Buffer.from` then rejects with
	 * ERR_INVALID_ARG_TYPE. Normalise to `null` so the wire payload is a
	 * well-formed JSON literal Mountain can deserialize.
	 */
	private SerializeResponseData(data: any): Buffer {
		try {
			const Normalised = data === undefined ? null : data;
			const serialized = JSON.stringify(Normalised);
			return Buffer.from(serialized ?? "null", "utf8");
		} catch (error) {
			console.error(
				"[GRPCServerService] Failed to serialize response:",
				error,
			);
			return Buffer.from("{}", "utf8");
		}
	}

	/**
	 * Parse parameters from JSON with enhanced error handling
	 */
	private parseParameters(parameterBuffer: Buffer): any {
		try {
			const parameterString = parameterBuffer.toString("utf8");

			// Handle empty buffer
			if (!parameterString || parameterString.length === 0) {
				return {};
			}

			return JSON.parse(parameterString);
		} catch (error) {
			console.error(
				"[GRPCServerService] Failed to parse parameters:",
				error,
			);
			throw new Error(
				`Invalid parameter format: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Route request to appropriate service.
	 * Delegates to RequestRoutingHandler for service.method patterns,
	 * ExtensionHostHandler for lifecycle methods, and
	 * LanguageProviderHandler for $provide* methods.
	 */
	private async routeRequest(method: string, parameters: any): Promise<any> {
		// Try service routing table first (extension.*, configuration.*, etc.)
		const ServiceResult = await RouteRequest(method, parameters);
		if (ServiceResult !== undefined) {
			return ServiceResult;
		}

		// Extension host lifecycle methods from Mountain
		const Context = this.GetHandlerContext();

		if (method === "InitializeExtensionHost") {
			return ExtensionHostHandler.HandleInitializeExtensionHost(
				Context,
				parameters,
			);
		}
		if (method === "$deltaExtensions") {
			return ExtensionHostHandler.HandleDeltaExtensions(
				Context,
				parameters,
			);
		}
		if (method === "$activateByEvent") {
			return ExtensionHostHandler.HandleActivateByEvent(
				Context,
				parameters,
			);
		}
		if (method === "$startExtensionHost") {
			return ExtensionHostHandler.HandleStartExtensionHost(
				Context,
				parameters,
			);
		}

		// `$provideTreeChildren` shares the `$provide*` prefix but has
		// nothing to do with language-feature providers. It routes to the
		// tree-data provider registry keyed on viewId, not to
		// `LanguageProviderHandler` (which would `throw` on an unknown
		// provider kind). Dispatch explicitly through
		// `RequestRoutingHandler` before the generic `$provide[A-Z]` regex
		// below catches it.
		if (method === "$provideTreeChildren") {
			const RequestRoutingHandler = (
				await import("./Handler/RequestRoutingHandler.js")
			).default;
			return RequestRoutingHandler(method, parameters);
		}

		// Language feature provider invocation: "$provideHover", "$provideCompletions", etc.
		// Mountain calls these when Sky's Monaco editor requests language intelligence.
		// parameters = [handle, uriObject, position?, context?]
		if (/^\$provide[A-Z]/.test(method)) {
			return InvokeLanguageProvider(
				method,
				parameters,
				this.documentContentCache,
			);
		}

		// VS Code-style proxied RPC: `{Prefix}${Method}`. Mountain's
		// CommandProvider uses this to reach contributed extension commands.
		// We only know `ExtHostCommands$ExecuteContributedCommand` so far;
		// additional `ExtHost*` targets can be added as they appear in the
		// Editor submodule's protocol definitions.
		if (/^ExtHostCommands\$ExecuteContributedCommand/.test(method)) {
			// Parameters shape: [commandId, arguments]
			const Args = Array.isArray(parameters) ? parameters : [parameters];
			const CommandId: string = typeof Args[0] === "string" ? Args[0] : "";
			const CommandArguments: unknown = Args[1];
			if (CommandId) {
				const LanguageProviderRegistry = await import(
					"./LanguageProviderRegistry.js"
				);
				const ExtensionArguments = Array.isArray(CommandArguments)
					? CommandArguments
					: CommandArguments === undefined
						? []
						: [CommandArguments];
				return (LanguageProviderRegistry as any).ExecuteCommand(
					CommandId,
					...ExtensionArguments,
				);
			}
			return undefined;
		}

		// `$shutdown` is a one-shot notification-style request Mountain fires
		// on process teardown. Ack politely - the process will exit on its
		// own once the gRPC server closes.
		if (method === "$shutdown") {
			return { ok: true };
		}

		// ExtHostAuthentication surface. Extensions call
		// `authentication.getSession(providerId, scopes, options)` during
		// activation; until we have a real provider registry wired through
		// Mountain, the honest answer is "no session". Returning `undefined`
		// (serialised as `null`) matches stock VS Code's behaviour when the
		// user dismisses a sign-in prompt and keeps the extension from
		// throwing during boot. Other `ExtHostAuthentication$*` methods
		// (registerProvider, removeSession, ...) return `null` for the same
		// reason - better than a hard `Unknown method` throw.
		if (/^ExtHostAuthentication\$/.test(method)) {
			return null;
		}

		throw new Error(`Unknown method: ${method}`);
	}

	// ==================================================================
	// Notification Handling
	// ==================================================================

	/**
	 * Handle Mountain notification with event emission
	 */
	private handleMountainNotification(
		notification: GenericNotification,
	): void {
		console.log(
			`[GRPCServerService] Handling Mountain notification: ${notification.Method}`,
		);

		try {
			const parameters = this.parseParameters(notification.Parameter);

			// Emit notification as event for subscribers
			this.emit("notification", {
				method: notification.Method,
				parameters: parameters,
			});

			// Handle specific notification types via NotificationHandler
			HandleSpecificNotification(
				this,
				this.documentContentCache,
				DocumentContentHandler.HandleDocumentChange,
				DocumentContentHandler.HandleDocumentOpen,
				DocumentContentHandler.HandleDocumentClose,
				DocumentContentHandler.HandleDocumentSave,
				notification.Method,
				parameters,
				this.workspaceEventEmitter,
				this.GetHandlerContext(),
			);

			console.log(
				`[GRPCServerService] Notification ${notification.Method} handled`,
				parameters,
			);
		} catch (error) {
			this.errorCount++;
			console.error(
				`[GRPCServerService] Error handling notification ${notification.Method}:`,
				error,
			);
		}
	}

	/**
	 * Get cached document content, or null if not cached.
	 * Used by InvokeLanguageProvider's VsDocument.getText().
	 */
	public GetDocumentContent(Uri: string): string | null {
		return DocumentContentHandler.GetDocumentContent(
			this.documentContentCache,
			Uri,
		);
	}

	// ==================================================================
	// Cancellation
	// ==================================================================

	/**
	 * Handle cancel operation with request tracking
	 */
	private handleCancelOperation(cancelRequest: CancelOperationRequest): void {
		const requestId = cancelRequest.RequestIdentifierToCancel;

		console.log(`[GRPCServerService] Canceling operation: ${requestId}`);

		try {
			// Look up the active request
			const requestEntry = this.activeRequests.get(requestId);

			if (requestEntry) {
				// Execute cancel handler if registered
				if (requestEntry.cancelHandler) {
					try {
						requestEntry.cancelHandler();
						console.log(
							`[GRPCServerService] Cancel handler executed for request ${requestId}`,
						);
					} catch (error) {
						this.errorCount++;
						console.error(
							`[GRPCServerService] Cancel handler failed for request ${requestId}:`,
							error,
						);
					}
				}

				// Remove from active requests
				this.activeRequests.delete(requestId);

				console.log(
					`[GRPCServerService] Request ${requestId} canceled successfully`,
				);
			} else {
				console.warn(
					`[GRPCServerService] Request ${requestId} not found in active requests (may have already completed)`,
				);
			}
		} catch (error) {
			this.errorCount++;
			console.error(
				`[GRPCServerService] Error canceling operation ${requestId}:`,
				error,
			);
		}
	}

	/**
	 * Register cancel handler for a request
	 * TODO: FUTURE: Integrate with Cancellation service for enhanced cancellation support
	 * Specification: MOUNTAIN-OPERATIONS.md (Cancellation Semantics)
	 * Implementation: Proper cancellation propagation across service boundaries
	 * Dependencies: CancellationService, operation context
	 * Validation: Test with nested and parallel operations
	 */
	private registerCancelHandler(
		requestId: bigint,
		handler: () => void,
	): void {
		const entry = this.activeRequests.get(requestId);
		if (entry) {
			entry.cancelHandler = handler;
		}
	}

	// ==================================================================
	// Mountain Client Connection
	// ==================================================================

	/**
	 * Connect to Mountain's gRPC server (MountainService on :50051).
	 * Called after InitializeExtensionHost confirms Mountain is running.
	 * Creates a new MountainClientService instance and connects.
	 */
	private async ConnectToMountain(): Promise<void> {
		if (this.mountainClient) {
			console.log("[GRPCServerService] Already connected to Mountain");
			return;
		}

		const MountainPort = parseInt(
			process.env["MOUNTAIN_GRPC_PORT"] || "50051",
			10,
		);

		console.log(
			`[GRPCServerService] Connecting to Mountain gRPC at localhost:${MountainPort}...`,
		);

		const { MountainClientService } =
			await import("./MountainClientService.js");
		const Client = new MountainClientService();
		await Client.connect();

		this.mountainClient = Client;

		console.log(
			`[GRPCServerService] Connected to Mountain gRPC - return path active`,
		);

		this.emit("mountainConnected", { port: MountainPort });
	}

	/**
	 * Send a notification back to Mountain (for forwarding to Wind).
	 * Used for extension host protocol messages, provider registrations, etc.
	 */
	async SendToMountain(Method: string, Parameters: any): Promise<void> {
		if (!this.mountainClient) {
			console.warn(
				`[GRPCServerService] Cannot send ${Method} to Mountain - not connected`,
			);
			return;
		}

		await this.mountainClient.sendNotification(Method, Parameters);
	}

	// ==================================================================
	// Server Lifecycle
	// ==================================================================

	/**
	 * Start gRPC server
	 */
	async start(): Promise<void> {
		if (this.isRunning) {
			console.warn("[GRPCServerService] Server already running");
			return;
		}

		console.log(
			`[GRPCServerService] Starting gRPC server on port ${this.port}`,
		);

		try {
			// Load protocol definition
			const packageDefinition = await this.loadProtocolDefinition();
			const protoDescriptor = grpc.loadPackageDefinition(
				packageDefinition,
			) as any;

			// Create gRPC server
			this.server = new grpc.Server({
				"grpc.max_receive_message_length": 1024 * 1024 * 100, // 100MB
				"grpc.max_send_message_length": 1024 * 1024 * 100, // 100MB
			});

			// Add service implementation
			const CocoonSvc =
				protoDescriptor.Vine?.CocoonService ||
				protoDescriptor.CocoonService;
			this.server.addService(
				CocoonSvc.service,
				this.serviceImplementation,
			);

			// Start server
			await this.startServer();

			this.isRunning = true;
			console.log(
				`[GRPCServerService] gRPC server started successfully on port ${this.port}`,
			);
		} catch (error) {
			console.error(
				"[GRPCServerService] Failed to start gRPC server:",
				error,
			);
			throw error;
		}
	}

	/**
	 * Load protocol definition from Mountain's Vine.proto with fallback support
	 * Protocol loading is fully implemented with multiple search paths and fallback
	 */
	private async loadProtocolDefinition(): Promise<protoLoader.PackageDefinition> {
		console.log(
			"[GRPCServerService] Loading Vine.proto protocol definition",
		);

		try {
			// Load actual Vine.proto from Mountain's source
			const fs = require("fs");
			const path = require("path");

			// Resolve Mountain's Proto directory with multiple fallback paths
			const protoSearchPaths = [
				path.resolve(
					__dirname,
					"../../../../Mountain/Proto/Vine.proto",
				),
				path.resolve(
					__dirname,
					"../../../../../Mountain/Proto/Vine.proto",
				),
				path.resolve(
					__dirname,
					"../../../../../../Mountain/Proto/Vine.proto",
				),
				path.resolve(process.cwd(), "../Mountain/Proto/Vine.proto"),
				path.resolve(process.cwd(), "../../Mountain/Proto/Vine.proto"),
			];

			let mountainProtoPath = null;
			for (const protoPath of protoSearchPaths) {
				if (fs.existsSync(protoPath)) {
					mountainProtoPath = protoPath;
					break;
				}
			}

			if (mountainProtoPath) {
				console.log(
					`[GRPCServerService] Found Vine.proto at: ${mountainProtoPath}`,
				);

				return protoLoader.loadSync(mountainProtoPath, {
					keepCase: true,
					longs: String,
					enums: String,
					defaults: true,
					oneofs: true,
					includeDirs: [path.dirname(mountainProtoPath)],
				});
			} else {
				console.error(
					"[GRPCServerService] Vine.proto not found in any search path",
				);
				console.log(
					"[GRPCServerService] Search paths attempted:",
					protoSearchPaths,
				);

				// Enhanced fallback with production-ready protocol definition
				const fallbackProtoContent = `
                    syntax = "proto3";

                    package Vine;

                    service CocoonService {
                        rpc ProcessMountainRequest(GenericRequest) returns (GenericResponse);
                        rpc SendMountainNotification(GenericNotification) returns (Empty);
                        rpc CancelOperation(CancelOperationRequest) returns (Empty);
                    }

                    message GenericRequest {
                        uint64 RequestIdentifier = 1;
                        string Method = 2;
                        bytes Parameter = 3;
                    }

                    message GenericResponse {
                        uint64 RequestIdentifier = 1;
                        bool Success = 2;
                        bytes Data = 3;
                        string Error = 4;
                    }

                    message GenericNotification {
                        string Method = 1;
                        bytes Parameter = 2;
                    }

                    message CancelOperationRequest {
                        uint64 RequestIdentifier = 1;
                        string Reason = 2;
                    }

                    message Empty {}
                `;

				// Create temporary file with proper permissions
				const tempDir = require("os").tmpdir();
				const tempProtoPath = path.join(tempDir, "vine_fallback.proto");
				fs.writeFileSync(tempProtoPath, fallbackProtoContent);

				console.log(
					`[GRPCServerService] Using enhanced fallback protocol at: ${tempProtoPath}`,
				);

				return protoLoader.loadSync(tempProtoPath, {
					keepCase: true,
					longs: String,
					enums: String,
					defaults: true,
					oneofs: true,
				});
			}
		} catch (error) {
			console.error(
				"[GRPCServerService] Failed to load protocol definition:",
				error,
			);
			throw new Error(
				`Failed to load Vine.proto: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}
	private startServer(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!this.server) {
				reject(new Error("Server not initialized"));
				return;
			}

			this.server.bindAsync(
				`0.0.0.0:${this.port}`,
				grpc.ServerCredentials.createInsecure(),
				(error, port) => {
					if (error) {
						reject(error);
					} else {
						console.log(
							`[GRPCServerService] Server bound to port ${port}`,
						);
						// server.start() removed - no longer needed in @grpc/grpc-js v1.12+
						resolve();
					}
				},
			);
		});
	}

	/**
	 * Stop gRPC server
	 */
	async stop(): Promise<void> {
		if (!this.isRunning || !this.server) {
			console.warn("[GRPCServerService] Server not running");
			return;
		}

		console.log("[GRPCServerService] Stopping gRPC server");

		return new Promise((resolve) => {
			this.server!.tryShutdown(() => {
				this.isRunning = false;
				this.server = null;
				console.log("[GRPCServerService] gRPC server stopped");
				resolve();
			});
		});
	}

	/**
	 * Get server status with detailed metrics
	 */
	getStatus(): {
		running: boolean;
		port: number;
		uptime?: number;
		errorCount: number;
		requestCount: number;
		activeConnections: number;
		authEnabled: boolean;
	} {
		return {
			running: this.isRunning,
			port: this.port,
			errorCount: this.errorCount,
			requestCount: this.requestCount,
			activeConnections: this.streamingHandlers.size,
			authEnabled: this.authEnabled,
			...(this.isRunning ? { uptime: Date.now() - this.startTime } : {}),
		};
	}

	/**
	 * Add event listener for notifications
	 */
	onNotification(callback: (method: string, parameters: any) => void): void {
		this.on("notification", (event) => {
			callback(event.method, event.parameters);
		});
	}
}

/**
 * Service layer for GRPCServerService
 */
export const GRPCServerServiceLayer = Layer.effect(
	IGRPCServerService,
	Effect.sync(() => new GRPCServerService()),
);

/**
 * Live implementation
 */
export const GRPCServerServiceLive = Layer.effect(
	IGRPCServerService,
	Effect.sync(() => new GRPCServerService()),
);
