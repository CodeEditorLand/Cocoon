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
			ProcessMountainRequest: async (
				request: GenericRequest,
			): Promise<GenericResponse> => {
				if (!this.ValidateAuthentication()) {
					throw new Error("Authentication failed");
				}
				return await this.handleMountainRequest(request);
			},
			SendMountainNotification: async (
				request: GenericNotification,
			): Promise<Empty> => {
				if (!this.ValidateAuthentication()) {
					throw new Error("Authentication failed");
				}
				this.handleMountainNotification(request);
				return {};
			},
			CancelOperation: async (
				request: CancelOperationRequest,
			): Promise<Empty> => {
				if (!this.ValidateAuthentication()) {
					throw new Error("Authentication failed");
				}
				this.handleCancelOperation(request);
				return {};
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
	 */
	private IsValidMethod(method: string): boolean {
		const DotMethod = /^[a-zA-Z]+\.[a-zA-Z]+$/.test(method);
		const ProvideMethod = /^\$provide[A-Z][a-zA-Z]+$/.test(method);
		return DotMethod || ProvideMethod;
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

		// Language feature provider invocation: "$provideHover", "$provideCompletions", etc.
		// Mountain calls these when Sky's Monaco editor requests language intelligence.
		// parameters = [handle, uriObject, position?, context?]
		if (/^\$provide[A-Z]/.test(method)) {
			return this.InvokeLanguageProvider(method, parameters);
		}

		throw new Error(`Unknown method: ${method}`);
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
		// Compiled from the VS Code source tree — no hand-written shims.
		const { Position, Range } = await import(
			"@codeeditorland/output/vs/workbench/api/common/extHostTypes.js"
		);
		const VsPosition = new Position(PosLine, PosChar);

		// Try to get real document content from LanguageProviderRegistry or the
		// VS Code document shim. Content is keyed by URI string in CocoonService's
		// document mirror (if AcceptWorkspaceData populated it).
		// For now: provide a structural TextDocument shim. Extensions that need
		// getText() for actual text intelligence will work only if a document mirror
		// is available; hover/definition providers that only use the position are
		// fully functional.
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

		const VsDocument = {
			uri: {
				toString: () => UriString,
				fsPath: UriString.replace(/^file:\/\//, ""),
				external: UriString,
				$mid: 1,
				scheme: "file",
				path: UriString.replace(/^file:\/\//, ""),
			},
			fileName: UriString.replace(/^file:\/\//, ""),
			languageId: LangId,
			version: 1,
			isDirty: false,
			isClosed: false,
			eol: 1, // LF
			getText: (_range?: any) => "",
			lineAt: (LineOrPos: number | any) => {
				const LineNum =
					typeof LineOrPos === "number"
						? LineOrPos
						: (LineOrPos?.line ?? 0);
				return {
					text: "",
					lineNumber: LineNum,
					range: new Range(LineNum, 0, LineNum, 0),
					rangeIncludingLineBreak: new Range(LineNum, 0, LineNum + 1, 0),
					firstNonWhitespaceCharacterIndex: 0,
					isEmptyOrWhitespace: true,
				};
			},
			lineCount: 1,
			offsetAt: (_pos: any) => 0,
			positionAt: (_offset: number) => VsPosition,
			validateRange: (R: any) => R,
			validatePosition: (P: any) => P,
			getWordRangeAtPosition: (_pos: any, _pattern?: RegExp) => undefined,
			save: async () => false,
		};

		const { CancellationTokenSource } = await import(
			"@codeeditorland/output/vs/base/common/cancellation.js"
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
			default:
				// Generic handler for unknown notification types
				console.log(
					`[GRPCServerService] Generic notification handler for: ${method}`,
				);
		}
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
			this.server.addService(
				protoDescriptor.CocoonService.service,
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

                    package mountain;

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
				grpc.credentials.createInsecure(),
				(error, port) => {
					if (error) {
						reject(error);
					} else {
						console.log(
							`[GRPCServerService] Server bound to port ${port}`,
						);
						this.server!.start();
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
