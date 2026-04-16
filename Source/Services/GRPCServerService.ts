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
 * Based on Mountain's Vine gRPC protocol specification.
 * Specification: MOUNTAIN-COCOON-INTEGRATION.md (gRPC Server Implementation)
 */

import { EventEmitter } from "events";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname } from "path";

import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { Effect, Layer } from "effect";

// ESM compatibility — provide __dirname and require() for proto loading
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

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
import * as LanguageProviderRegistry from "./LanguageProviderRegistry.js";

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

	constructor() {
		super();
		this._serviceBrand = undefined;
		console.log("[GRPCServerService] Initializing gRPC server");

		// Parse environment variables
		this.parseEnvironment();

		// Create service implementation
		this.serviceImplementation = this.createServiceImplementation();

		console.log(`[GRPCServerService] Configured for port ${this.port}`);
	}

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
			console.error(
				`[GRPCServerService] Error processing request ${request.Method}:`,
				error,
			);

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
	 *   - "InitializeExtensionHost" — Mountain's extension host init handshake
	 *   - "$deltaExtensions", "$activateByEvent", "$startExtensionHost"
	 *     Mountain's extension host lifecycle methods
	 */
	private IsValidMethod(method: string): boolean {
		const DotMethod = /^[a-zA-Z]+\.[a-zA-Z]+$/.test(method);
		const ProvideMethod = /^\$provide[A-Z][a-zA-Z]+$/.test(method);
		const ExtensionHostMethod = /^(InitializeExtensionHost|\$deltaExtensions|\$activateByEvent|\$startExtensionHost)$/.test(method);
		return DotMethod || ProvideMethod || ExtensionHostMethod;
	}

	/**
	 * Serialize response data to buffer
	 */
	private SerializeResponseData(data: any): Buffer {
		try {
			const serialized = JSON.stringify(data);
			return Buffer.from(serialized, "utf8");
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
	 * Route request to appropriate service
	 * Service mapping and request routing is fully implemented
	 */
	private async routeRequest(method: string, parameters: any): Promise<any> {
		console.log(`[GRPCServerService] Routing request: ${method}`);

		// Service routing table with pattern matching
		const routePatterns = {
			"extension.\w+": async (method: string, params: any) => {
				// Route to ExtensionHostService via ServiceMapping
				const { ServiceMapping } = await import("../ServiceMapping");
				const { IExtensionHostService } =
					await import("../Interfaces/IExtensionHostService");

				switch (method) {
					case "extension.activate":
						const extensionHostService =
							await ServiceMapping.getService(
								IExtensionHostService,
							);
						return await extensionHostService.activateExtension(
							params.extensionId,
							params.reason,
						);
					case "extension.deactivate":
						const extensionHostService2 =
							await ServiceMapping.getService(
								IExtensionHostService,
							);
						await extensionHostService2.deactivateExtension(
							params.extensionId,
						);
						return { success: true };
					case "extension.get":
						const extensionHostService3 =
							await ServiceMapping.getService(
								IExtensionHostService,
							);
						return extensionHostService3.getActivatedExtension(
							params.extensionId,
						);
					default:
						throw new Error(`Unknown extension method: ${method}`);
				}
			},

			"configuration.\w+": async (method: string, params: any) => {
				// Route to ConfigurationService via ServiceMapping
				const { ServiceMapping } = await import("../ServiceMapping");
				const { IConfigurationService } =
					await import("../Interfaces/IConfigurationService");

				switch (method) {
					case "configuration.get":
						const configService = await ServiceMapping.getService(
							IConfigurationService,
						);
						return await configService.getValue(
							params.key,
							params.scope,
						);
					case "configuration.set":
						const configService2 = await ServiceMapping.getService(
							IConfigurationService,
						);
						await configService2.setValue(
							params.key,
							params.value,
							params.scope,
						);
						return { success: true };
					case "configuration.update":
						const configService3 = await ServiceMapping.getService(
							IConfigurationService,
						);
						await configService3.updateValue(
							params.key,
							params.updater,
							params.scope,
						);
						return { success: true };
					default:
						throw new Error(
							`Unknown configuration method: ${method}`,
						);
				}
			},

			"command.\w+": async (method: string, params: any) => {
				// Route to CommandService via ServiceMapping
				const { ServiceMapping } = await import("../ServiceMapping");
				const { IIPCService } =
					await import("../Interfaces/IIPCService");

				switch (method) {
					case "command.execute":
						const ipcService =
							await ServiceMapping.getService(IIPCService);
						return await ipcService.executeCommand(
							params.commandId,
							...(params.args || []),
						);
					case "command.register":
						const ipcService2 =
							await ServiceMapping.getService(IIPCService);
						const disposable = await ipcService2.registerCommand(
							params.commandId,
							params.callback,
						);
						return { disposableId: "command-registration" };
					case "command.get":
						const ipcService3 =
							await ServiceMapping.getService(IIPCService);
						return await ipcService3.getCommands();
					default:
						throw new Error(`Unknown command method: ${method}`);
				}
			},

			"performance.\w+": async (method: string, params: any) => {
				// Route to PerformanceMonitoringService via ServiceMapping
				const { ServiceMapping } = await import("../ServiceMapping");
				const { IPerformanceMonitoringService } =
					await import("../Interfaces/IPerformanceMonitoringService");

				switch (method) {
					case "performance.metrics":
						const perfService = await ServiceMapping.getService(
							IPerformanceMonitoringService,
						);
						return perfService.getMetrics();
					case "performance.alerts":
						const perfService2 = await ServiceMapping.getService(
							IPerformanceMonitoringService,
						);
						return perfService2.getAlerts();
					case "performance.report":
						const perfService3 = await ServiceMapping.getService(
							IPerformanceMonitoringService,
						);
						return perfService3.generateReport();
					default:
						throw new Error(
							`Unknown performance method: ${method}`,
						);
				}
			},

			"security.\w+": async (method: string, params: any) => {
				// Route to SecurityService via ServiceMapping
				const { ServiceMapping } = await import("../ServiceMapping");
				const { ISecurityService } =
					await import("../Interfaces/ISecurityService");

				switch (method) {
					case "security.policy":
						const securityService =
							await ServiceMapping.getService(ISecurityService);
						return await securityService.getSecurityPolicy(
							params.extensionId,
						);
					case "security.audit":
						const securityService2 =
							await ServiceMapping.getService(ISecurityService);
						return securityService2.getAuditLog();
					case "security.incidents":
						const securityService3 =
							await ServiceMapping.getService(ISecurityService);
						return securityService3.getActiveIncidents();
					default:
						throw new Error(`Unknown security method: ${method}`);
				}
			},
		};

		// Find matching route pattern
		for (const [pattern, handler] of Object.entries(routePatterns)) {
			const regex = new RegExp(pattern);
			if (regex.test(method)) {
				return handler(method, parameters);
			}
		}

		// Extension host lifecycle methods from Mountain
		if (method === "InitializeExtensionHost") {
			return this.HandleInitializeExtensionHost(parameters);
		}
		if (method === "$deltaExtensions") {
			return this.HandleDeltaExtensions(parameters);
		}
		if (method === "$activateByEvent") {
			return this.HandleActivateByEvent(parameters);
		}
		if (method === "$startExtensionHost") {
			return this.HandleStartExtensionHost(parameters);
		}

		// Language feature provider invocation: "$provideHover", "$provideCompletions", etc.
		// Mountain calls these when Sky's Monaco editor requests language intelligence.
		// parameters = [handle, uriObject, position?, context?]
		if (/^\$provide[A-Z]/.test(method)) {
			return this.InvokeLanguageProvider(method, parameters);
		}

		throw new Error(`Unknown method: ${method}`);
	}

	// ==================================================================
	// Extension Host Lifecycle Handlers
	// ==================================================================

	/**
	 * Handle InitializeExtensionHost from Mountain.
	 * Receives the full IExtensionHostInitData payload (extensions list,
	 * workspace, environment, telemetry, paths). Stores init data and
	 * returns "initialized" so Mountain unblocks.
	 */
	private async HandleInitializeExtensionHost(
		parameters: any,
	): Promise<string> {
		const Extensions: any[] = parameters?.extensions ?? [];

		console.log(
			`[GRPCServerService] InitializeExtensionHost received ${Extensions.length} extensions`,
		);

		// Store init data for later use by extension activation
		this.extensionHostInitData = parameters;

		// Build extension registry and activation event index
		this.extensionRegistry.clear();
		this.activationEventIndex.clear();

		for (const Extension of Extensions) {
			const Identifier =
				Extension?.identifier?.value ??
				Extension?.identifier?.id ??
				Extension?.identifier ??
				"unknown";

			this.extensionRegistry.set(Identifier, Extension);

			const ActivationEvents: string[] =
				Extension?.activationEvents ?? [];

			for (const Event of ActivationEvents) {
				const Existing = this.activationEventIndex.get(Event) ?? [];
				Existing.push(Identifier);
				this.activationEventIndex.set(Event, Existing);
			}
		}

		this.extensionHostReady = true;

		console.log(
			`[GRPCServerService] Extension registry: ${this.extensionRegistry.size} extensions, ${this.activationEventIndex.size} activation events`,
		);

		// Emit event so other Cocoon services can react
		this.emit("extensionHostInitialized", {
			extensionCount: this.extensionRegistry.size,
			autoStart: parameters?.autoStart ?? false,
		});

		// Mountain's gRPC is now confirmed running (it just called us).
		// Reconnect MountainClientService in the background so Cocoon can
		// send notifications back (provider registrations, extension host
		// messages, etc.). Fire-and-forget — don't block the response.
		this.ConnectToMountain().catch((Error) => {
			console.warn(
				"[GRPCServerService] Background Mountain reconnect failed:",
				Error instanceof globalThis.Error ? Error.message : String(Error),
			);
		});

		return "initialized";
	}

	/**
	 * Handle $deltaExtensions from Mountain.
	 * Receives extension list diffs (added/removed) after initial load.
	 */
	private async HandleDeltaExtensions(parameters: any): Promise<any> {
		const Added: any[] = parameters?.toAdd ?? [];
		const Removed: any[] = parameters?.toRemove ?? [];

		console.log(
			`[GRPCServerService] $deltaExtensions: +${Added.length} -${Removed.length}`,
		);

		// Add new extensions to registry
		for (const Extension of Added) {
			const Identifier =
				Extension?.identifier?.value ??
				Extension?.identifier?.id ??
				Extension?.identifier ??
				"unknown";

			this.extensionRegistry.set(Identifier, Extension);

			const ActivationEvents: string[] =
				Extension?.activationEvents ?? [];

			for (const Event of ActivationEvents) {
				const Existing = this.activationEventIndex.get(Event) ?? [];

				if (!Existing.includes(Identifier)) {
					Existing.push(Identifier);
					this.activationEventIndex.set(Event, Existing);
				}
			}
		}

		// Remove extensions from registry
		for (const Extension of Removed) {
			const Identifier =
				Extension?.identifier?.value ??
				Extension?.identifier?.id ??
				Extension?.identifier ??
				"unknown";

			this.extensionRegistry.delete(Identifier);
		}

		this.emit("deltaExtensions", { added: Added.length, removed: Removed.length });

		return {
			success: true,
			registrySize: this.extensionRegistry.size,
		};
	}

	/**
	 * Handle $activateByEvent from Mountain.
	 * Activates all extensions that declare the given activation event.
	 */
	private async HandleActivateByEvent(parameters: any): Promise<any> {
		// Ensure the vscode API shim is available before any extension loads
		await this.EnsureVscodeAPIRegistered();

		const ActivationEvent =
			typeof parameters === "string"
				? parameters
				: parameters?.activationEvent ?? parameters?.event ?? "*";

		// For "*" we activate all extensions that have any activation event.
		// For a specific event we activate matching ones AND "*" ones.
		let MatchingExtensions: string[];
		if (ActivationEvent === "*") {
			// Collect all extensions across every event bucket (deduplicated)
			const All = new Set<string>();
			for (const Ids of this.activationEventIndex.values()) {
				for (const Id of Ids) All.add(Id);
			}
			MatchingExtensions = [...All];
		} else {
			const Specific = this.activationEventIndex.get(ActivationEvent) ?? [];
			const Star = this.activationEventIndex.get("*") ?? [];
			MatchingExtensions = [...new Set([...Specific, ...Star])];
		}

		console.log(
			`[GRPCServerService] $activateByEvent: ${ActivationEvent} → ${MatchingExtensions.length} extensions`,
		);
		if (MatchingExtensions.length > 0) {
			console.log(
				`[GRPCServerService] Activating: ${MatchingExtensions.slice(0, 5).join(", ")}${MatchingExtensions.length > 5 ? ` (+${MatchingExtensions.length - 5} more)` : ""}`,
			);
		} else {
			console.log(
				`[GRPCServerService] Available events: ${[...this.activationEventIndex.keys()].slice(0, 10).join(", ")}${this.activationEventIndex.size > 10 ? ` (+${this.activationEventIndex.size - 10} more)` : ""}`,
			);
		}

		// Fire-and-forget — activate each matching extension asynchronously.
		// We cap concurrent activations to avoid flooding the event loop.
		const ToActivate = MatchingExtensions.filter(Id => !this.activatedExtensions.has(Id));
		console.log(`[GRPCServerService] $activateByEvent: ${ToActivate.length} new activations (${MatchingExtensions.length - ToActivate.length} already active)`);

		for (const ExtId of ToActivate) {
			this.ActivateExtension(ExtId, ActivationEvent).catch((Err: unknown) => {
				const Msg = Err instanceof Error ? Err.message : String(Err);
				console.warn(`[GRPCServerService] Activation failed for ${ExtId}: ${Msg}`);
			});
		}

		// Keep legacy event for any listeners
		this.emit("activateByEvent", {
			event: ActivationEvent,
			extensions: MatchingExtensions,
		});

		return {
			success: true,
			activated: ToActivate.length,
		};
	}

	/**
	 * Create a vscode API shim and register it on globalThis so the Module._load
	 * hook can return it when extensions call require('vscode').
	 * Uses real VS Code type constructors from @codeeditorland/output.
	 */
	private async EnsureVscodeAPIRegistered(): Promise<void> {
		if ((globalThis as any).__cocoonVscodeAPI) return;

		try {
			const VsCodeTypes = await import(
				"@codeeditorland/output/vs/workbench/api/common/extHostTypes"
			);
			const { URI } = await import(
				"@codeeditorland/output/vs/base/common/uri"
			);
			const { CancellationTokenSource } = await import(
				"@codeeditorland/output/vs/base/common/cancellation"
			);
			const { Emitter } = await import(
				"@codeeditorland/output/vs/base/common/event"
			);

			const API = {
				version: "1.88.0",
				// Type constructors
				Position: VsCodeTypes.Position,
				Range: VsCodeTypes.Range,
				Location: VsCodeTypes.Location,
				Selection: VsCodeTypes.Selection,
				MarkdownString: VsCodeTypes.MarkdownString,
				Hover: VsCodeTypes.Hover,
				CompletionItem: VsCodeTypes.CompletionItem,
				CompletionItemKind: VsCodeTypes.CompletionItemKind,
				CompletionList: VsCodeTypes.CompletionList,
				CompletionTriggerKind: VsCodeTypes.CompletionTriggerKind,
				Diagnostic: VsCodeTypes.Diagnostic,
				DiagnosticSeverity: VsCodeTypes.DiagnosticSeverity,
				TextEdit: VsCodeTypes.TextEdit,
				WorkspaceEdit: VsCodeTypes.WorkspaceEdit,
				SnippetString: VsCodeTypes.SnippetString,
				SymbolKind: VsCodeTypes.SymbolKind,
				SymbolInformation: VsCodeTypes.SymbolInformation,
				DocumentSymbol: VsCodeTypes.DocumentSymbol,
				CodeActionKind: VsCodeTypes.CodeActionKind,
				CodeAction: VsCodeTypes.CodeAction,
				SignatureHelp: VsCodeTypes.SignatureHelp,
				SignatureInformation: VsCodeTypes.SignatureInformation,
				ParameterInformation: VsCodeTypes.ParameterInformation,
				InlayHint: VsCodeTypes.InlayHint,
				InlayHintKind: VsCodeTypes.InlayHintKind,
				FoldingRange: VsCodeTypes.FoldingRange,
				FoldingRangeKind: VsCodeTypes.FoldingRangeKind,
				DocumentHighlight: VsCodeTypes.DocumentHighlight,
				DocumentHighlightKind: VsCodeTypes.DocumentHighlightKind,
				SelectionRange: VsCodeTypes.SelectionRange,
				SemanticTokensLegend: VsCodeTypes.SemanticTokensLegend,
				SemanticTokensBuilder: VsCodeTypes.SemanticTokensBuilder,
				SemanticTokens: VsCodeTypes.SemanticTokens,
				RelativePattern: VsCodeTypes.RelativePattern,
				Disposable: VsCodeTypes.Disposable,
				StatusBarAlignment: VsCodeTypes.StatusBarAlignment,
				ThemeColor: VsCodeTypes.ThemeColor,
				ThemeIcon: VsCodeTypes.ThemeIcon,
				TreeItem: VsCodeTypes.TreeItem,
				TreeItemCollapsibleState: VsCodeTypes.TreeItemCollapsibleState,
				ViewColumn: VsCodeTypes.ViewColumn,
				EndOfLine: VsCodeTypes.EndOfLine,
				ConfigurationTarget: VsCodeTypes.ConfigurationTarget,
				Uri: URI,
				CancellationTokenSource,
				EventEmitter: Emitter,
				// Namespaces — minimal stubs wired to Mountain via gRPC
				window: {
					showInformationMessage: async (Message: string, ...Items: unknown[]) => {
						this.SendToMountain("window.showMessage", { message: Message, level: "info", items: Items }).catch(() => {});
						return undefined;
					},
					showErrorMessage: async (Message: string, ...Items: unknown[]) => {
						this.SendToMountain("window.showMessage", { message: Message, level: "error", items: Items }).catch(() => {});
						return undefined;
					},
					showWarningMessage: async (Message: string, ...Items: unknown[]) => {
						this.SendToMountain("window.showMessage", { message: Message, level: "warn", items: Items }).catch(() => {});
						return undefined;
					},
					createTerminal: () => ({ sendText: async () => {}, show: () => {}, hide: () => {}, dispose: () => {} }),
					createStatusBarItem: () => ({ show: () => {}, hide: () => {}, dispose: () => {}, text: "", tooltip: "" }),
					createOutputChannel: () => ({ append: () => {}, appendLine: () => {}, clear: () => {}, show: () => {}, hide: () => {}, dispose: () => {} }),
					withProgress: async (_Opt: unknown, Task: any) => Task({ report: () => {} }),
					onDidChangeActiveTextEditor: () => ({ dispose: () => {} }),
					onDidChangeVisibleTextEditors: () => ({ dispose: () => {} }),
					onDidChangeTextEditorSelection: () => ({ dispose: () => {} }),
					onDidChangeTextEditorVisibleRanges: () => ({ dispose: () => {} }),
					activeTextEditor: undefined,
					visibleTextEditors: [],
				},
				workspace: {
					workspaceFolders: [],
					getConfiguration: () => ({
						get: (_Key: string, DefaultValue?: unknown) => DefaultValue,
						update: async () => {},
						has: () => false,
						inspect: () => undefined,
					}),
					findFiles: async () => [],
					openTextDocument: async (Uri: any) => ({
						getText: () => "",
						uri: Uri,
						languageId: "plaintext",
						lineCount: 0,
						fileName: "",
					}),
					onDidOpenTextDocument: () => ({ dispose: () => {} }),
					onDidCloseTextDocument: () => ({ dispose: () => {} }),
					onDidChangeTextDocument: () => ({ dispose: () => {} }),
					onDidChangeConfiguration: () => ({ dispose: () => {} }),
					onDidChangeWorkspaceFolders: () => ({ dispose: () => {} }),
					fs: {
						stat: async () => ({ type: 1, size: 0, ctime: 0, mtime: 0 }),
						readFile: async () => new Uint8Array(),
						writeFile: async () => {},
						readDirectory: async () => [],
						createDirectory: async () => {},
						delete: async () => {},
						rename: async () => {},
					},
				},
				commands: {
					registerCommand: (Command: string, Callback: Function) => {
						LanguageProviderRegistry.RegisterCommand(Command, Callback);
						this.SendToMountain("registerCommand", { commandId: Command }).catch(() => {});
						return { dispose: () => {} };
					},
					executeCommand: async (Command: string, ...Args: unknown[]) => {
						// Try local handler first, then forward to Mountain
						const LocalResult = LanguageProviderRegistry.ExecuteCommand(Command, ...Args);
						if (LocalResult !== undefined) return LocalResult;
						try {
							return await this.mountainClient?.sendRequest("executeCommand", { commandId: Command, arguments: Args });
						} catch { return undefined; }
					},
					getCommands: async () => [] as string[],
				},
				languages: {
					registerHoverProvider: (Selector: any, Provider: any) => {
						const Handle = LanguageProviderRegistry.RegisterAutoHandle(Provider);
						const Lang = typeof Selector === "string" ? Selector : Selector?.language ?? "*";
						this.SendToMountain("register_hover_provider", { handle: Handle, language_selector: Lang, extension_id: "" }).catch(() => {});
						return { dispose: () => LanguageProviderRegistry.Unregister(Handle) };
					},
					registerCompletionItemProvider: (Selector: any, Provider: any, ...TriggerChars: string[]) => {
						const Handle = LanguageProviderRegistry.RegisterAutoHandle(Provider);
						const Lang = typeof Selector === "string" ? Selector : Selector?.language ?? "*";
						this.SendToMountain("register_completion_item_provider", { handle: Handle, language_selector: Lang, extension_id: "" }).catch(() => {});
						return { dispose: () => LanguageProviderRegistry.Unregister(Handle) };
					},
					registerDefinitionProvider: (Selector: any, Provider: any) => {
						const Handle = LanguageProviderRegistry.RegisterAutoHandle(Provider);
						const Lang = typeof Selector === "string" ? Selector : Selector?.language ?? "*";
						this.SendToMountain("register_definition_provider", { handle: Handle, language_selector: Lang, extension_id: "" }).catch(() => {});
						return { dispose: () => LanguageProviderRegistry.Unregister(Handle) };
					},
					registerReferenceProvider: (Selector: any, Provider: any) => {
						const Handle = LanguageProviderRegistry.RegisterAutoHandle(Provider);
						const Lang = typeof Selector === "string" ? Selector : Selector?.language ?? "*";
						this.SendToMountain("register_reference_provider", { handle: Handle, language_selector: Lang, extension_id: "" }).catch(() => {});
						return { dispose: () => LanguageProviderRegistry.Unregister(Handle) };
					},
					registerCodeActionsProvider: (Selector: any, Provider: any) => {
						const Handle = LanguageProviderRegistry.RegisterAutoHandle(Provider);
						const Lang = typeof Selector === "string" ? Selector : Selector?.language ?? "*";
						this.SendToMountain("register_code_actions_provider", { handle: Handle, language_selector: Lang, extension_id: "" }).catch(() => {});
						return { dispose: () => LanguageProviderRegistry.Unregister(Handle) };
					},
					registerDocumentSymbolProvider: (Selector: any, Provider: any) => {
						const Handle = LanguageProviderRegistry.RegisterAutoHandle(Provider);
						const Lang = typeof Selector === "string" ? Selector : Selector?.language ?? "*";
						this.SendToMountain("register_document_symbol_provider", { handle: Handle, language_selector: Lang, extension_id: "" }).catch(() => {});
						return { dispose: () => LanguageProviderRegistry.Unregister(Handle) };
					},
					registerDocumentFormattingEditProvider: (Selector: any, Provider: any) => {
						const Handle = LanguageProviderRegistry.RegisterAutoHandle(Provider);
						const Lang = typeof Selector === "string" ? Selector : Selector?.language ?? "*";
						this.SendToMountain("register_document_formatting_provider", { handle: Handle, language_selector: Lang, extension_id: "" }).catch(() => {});
						return { dispose: () => LanguageProviderRegistry.Unregister(Handle) };
					},
					createDiagnosticCollection: (Name?: string) => ({
						name: Name ?? "default",
						set: () => {},
						delete: () => {},
						clear: () => {},
						forEach: () => {},
						get: () => [],
						has: () => false,
						dispose: () => {},
					}),
					registerSignatureHelpProvider: (_S: any, _P: any) => ({ dispose: () => {} }),
					registerDocumentHighlightProvider: (_S: any, _P: any) => ({ dispose: () => {} }),
					registerCodeLensProvider: (_S: any, _P: any) => ({ dispose: () => {} }),
					registerRenameProvider: (_S: any, _P: any) => ({ dispose: () => {} }),
					registerFoldingRangeProvider: (_S: any, _P: any) => ({ dispose: () => {} }),
					registerSelectionRangeProvider: (_S: any, _P: any) => ({ dispose: () => {} }),
					registerDocumentSemanticTokensProvider: (_S: any, _P: any, _L: any) => ({ dispose: () => {} }),
					registerInlayHintsProvider: (_S: any, _P: any) => ({ dispose: () => {} }),
					getLanguages: async () => [] as string[],
					match: () => 0,
					onDidChangeDiagnostics: () => ({ dispose: () => {} }),
					getDiagnostics: () => [],
				},
				extensions: {
					getExtension: (_Id: string) => undefined,
					all: [],
					onDidChange: () => ({ dispose: () => {} }),
				},
				env: {
					appName: "CodeEditorLand",
					appRoot: "",
					language: "en",
					machineId: "land",
					sessionId: "land-session",
					uriScheme: "vscode",
					clipboard: { readText: async () => "", writeText: async () => {} },
				},
				debug: {
					registerDebugAdapterDescriptorFactory: () => ({ dispose: () => {} }),
					registerDebugConfigurationProvider: () => ({ dispose: () => {} }),
					startDebugging: async () => false,
					onDidStartDebugSession: () => ({ dispose: () => {} }),
					onDidTerminateDebugSession: () => ({ dispose: () => {} }),
					onDidChangeActiveDebugSession: () => ({ dispose: () => {} }),
					onDidReceiveDebugSessionCustomEvent: () => ({ dispose: () => {} }),
					activeDebugSession: undefined,
					breakpoints: [],
				},
				tasks: {
					registerTaskProvider: () => ({ dispose: () => {} }),
					fetchTasks: async () => [],
					executeTask: async () => undefined,
					onDidStartTask: () => ({ dispose: () => {} }),
					onDidEndTask: () => ({ dispose: () => {} }),
				},
				scm: {
					createSourceControl: () => ({
						inputBox: { value: "" },
						createResourceGroup: () => ({ resourceStates: [], dispose: () => {} }),
						dispose: () => {},
					}),
				},
				authentication: {
					registerAuthenticationProvider: () => ({ dispose: () => {} }),
					getSession: async () => undefined,
					onDidChangeSessions: () => ({ dispose: () => {} }),
				},
			};

			(globalThis as any).__cocoonVscodeAPI = API;
			console.log("[GRPCServerService] vscode API shim registered on globalThis.__cocoonVscodeAPI");
		} catch (Err: unknown) {
			console.warn(
				"[GRPCServerService] Failed to create vscode API shim:",
				Err instanceof Error ? Err.message : String(Err),
			);
		}
	}

	/**
	 * Load and activate a single extension from disk.
	 * Expects extensionRegistry entries from Mountain's InitializeExtensionHost.
	 */
	private async ActivateExtension(ExtensionId: string, ActivationEvent: string): Promise<void> {
		// Guard: only activate once
		if (this.activatedExtensions.has(ExtensionId)) return;
		this.activatedExtensions.add(ExtensionId);

		const Extension = this.extensionRegistry.get(ExtensionId);
		if (!Extension) return;

		// Mountain sends ExtensionLocation as a file:// URL (from url::Url::from_directory_path)
		const LocationRaw: unknown =
			Extension?.ExtensionLocation ??
			Extension?.extensionLocation ??
			Extension?.location?.path ??
			Extension?.location;
		const MainFile: string | undefined = Extension?.main ?? Extension?.Main;

		// Declarative extensions (themes, grammars) have no main — mark activated and return.
		if (!LocationRaw || !MainFile) {
			return;
		}

		// Convert file:// URL to filesystem path
		let ExtensionPath: string;
		try {
			ExtensionPath = new URL(String(LocationRaw)).pathname.replace(/\/$/, "");
		} catch {
			ExtensionPath = String(LocationRaw).replace(/^file:\/\//, "").replace(/\/$/, "");
		}

		const ModulePath = `${ExtensionPath}/${MainFile}`;

		console.log(`[GRPCServerService] Loading ${ExtensionId} from ${ModulePath}`);

		try {
			// Module._load is patched by ModuleInterceptor — require('vscode') returns our API shim.
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const ExtModule: { activate?: (ctx: unknown) => unknown } = require(ModulePath);

			if (typeof ExtModule?.activate === "function") {
				const Context = this.CreateExtensionContext(Extension, ExtensionPath);
				await ExtModule.activate(Context);
				console.log(`[GRPCServerService] ${ExtensionId} activated (event: ${ActivationEvent})`);
			}
		} catch (Err: unknown) {
			// Remove from set so a retry is possible
			this.activatedExtensions.delete(ExtensionId);
			throw Err;
		}
	}

	/**
	 * Build a minimal VS Code ExtensionContext for activating an extension.
	 */
	private CreateExtensionContext(Extension: any, ExtensionPath: string): unknown {
		const ExtId: string =
			Extension?.identifier?.value ??
			Extension?.identifier?.id ??
			Extension?.identifier ??
			"";

		// Resolve real storage paths for the extension
		const HomeDir = process.env["HOME"] ?? process.env["USERPROFILE"] ?? "/tmp";
		const StorageBase = `${HomeDir}/.codeeditorland/extensions/storage`;
		const GlobalStorageBase = `${HomeDir}/.codeeditorland/globalStorage`;
		const LogBase = `${HomeDir}/.codeeditorland/logs`;
		const ExtStoragePath = `${StorageBase}/${ExtId}`;
		const GlobalStoragePath = `${GlobalStorageBase}/${ExtId}`;
		const LogPath = `${LogBase}/${ExtId}`;

		// Ensure directories exist (fire-and-forget)
		try {
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const Fs = require("node:fs");
			Fs.mkdirSync(ExtStoragePath, { recursive: true });
			Fs.mkdirSync(GlobalStoragePath, { recursive: true });
			Fs.mkdirSync(LogPath, { recursive: true });
		} catch {}

		const MakeUri = (Path: string) => ({
			scheme: "file",
			path: Path,
			fsPath: Path,
			authority: "",
			query: "",
			fragment: "",
			with: () => ({}),
			toString: () => `file://${Path}`,
		});

		return {
			subscriptions: [] as { dispose(): unknown }[],
			extensionPath: ExtensionPath,
			extensionUri: MakeUri(ExtensionPath),
			globalState: {
				get: (_Key: string, DefaultValue?: unknown) => DefaultValue,
				update: async (_Key: string, _Value: unknown) => {},
				keys: () => [] as string[],
				setKeysForSync: (_Keys: string[]) => {},
			},
			workspaceState: {
				get: (_Key: string, DefaultValue?: unknown) => DefaultValue,
				update: async (_Key: string, _Value: unknown) => {},
				keys: () => [] as string[],
			},
			secrets: {
				get: async (Key: string) => {
					try {
						return await this.mountainClient?.sendRequest("secrets.get", { key: Key }) as string | undefined;
					} catch { return undefined; }
				},
				store: async (Key: string, Value: string) => {
					try { await this.mountainClient?.sendRequest("secrets.store", { key: Key, value: Value }); } catch {}
				},
				delete: async (Key: string) => {
					try { await this.mountainClient?.sendRequest("secrets.delete", { key: Key }); } catch {}
				},
				onDidChange: (_Listener: unknown) => ({ dispose: () => {} }),
			},
			environmentVariableCollection: {
				persistent: true,
				description: undefined,
				append: () => {},
				prepend: () => {},
				replace: () => {},
				get: () => undefined,
				forEach: () => {},
				delete: () => {},
				clear: () => {},
				getScoped: () => ({}),
				[Symbol.iterator]: () => ([] as unknown[]).values(),
			},
			storagePath: ExtStoragePath,
			globalStoragePath: GlobalStoragePath,
			logPath: LogPath,
			storageUri: MakeUri(ExtStoragePath),
			globalStorageUri: MakeUri(GlobalStoragePath),
			logUri: MakeUri(LogPath),
			extensionMode: 1, // ExtensionMode.Production
			extension: {
				id: ExtId,
				extensionUri: { scheme: "file", path: ExtensionPath, fsPath: ExtensionPath },
				extensionPath: ExtensionPath,
				isActive: true,
				packageJSON: Extension,
				extensionKind: 1,
				exports: undefined,
				activate: async () => {},
			},
			languageModelAccessInformation: {
				canSendRequest: (_Model: unknown) => false,
				onDidChange: (_Listener: unknown) => ({ dispose: () => {} }),
			},
		};
	}

	/**
	 * Handle $startExtensionHost from Mountain.
	 * Signals that the extension host should begin processing.
	 */
	private async HandleStartExtensionHost(parameters: any): Promise<any> {
		console.log(
			`[GRPCServerService] $startExtensionHost received (registry: ${this.extensionRegistry.size} extensions)`,
		);

		this.emit("startExtensionHost", {
			extensionCount: this.extensionRegistry.size,
			ready: this.extensionHostReady,
		});

		return {
			success: true,
			ready: this.extensionHostReady,
			extensionCount: this.extensionRegistry.size,
		};
	}

	/** Stored initialization data from Mountain's InitializeExtensionHost */
	private extensionHostInitData: any = null;

	/** Indexed extensions from InitializeExtensionHost, keyed by identifier */
	private extensionRegistry: Map<string, any> = new Map();

	/** Activation event → extension identifiers that declare it */
	private activationEventIndex: Map<string, string[]> = new Map();

	/** Whether the extension host has been initialized */
	private extensionHostReady: boolean = false;

	/** Track which extensions have already been activated (prevents double-activation) */
	private readonly activatedExtensions: Set<string> = new Set();

	/** Document content mirror — caches text content keyed by URI string.
	 * Updated by $acceptModelChanged notifications from Mountain.
	 * Read by InvokeLanguageProvider's VsDocument.getText() for real-time content. */
	private readonly documentContentCache: Map<string, string> = new Map();

	/** Reverse gRPC client for sending messages back to Mountain */
	private mountainClient: import("./MountainClientService.js").MountainClientService | null = null;

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

		const { MountainClientService } = await import(
			"./MountainClientService.js"
		);
		const Client = new MountainClientService();
		await Client.connect();

		this.mountainClient = Client;

		console.log(
			`[GRPCServerService] Connected to Mountain gRPC — return path active`,
		);

		this.emit("mountainConnected", { port: MountainPort });
	}

	/**
	 * Send a notification back to Mountain (for forwarding to Wind).
	 * Used for extension host protocol messages, provider registrations, etc.
	 */
	async SendToMountain(
		Method: string,
		Parameters: any,
	): Promise<void> {
		if (!this.mountainClient) {
			console.warn(
				`[GRPCServerService] Cannot send ${Method} to Mountain — not connected`,
			);
			return;
		}

		await this.mountainClient.sendNotification(Method, Parameters);
	}

	/**
	 * Normalize a VS Code range { start: { line, character }, end: {...} } →
	 * Mountain's RangeDTO { StartLineNumber, StartColumn, EndLineNumber, EndColumn }.
	 */
	private NormalizeRange(VsRange: any): {
		StartLineNumber: number;
		StartColumn: number;
		EndLineNumber: number;
		EndColumn: number;
	} {
		return {
			StartLineNumber: VsRange?.start?.line ?? 0,
			StartColumn: VsRange?.start?.character ?? 0,
			EndLineNumber: VsRange?.end?.line ?? 0,
			EndColumn: VsRange?.end?.character ?? 0,
		};
	}

	/**
	 * Invoke a language feature provider stored in LanguageProviderRegistry.
	 *
	 * Called for methods matching /^\$provide[A-Z]/. Mountain passes:
	 *   params[0]  = provider handle (number)
	 *   params[1]  = URI object  { external: "file:///...", $mid: 1 }
	 *   params[2]  = Position    { Line/line, Character/character }  (most features)
	 *   params[3]  = Context / Options (completion, code actions, etc.)
	 *
	 * Returns the raw VS Code provider result (serialized by the caller).
	 */
	private async InvokeLanguageProvider(
		method: string,
		parameters: any,
	): Promise<any> {
		const Args: any[] = Array.isArray(parameters)
			? parameters
			: [parameters];

		const Handle: number = Args[0];
		const Provider = LanguageProviderRegistry.Get(Handle);

		if (!Provider) {
			console.warn(
				`[GRPCServerService] Provider handle ${Handle} not found for ${method}`,
			);
			return null;
		}

		// Build VS Code-compatible document and position shims from Mountain params.
		const UriObj = Args[1] as { external?: string } | string | undefined;
		const UriString =
			typeof UriObj === "string"
				? UriObj
				: (UriObj?.external ?? "file:///unknown");

		const RawPos = Args[2] as
			| {
					Line?: number;
					line?: number;
					Character?: number;
					character?: number;
			  }
			| undefined;
		const PosLine = RawPos?.Line ?? RawPos?.line ?? 0;
		const PosChar = RawPos?.Character ?? RawPos?.character ?? 0;

		// Real VS Code Position and Range classes from @codeeditorland/output.
		// Compiled from the VS Code source tree - no hand-written shims.
		const { Position, Range } = await import(
			"@codeeditorland/output/vs/workbench/api/common/extHostTypes"
		);
		const VsPosition = new Position(PosLine, PosChar);

		// Build a TextDocument shim that reads content from disk lazily.
		// Extensions calling getText() get real file content; lineAt() returns
		// real lines. Content is cached per invocation to avoid repeated I/O.
		const Ext = UriString.split(".").pop() ?? "";
		const LangId = (() => {
			switch (Ext) {
				case "rs":
					return "rust";
				case "ts":
				case "tsx":
					return "typescript";
				case "js":
				case "jsx":
				case "mjs":
					return "javascript";
				case "json":
					return "json";
				case "toml":
					return "toml";
				case "md":
					return "markdown";
				case "py":
					return "python";
				case "go":
					return "go";
				default:
					return Ext || "plaintext";
			}
		})();

		const FsPath = UriString.replace(/^file:\/\//, "");
		let CachedContent: string | null = null;
		let CachedLines: string[] | null = null;

		const LoadContent = (): string => {
			if (CachedContent !== null) return CachedContent;
			// Prefer document content cache (has unsaved edits from Mountain)
			const MirrorContent = this.documentContentCache.get(UriString);
			if (MirrorContent !== undefined) {
				CachedContent = MirrorContent;
				return CachedContent;
			}
			// Fallback: read from disk
			try {
				// eslint-disable-next-line @typescript-eslint/no-require-imports
				const Fs = require("node:fs");
				CachedContent = Fs.readFileSync(FsPath, "utf8") as string;
			} catch {
				CachedContent = "";
			}
			return CachedContent;
		};

		const GetLines = (): string[] => {
			if (CachedLines !== null) return CachedLines;
			CachedLines = LoadContent().split(/\r?\n/);
			return CachedLines;
		};

		const VsDocument = {
			uri: {
				toString: () => UriString,
				fsPath: FsPath,
				external: UriString,
				$mid: 1,
				scheme: "file",
				path: FsPath,
			},
			fileName: FsPath,
			languageId: LangId,
			version: 1,
			isDirty: false,
			isClosed: false,
			eol: 1, // LF
			getText: (_range?: any) => {
				const Text = LoadContent();
				if (!_range) return Text;
				// Range-limited getText: extract substring
				const Lines = GetLines();
				const StartLine = _range?.start?.line ?? 0;
				const StartChar = _range?.start?.character ?? 0;
				const EndLine = _range?.end?.line ?? Lines.length - 1;
				const EndChar = _range?.end?.character ?? (Lines[EndLine]?.length ?? 0);
				if (StartLine === EndLine) {
					return (Lines[StartLine] ?? "").substring(StartChar, EndChar);
				}
				const Result: string[] = [];
				Result.push((Lines[StartLine] ?? "").substring(StartChar));
				for (let I = StartLine + 1; I < EndLine; I++) Result.push(Lines[I] ?? "");
				Result.push((Lines[EndLine] ?? "").substring(0, EndChar));
				return Result.join("\n");
			},
			lineAt: (LineOrPos: number | any) => {
				const LineNum =
					typeof LineOrPos === "number"
						? LineOrPos
						: (LineOrPos?.line ?? 0);
				const Lines = GetLines();
				const LineText = Lines[LineNum] ?? "";
				const FirstNonWS = LineText.search(/\S/);
				return {
					text: LineText,
					lineNumber: LineNum,
					range: new Range(LineNum, 0, LineNum, LineText.length),
					rangeIncludingLineBreak: new Range(LineNum, 0, LineNum + 1, 0),
					firstNonWhitespaceCharacterIndex: FirstNonWS === -1 ? LineText.length : FirstNonWS,
					isEmptyOrWhitespace: LineText.trim().length === 0,
				};
			},
			get lineCount() { return GetLines().length; },
			offsetAt: (Pos: any) => {
				const Lines = GetLines();
				let Offset = 0;
				const TargetLine = Pos?.line ?? 0;
				for (let I = 0; I < TargetLine && I < Lines.length; I++) {
					Offset += Lines[I].length + 1; // +1 for newline
				}
				return Offset + (Pos?.character ?? 0);
			},
			positionAt: (Offset: number) => {
				const Lines = GetLines();
				let Remaining = Offset;
				for (let I = 0; I < Lines.length; I++) {
					if (Remaining <= Lines[I].length) {
						return new Position(I, Remaining);
					}
					Remaining -= Lines[I].length + 1;
				}
				return new Position(Lines.length - 1, (Lines[Lines.length - 1] ?? "").length);
			},
			validateRange: (R: any) => R,
			validatePosition: (P: any) => P,
			getWordRangeAtPosition: (Pos: any, Pattern?: RegExp) => {
				const Lines = GetLines();
				const Line = Lines[Pos?.line ?? 0] ?? "";
				const Regex = Pattern ?? /\w+/g;
				const Col = Pos?.character ?? 0;
				let Match: RegExpExecArray | null;
				// Reset regex for global patterns
				Regex.lastIndex = 0;
				while ((Match = Regex.exec(Line)) !== null) {
					if (Match.index <= Col && Match.index + Match[0].length >= Col) {
						return new Range(Pos.line, Match.index, Pos.line, Match.index + Match[0].length);
					}
				}
				return undefined;
			},
			save: async () => false,
		};

		const { CancellationTokenSource } = await import(
			"@codeeditorland/output/vs/base/common/cancellation"
		);
		const VsToken = new CancellationTokenSource().token;

		const Context = Args[3];

		try {
			switch (method) {
				case "$provideHover": {
					const Result = await (Provider as any).provideHover?.(
						VsDocument,
						VsPosition,
						VsToken,
					);
					if (!Result) return null;
					// Normalize VS Code Hover { contents, range? } →
					// Mountain HoverResultDTO { Contents: IMarkdownStringDTO[], Range? }
					const RawContents = Result.contents;
					const Contents: Array<{ Value: string }> = Array.isArray(
						RawContents,
					)
						? RawContents.map((C: any) => ({
								Value:
									typeof C === "string"
										? C
										: (C?.value ?? C?.Value ?? ""),
							}))
						: typeof RawContents === "string"
							? [{ Value: RawContents }]
							: [
									{
										Value:
											RawContents?.value ??
											RawContents?.Value ??
											"",
									},
								];
					// Normalize VS Code range { start: { line, character }, end: {...} } →
					// RangeDTO { StartLineNumber, StartColumn, EndLineNumber, EndColumn }
					const VsRange = Result.range ?? null;
					const RangeDTO = VsRange
						? {
								StartLineNumber: VsRange.start?.line ?? 0,
								StartColumn: VsRange.start?.character ?? 0,
								EndLineNumber: VsRange.end?.line ?? 0,
								EndColumn: VsRange.end?.character ?? 0,
							}
						: undefined;
					return RangeDTO !== undefined
						? { Contents, Range: RangeDTO }
						: { Contents };
				}

				// Mountain sends "$provideCompletion" (Debug fmt of ProviderType::Completion)
				case "$provideCompletion":
				case "$provideCompletions": {
					const Result = await (
						Provider as any
					).provideCompletionItems?.(
						VsDocument,
						VsPosition,
						VsToken,
						Context,
					);
					if (!Result)
						return { Suggestions: [], IsIncomplete: false };
					const RawItems = Array.isArray(Result)
						? Result
						: (Result.items ?? []);
					// Shape: CompletionListDTO { Suggestions: CompletionItemDTO[] }
					return {
						Suggestions: RawItems.map((Item: any) => ({
							Label:
								typeof Item.label === "string"
									? Item.label
									: (Item.label?.label ?? ""),
							Kind: Item.kind ?? 0,
							Detail: Item.detail ?? undefined,
							Documentation:
								typeof Item.documentation === "string"
									? { Value: Item.documentation }
									: Item.documentation?.value !== undefined
										? { Value: Item.documentation.value }
										: undefined,
							InsertText:
								typeof Item.insertText === "string"
									? Item.insertText
									: typeof Item.label === "string"
										? Item.label
										: (Item.label?.label ?? ""),
						})),
						IsIncomplete: Result.isIncomplete ?? false,
					};
				}

				case "$provideDefinition": {
					const Result = await (Provider as any).provideDefinition?.(
						VsDocument,
						VsPosition,
						VsToken,
					);
					if (!Result) return null;
					const Locations = Array.isArray(Result) ? Result : [Result];
					// Shape: Vec<LocationDTO> { Uri: string, Range: RangeDTO }
					return Locations.map((L: any) => ({
						Uri: (L.uri ?? L.targetUri)?.toString?.() ?? UriString,
						Range: this.NormalizeRange(
							L.range ?? L.targetSelectionRange,
						),
					}));
				}

				case "$provideReferences": {
					const Result = await (Provider as any).provideReferences?.(
						VsDocument,
						VsPosition,
						Context ?? { includeDeclaration: true },
						VsToken,
					);
					if (!Result) return null;
					return (Result as any[]).map((L: any) => ({
						Uri: L.uri?.toString?.() ?? UriString,
						Range: this.NormalizeRange(L.range),
					}));
				}

				// Mountain sends "$provideCodeAction" (ProviderType::CodeAction)
				case "$provideCodeAction":
				case "$provideCodeActions": {
					const RangeArg = Args[2];
					const ContextArg = Args[3];
					const Result = await (Provider as any).provideCodeActions?.(
						VsDocument,
						RangeArg,
						ContextArg,
						VsToken,
					);
					return Result ?? null;
				}

				// Mountain sends "$provideDocumentHighlight" (ProviderType::DocumentHighlight)
				case "$provideDocumentHighlight":
				case "$provideDocumentHighlights": {
					const Result = await (
						Provider as any
					).provideDocumentHighlights?.(
						VsDocument,
						VsPosition,
						VsToken,
					);
					return Result ?? null;
				}

				// Mountain sends "$provideDocumentSymbol" (ProviderType::DocumentSymbol)
				case "$provideDocumentSymbol":
				case "$provideDocumentSymbols": {
					const Result = await (
						Provider as any
					).provideDocumentSymbols?.(VsDocument, VsToken);
					return Result ?? null;
				}

				// Mountain sends "$provideWorkspaceSymbol" (ProviderType::WorkspaceSymbol)
				case "$provideWorkspaceSymbol":
				case "$provideWorkspaceSymbols": {
					const Query = Args[1] as string;
					const Result = await (
						Provider as any
					).provideWorkspaceSymbols?.(Query, VsToken);
					return Result ?? null;
				}

				// Mountain: "$provideDocumentFormatting" / "$provideDocumentRangeFormatting"
				case "$provideDocumentFormatting":
				case "$provideDocumentFormattingEdits":
				case "$provideDocumentRangeFormatting":
				case "$provideDocumentRangeFormattingEdits": {
					const RangeArg = Args[2];
					const OptionsArg = Args[3];
					const Fn =
						method === "$provideDocumentFormattingEdits" ||
						method === "$provideDocumentFormatting"
							? "provideDocumentFormattingEdits"
							: "provideDocumentRangeFormattingEdits";
					const Result = await (Provider as any)[Fn]?.(
						VsDocument,
						RangeArg,
						OptionsArg,
						VsToken,
					);
					return Result ?? null;
				}

				case "$provideSignatureHelp": {
					const Result = await (
						Provider as any
					).provideSignatureHelp?.(
						VsDocument,
						VsPosition,
						VsToken,
						Context,
					);
					return Result ?? null;
				}

				// Mountain sends "$provideRename" (ProviderType::Rename)
				case "$provideRename":
				case "$provideRenameEdits": {
					const NewName = Args[3] as string;
					const Result = await (Provider as any).provideRenameEdits?.(
						VsDocument,
						VsPosition,
						NewName,
						VsToken,
					);
					return Result ?? null;
				}

				// Mountain sends "$provideFoldingRange" (ProviderType::FoldingRange)
				case "$provideFoldingRange":
				case "$provideFoldingRanges": {
					const Result = await (
						Provider as any
					).provideFoldingRanges?.(VsDocument, Context, VsToken);
					return Result ?? null;
				}

				// Mountain sends "$provideInlayHint" (ProviderType::InlayHint)
				case "$provideInlayHint":
				case "$provideInlayHints": {
					const RangeArg = Args[2];
					const Result = await (Provider as any).provideInlayHints?.(
						VsDocument,
						RangeArg,
						VsToken,
					);
					return Result ?? null;
				}

				// Mountain sends "$provideCodeLens" (ProviderType::CodeLens)
				case "$provideCodeLens":
				case "$provideCodeLenses": {
					const Result = await (Provider as any).provideCodeLenses?.(
						VsDocument,
						VsToken,
					);
					return Result ?? null;
				}

				case "$provideOnTypeFormatting":
				case "$provideOnTypeFormattingEdits": {
					const TypeChar = Args[2] as string;
					const TypeOptions = Args[3];
					const Result = await (Provider as any).provideOnTypeFormattingEdits?.(
						VsDocument,
						VsPosition,
						TypeChar,
						TypeOptions ?? {},
						VsToken,
					);
					return Result ?? null;
				}

				case "$provideSelectionRange":
				case "$provideSelectionRanges": {
					const Positions = Args[2];
					const Result = await (Provider as any).provideSelectionRanges?.(
						VsDocument,
						Array.isArray(Positions) ? Positions.map((P: any) => new Position(P?.line ?? P?.Line ?? 0, P?.character ?? P?.Character ?? 0)) : [VsPosition],
						VsToken,
					);
					return Result ?? null;
				}

				case "$provideSemanticTokens":
				case "$provideSemanticTokensFull": {
					const Result = await (Provider as any).provideDocumentSemanticTokens?.(
						VsDocument,
						VsToken,
					);
					return Result ?? null;
				}

				case "$provideCallHierarchy":
				case "$provideCallHierarchyIncomingCalls": {
					const Item = Args[1];
					const Result = await (Provider as any).provideCallHierarchyIncomingCalls?.(
						Item,
						VsToken,
					);
					return Result ?? null;
				}

				case "$provideCallHierarchyOutgoingCalls": {
					const Item = Args[1];
					const Result = await (Provider as any).provideCallHierarchyOutgoingCalls?.(
						Item,
						VsToken,
					);
					return Result ?? null;
				}

				case "$provideTypeHierarchy":
				case "$provideTypeHierarchySupertypes": {
					const Item = Args[1];
					const Result = await (Provider as any).provideTypeHierarchySupertypes?.(
						Item,
						VsToken,
					);
					return Result ?? null;
				}

				case "$provideTypeHierarchySubtypes": {
					const Item = Args[1];
					const Result = await (Provider as any).provideTypeHierarchySubtypes?.(
						Item,
						VsToken,
					);
					return Result ?? null;
				}

				case "$provideLinkedEditingRange":
				case "$provideLinkedEditingRanges": {
					const Result = await (Provider as any).provideLinkedEditingRanges?.(
						VsDocument,
						VsPosition,
						VsToken,
					);
					return Result ?? null;
				}

				default:
					console.warn(
						`[GRPCServerService] Unhandled $provide method: ${method}`,
					);
					return null;
			}
		} catch (Error) {
			console.error(
				`[GRPCServerService] Provider ${Handle} threw for ${method}:`,
				Error,
			);
			return null;
		}
	}

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

			// Handle specific notification types
			this.handleSpecificNotification(notification.Method, parameters);

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
	 * Handle specific notification types
	 */
	private handleSpecificNotification(method: string, parameters: any): void {
		switch (method) {
			case "extension.change":
				this.emit("extensionChanged", parameters);
				break;
			case "configuration.change":
				this.emit("configurationChanged", parameters);
				break;
			case "window.focused":
				this.emit("windowFocused", parameters);
				break;
			case "window.blurred":
				this.emit("windowBlurred", parameters);
				break;
			case "system.shutdown":
				this.emit("systemShutdown", parameters);
				break;
			case "$acceptModelChanged":
			case "document.didChange":
				this.HandleDocumentChange(parameters);
				break;
			case "$acceptModelAdded":
			case "$acceptModelOpen":
			case "document.didOpen":
				this.HandleDocumentOpen(parameters);
				break;
			case "$acceptModelRemoved":
			case "$acceptModelClosed":
			case "document.didClose":
				this.HandleDocumentClose(parameters);
				break;
			case "$acceptModelSaved":
			case "document.didSave":
				// Document saved — content on disk matches cache, no action needed
				break;
			default:
				// Generic handler for unknown notification types
				console.log(
					`[GRPCServerService] Generic notification handler for: ${method}`,
				);
		}
	}

	/**
	 * Handle document content change from Mountain.
	 * Updates the document content cache so InvokeLanguageProvider returns fresh text.
	 */
	private HandleDocumentChange(Parameters: any): void {
		// Mountain sends $acceptModelChanged as [uriComponents, eventData]
		let Uri: string;
		let EventData: any;
		if (Array.isArray(Parameters) && Parameters.length >= 2) {
			Uri = Parameters[0]?.external ?? Parameters[0]?.toString?.() ?? "";
			EventData = Parameters[1];
		} else {
			Uri = Parameters?.uri?.external ?? Parameters?.uri ?? Parameters?.Uri ?? "";
			EventData = Parameters;
		}

		const Content: string | undefined =
			EventData?.content ?? EventData?.Content ?? EventData?.text;

		if (Uri && Content !== undefined) {
			this.documentContentCache.set(Uri, Content);
		} else if (Uri && (EventData?.changes || Parameters?.changes)) {
			// Incremental changes — apply edits to cached content
			const Existing = this.documentContentCache.get(Uri) ?? "";
			let Updated = Existing;
			const Changes: any[] = Array.isArray(EventData?.changes) ? EventData.changes : (Array.isArray(Parameters?.changes) ? Parameters.changes : []);
			// Apply changes in reverse order (largest offset first) to avoid index shifts
			const Sorted = [...Changes].sort((A: any, B: any) =>
				(B.rangeOffset ?? 0) - (A.rangeOffset ?? 0)
			);
			for (const Change of Sorted) {
				const Offset = Change.rangeOffset ?? 0;
				const Length = Change.rangeLength ?? 0;
				const Text = Change.text ?? "";
				Updated = Updated.substring(0, Offset) + Text + Updated.substring(Offset + Length);
			}
			this.documentContentCache.set(Uri, Updated);
		}
	}

	/**
	 * Handle document open from Mountain — cache initial content.
	 */
	private HandleDocumentOpen(Parameters: any): void {
		// $acceptModelAdded sends an array of DocumentStateDTOs
		const Models = Array.isArray(Parameters) ? Parameters : [Parameters];
		for (const Model of Models) {
			// DocumentStateDTO uses URI (PascalCase, serde rename_all)
			const Uri: string =
				Model?.URI?.toString?.() ?? Model?.URI ??
				Model?.uri?.external ?? Model?.uri ?? Model?.Uri ?? "";
			// Content can be: Lines (Vec<String>), content (String), text (String)
			const Lines = Model?.Lines ?? Model?.lines;
			const EOL = Model?.EOL ?? Model?.eol ?? "\n";
			let Content: string | undefined;
			if (Array.isArray(Lines)) {
				Content = Lines.join(EOL);
			} else {
				Content = Model?.content ?? Model?.Content ?? Model?.text;
			}

			if (Uri && Content !== undefined) {
				this.documentContentCache.set(Uri, Content);
				console.log(`[GRPCServerService] Document opened: ${Uri.slice(-60)} (${Content.length} chars)`);
			}
		}
	}

	/**
	 * Handle document close from Mountain — remove from cache.
	 */
	private HandleDocumentClose(Parameters: any): void {
		// $acceptModelRemoved sends [uriComponents]
		const Items = Array.isArray(Parameters) ? Parameters : [Parameters];
		for (const Item of Items) {
			const Uri: string =
				Item?.external ?? Item?.uri?.external ?? Item?.uri ?? Item?.Uri ?? "";
			if (Uri) {
				this.documentContentCache.delete(Uri);
			}
		}
	}

	/**
	 * Get cached document content, or null if not cached.
	 * Used by InvokeLanguageProvider's VsDocument.getText().
	 */
	public GetDocumentContent(Uri: string): string | null {
		return this.documentContentCache.get(Uri) ?? null;
	}

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
			const CocoonSvc = protoDescriptor.Vine?.CocoonService || protoDescriptor.CocoonService;
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
						// server.start() removed — no longer needed in @grpc/grpc-js v1.12+
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
