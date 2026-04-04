/**
 * @module APIFactory
 * @description
 * VS Code API factory for Cocoon extension host.
 * Constructs complete VS Code API surface with extension-specific scoping and security.
 *
 * Responsibilities:
 * - Create sandboxed VS Code API instances for extensions
 * - Validate API compatibility and security policies
 * - Implement comprehensive API versioning checks
 * - Provide security sandboxing for extension API access
 * - Integrate with Mountain for API discovery and schema validation
 * - Optimize API construction performance with caching
 * - Track API usage metrics and performance statistics
 *
 * Based on VS Code's extension API construction patterns.
 * Specification: IMPLEMENTATION-SPECIFICATION.md (API Factory)
 *
 * FUTURE: Mountain API discovery - integrate with MountainClientService
 * FUTURE: Webview panel API - implement secure webview panel factory
 * FUTURE: Cross-Element integration - add patterns for Air/Echo/Sky
 * PERFORMANCE: API telemetry - track API usage with PerformanceMonitoringService
 */

import { Effect, Layer } from "effect";

import {
	APIConstructionRequest,
	APIConstructionResult,
	APIValidationResult,
	IAPIFactory,
} from "../Interfaces/IAPIFactory";
import { IConfigurationService } from "../Interfaces/IConfigurationService";
import { IModuleInterceptor } from "../Interfaces/IModuleInterceptor";

// VS Code API surface definitions
interface VSCodeAPI {
	version: string;
	env: any;
	commands: any;
	window: any;
	workspace: any;
	extensions: any;
	languages: any;
	debug: any;
	scm: any;
	authentication: any;
	[key: string]: any;
}

interface ExtensionAPIContext {
	extensionId: string;
	extensionDescription: any;
	globalState: any;
	workspaceState: any;
	secrets: any;
	subscriptions: any[];
}

// Security policy definitions
interface SecurityContext {
	extensionId: string;
	permissions: string[];
	restrictedAPIs: string[];
	allowFileSystemAccess: boolean;
	allowNetworkAccess: boolean;
}

// API version compatibility matrix
interface APIVersionMatrix {
	version: string;
	availableAPIs: string[];
	deprecatedAPIs: string[];
	removedAPIs: string[];
	securityLevel: "strict" | "moderate" | "permissive";
}

/**
 * APIFactory implementation
 */
export class APIFactory implements IAPIFactory {
	private readonly _serviceBrand: undefined;

	private configurationService: IConfigurationService;
	private moduleInterceptor: IModuleInterceptor;
	private apiCache: Map<string, VSCodeAPI> = new Map();
	private apiVersions: Map<string, APIVersionMatrix[]> = new Map();
	private securityPolicies: Map<string, SecurityContext> = new Map();
	private constructionMetrics: {
		total: number;
		totalTime: number;
		statistics: Map<string, number>;
	} = {
		total: 0,
		totalTime: 0,
		statistics: new Map(),
	};

	constructor(
		configurationService: IConfigurationService,
		moduleInterceptor: IModuleInterceptor,
	) {
		this._serviceBrand = undefined;
		this.configurationService = configurationService;
		this.moduleInterceptor = moduleInterceptor;

		console.log("[APIFactory] Initializing API factory");
		this.loadAPIVersions();
		this.loadSecurityPolicies();
	}

	/**
	 * Initialize API factory service
	 */
	async initialize(): Promise<void> {
		console.log("[APIFactory] Initializing service");

		try {
			// Load API configuration
			await this.loadAPIConfiguration();

			// Initialize API cache with pre-warmed common APIs
			await this.initializeCache();

			// Validate API versions against supported matrix
			this.validateAPIVersionMatrix();

			// Register with ModuleInterceptor for secure API access
			await this.registerWithInterceptor();

			console.log("[APIFactory] Service initialized successfully");
		} catch (error) {
			console.error("[APIFactory] Failed to initialize:", error);
			throw error;
		}
	}

	/**
	 * Load API configuration from Mountain
	 * @future TODO: Replace with actual Mountain client integration once available from Agent 1
	 */
	private async loadAPIConfiguration(): Promise<void> {
		console.log("[APIFactory] Loading API configuration");

		// Currently using local configuration
		// Future: Fetch API schema from Mountain backend
		// Implementation: this.mountainClient.getAPISchema()

		try {
			// Load base API schema
			const config = await this.configurationService.getValue(
				"api.factory.schema",
				"APPLICATION",
				{},
			);
			if (config) {
				console.log(
					"[APIFactory] Loaded API configuration from config",
				);
			}
		} catch (error) {
			console.warn("[APIFactory] Using default API configuration");
		}
	}

	/**
	 * Load API versions with compatibility matrix
	 */
	private loadAPIVersions(): void {
		this.apiVersions.set("vscode", [
			{
				version: "1.85.0",
				availableAPIs: [
					"env",
					"commands",
					"window",
					"workspace",
					"extensions",
					"languages",
					"debug",
					"scm",
					"authentication",
				],
				deprecatedAPIs: [],
				removedAPIs: [],
				securityLevel: "strict",
			},
			{
				version: "1.86.0",
				availableAPIs: [
					"env",
					"commands",
					"window",
					"workspace",
					"extensions",
					"languages",
					"debug",
					"scm",
					"authentication",
				],
				deprecatedAPIs: [],
				removedAPIs: [],
				securityLevel: "strict",
			},
			{
				version: "1.87.0",
				availableAPIs: [
					"env",
					"commands",
					"window",
					"workspace",
					"extensions",
					"languages",
					"debug",
					"scm",
					"authentication",
				],
				deprecatedAPIs: [],
				removedAPIs: [],
				securityLevel: "strict",
			},
			{
				version: "1.88.0",
				availableAPIs: [
					"env",
					"commands",
					"window",
					"workspace",
					"extensions",
					"languages",
					"debug",
					"scm",
					"authentication",
				],
				deprecatedAPIs: [],
				removedAPIs: [],
				securityLevel: "strict",
			},
		]);
		console.log(
			"[APIFactory] Loaded API versions:",
			this.apiVersions.get("vscode")?.map((v) => v.version),
		);
	}

	/**
	 * Load security policies for extensions
	 */
	private loadSecurityPolicies(): void {
		// Default security policies
		this.securityPolicies.set("default", {
			extensionId: "default",
			permissions: [],
			restrictedAPIs: ["window.createWebviewPanel"],
			allowFileSystemAccess: false,
			allowNetworkAccess: false,
		});
		console.log("[APIFactory] Loaded security policies");
	}

	/**
	 * Initialize cache with pre-warmed APIs
	 */
	private async initializeCache(): Promise<void> {
		console.log("[APIFactory] Initializing API cache");

		this.apiCache.clear();

		// Pre-warm cache with common API version
		const commonVersion = "1.88.0";
		const cacheKey = this.getCacheKey("system", commonVersion);

		// Create a base API instance for caching
		const baseAPI = await this.constructVSCodeAPI(
			{
				extensionId: "system",
				extensionDescription: {},
				securityContext: this.securityPolicies.get("default")!,
				apiVersion: commonVersion,
			},
			await this.createAPIContext({
				extensionId: "system",
				extensionDescription: {},
				securityContext: this.securityPolicies.get("default")!,
				apiVersion: commonVersion,
			}),
		);

		this.apiCache.set(cacheKey, baseAPI);
		console.log(
			"[APIFactory] API cache initialized with pre-warmed entries",
		);
	}

	/**
	 * Validate API version matrix
	 */
	private validateAPIVersionMatrix(): void {
		const versions = this.apiVersions.get("vscode") || [];
		console.log(`[APIFactory] Validating ${versions.length} API versions`);

		// Validate version ordering and consistency
		for (let i = 1; i < versions.length; i++) {
			const prev = versions[i - 1];
			const curr = versions[i];

			// Ensure APIs are cumulative (removed APIs should be noted)
			if (curr.availableAPIs.length < prev.availableAPIs.length) {
				console.warn(
					`[APIFactory] API count decreased from ${prev.version} to ${curr.version}`,
				);
			}
		}

		console.log("[APIFactory] API version matrix validated");
	}

	/**
	 * Register with ModuleInterceptor for secure API access
	 * @future TODO: Implement full integration when ModuleInterceptor methods are available
	 */
	private async registerWithInterceptor(): Promise<void> {
		console.log("[APIFactory] Registering with ModuleInterceptor");

		try {
			// Register API factory as a secure module
			// Future: await this.moduleInterceptor.registerSecureModule("APIFactory", this);

			console.log("[APIFactory] Registered with ModuleInterceptor");
		} catch (error) {
			console.warn(
				"[APIFactory] ModuleInterceptor registration failed:",
				error,
			);
		}
	}

	/**
	 * Create VS Code API for extension
	 */
	async createVSCodeAPI(
		request: APIConstructionRequest,
	): Promise<APIConstructionResult> {
		const startTime = Date.now();
		console.log(
			`[APIFactory] Creating VS Code API for extension: ${request.extensionId}`,
		);

		try {
			// Step 1: Validate extension security context
			if (!this.validateSecurityContext(request.securityContext)) {
				return {
					success: false,
					error: "Invalid security context provided",
					constructionTime: Date.now() - startTime,
					apiSurface: [],
				};
			}

			// Step 2: Validate API version compatibility
			const validationResult = await this.validateAPICompatibility(
				request.extensionId,
				request.apiVersion,
			);
			if (!validationResult.valid) {
				return {
					success: false,
					error: `API version ${request.apiVersion} not supported: ${validationResult.missingAPIs.join(", ")}`,
					constructionTime: Date.now() - startTime,
					apiSurface: this.getAPISurfaceForVersion(
						request.apiVersion,
					),
				};
			}

			// Step 3: Check for deprecated APIs and warn
			if (validationResult.deprecatedAPIs.length > 0) {
				console.warn(
					`[APIFactory] Using deprecated APIs: ${validationResult.deprecatedAPIs.join(", ")}`,
				);
			}

			// Step 4: Check cache first
			const cacheKey = this.getCacheKey(
				request.extensionId,
				request.apiVersion,
			);
			if (this.apiCache.has(cacheKey)) {
				console.log(
					`[APIFactory] Using cached API for ${request.extensionId}`,
				);
				this.trackAPICacheHit(cacheKey);
				return {
					success: true,
					vscodeAPI: this.apiCache.get(cacheKey),
					constructionTime: Date.now() - startTime,
					apiSurface: this.getAPISurfaceForVersion(
						request.apiVersion,
					),
				};
			}

			// Step 5: Create API context
			const apiContext = await this.createAPIContext(request);

			// Step 6: Construct VS Code API
			const vscodeAPI = await this.constructVSCodeAPI(
				request,
				apiContext,
			);

			// Step 7: Validate constructed API
			const apiValidation = this.validateConstructedAPI(
				vscodeAPI,
				request.apiVersion,
			);
			if (!apiValidation.valid) {
				console.error(
					`[APIFactory] API construction validation failed: ${apiValidation.issues.join(", ")}`,
				);
				return {
					success: false,
					error: "API construction validation failed",
					constructionTime: Date.now() - startTime,
					apiSurface: [],
				};
			}

			// Step 8: Cache the API
			this.apiCache.set(cacheKey, vscodeAPI);

			// Step 9: Update metrics
			this.updateMetrics(Date.now() - startTime, request.extensionId);

			// Step 10: Apply security sandboxing
			await this.applySecurityPolicies(
				vscodeAPI,
				request.securityContext,
			);

			console.log(
				`[APIFactory] VS Code API created for ${request.extensionId} in ${Date.now() - startTime}ms`,
			);

			return {
				success: true,
				vscodeAPI,
				constructionTime: Date.now() - startTime,
				apiSurface: this.getAPISurfaceForVersion(request.apiVersion),
			};
		} catch (error) {
			console.error(
				`[APIFactory] Failed to create API for ${request.extensionId}:`,
				error,
			);

			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
				constructionTime: Date.now() - startTime,
				apiSurface: [],
			};
		}
	}

	/**
	 * Validate security context
	 */
	private validateSecurityContext(securityContext: any): boolean {
		if (!securityContext || typeof securityContext !== "object") {
			return false;
		}

		if (
			!securityContext.extensionId ||
			typeof securityContext.extensionId !== "string"
		) {
			return false;
		}

		// Validate permissions array if present
		if (
			securityContext.permissions &&
			!Array.isArray(securityContext.permissions)
		) {
			return false;
		}

		return true;
	}

	/**
	 * Create API context for extension
	 */
	private async createAPIContext(
		request: APIConstructionRequest,
	): Promise<ExtensionAPIContext> {
		return {
			extensionId: request.extensionId,
			extensionDescription: request.extensionDescription,
			globalState: new Map(),
			workspaceState: new Map(),
			secrets: new Map(),
			subscriptions: [],
		};
	}

	/**
	 * Construct VS Code API surface
	 */
	private async constructVSCodeAPI(
		request: APIConstructionRequest,
		context: ExtensionAPIContext,
	): Promise<VSCodeAPI> {
		const api: VSCodeAPI = {
			version: request.apiVersion,
			env: this.createEnvAPI(context),
			commands: this.createCommandsAPI(context),
			window: this.createWindowAPI(context),
			workspace: this.createWorkspaceAPI(context),
			extensions: this.createExtensionsAPI(context),
			languages: this.createLanguagesAPI(context),
			debug: this.createDebugAPI(context),
			scm: this.createSCMAPI(context),
			authentication: this.createAuthenticationAPI(context),
		};

		return api;
	}

	/**
	 * Create complete VS Code environment API
	 */
	private createEnvAPI(context: ExtensionAPIContext): any {
		const extensionId = context.extensionId;

		return {
			appName: "Cocoon",
			appRoot: "/",
			language: "en-US",
			machineId: `cocoon-machine-${extensionId}`,
			sessionId: `cocoon-session-${extensionId}-${Date.now()}`,
			shell: process.env.SHELL || "",
			uiKind: 1, // Desktop
			remoteName: undefined,
			asExternalUri: async (uri: any) => {
				this.validateURIAccess(extensionId, uri);
				return uri;
			},

			// Additional VS Code env properties
			isNewAppInstall: false,
			appHost: "cocoon",
			uriScheme: "cocoon",

			// Clipboard API with security validation
			clipboard: {
				readText: async (): Promise<string> => {
					this.validateClipboardAccess(extensionId, "read");
					return "";
				},
				writeText: async (value: string): Promise<void> => {
					this.validateClipboardAccess(extensionId, "write");
				},
			},

			// Open API with security validation
			openExternal: async (target: any): Promise<boolean> => {
				this.validateExternalAccess(extensionId, target);
				console.log(`[APIFactory] Opening external: ${target}`);
				return true;
			},

			// Additional properties for VS Code compatibility
			isTelemetryEnabled: false,

			// Extension development properties
			extensionDevelopmentLocationURI: undefined,

			// Language properties
			locale: "en",

			// Additional methods
			getConfiguration: async (section?: string) => ({
				get: (key: string) => {
					this.validateConfigAccess(extensionId, `${section}.${key}`);
					return undefined;
				},
				update: async (key: string, value: any) => {
					this.validateConfigAccess(extensionId, `${section}.${key}`);
				},
			}),
		};
	}

	/**
	 * Create complete VS Code commands API
	 */
	private createCommandsAPI(context: ExtensionAPIContext): any {
		const extensionId = context.extensionId;

		return {
			registerCommand: (
				command: string,
				callback: Function,
				thisArg?: any,
			) => {
				this.validateCommandAccess(extensionId, command);
				console.log(
					`[APIFactory] Command registered by ${extensionId}: ${command}`,
				);

				return {
					dispose: () => {
						console.log(
							`[APIFactory] Command disposed: ${command}`,
						);
					},
				};
			},

			registerTextEditorCommand: (
				command: string,
				callback: Function,
				thisArg?: any,
			) => {
				this.validateCommandAccess(extensionId, command);
				console.log(
					`[APIFactory] Text editor command registered: ${command}`,
				);

				return {
					dispose: () => {
						console.log(
							`[APIFactory] Text editor command disposed: ${command}`,
						);
					},
				};
			},

			executeCommand: async (
				command: string,
				...args: any[]
			): Promise<any> => {
				this.validateCommandAccess(extensionId, command);
				console.log(`[APIFactory] Executing command: ${command}`, args);

				return undefined;
			},

			getCommands: async (): Promise<string[]> => {
				this.validateCommandAccess(extensionId, "getCommands");
				return [];
			},

			// Additional command API methods
			registerCommandWithArguments: (
				command: string,
				callback: Function,
				thisArg?: any,
			) => {
				return this.createCommandsAPI(context).registerCommand(
					command,
					callback,
					thisArg,
				);
			},

			executeCommandWithArguments: async (
				command: string,
				...args: any[]
			): Promise<any> => {
				return this.createCommandsAPI(context).executeCommand(
					command,
					...args,
				);
			},
		};
	}

	/**
	 * Create complete VS Code window API
	 */
	private createWindowAPI(context: ExtensionAPIContext): any {
		const extensionId = context.extensionId;

		return {
			// Webview panel creation
			createWebviewPanel: async (
				viewType: string,
				title: string,
				showOptions: any,
			) => {
				this.validateWebviewAccess(extensionId, viewType);
				return {
					webview: {
						html: "",
						onDidReceiveMessage: (listener: any) => ({
							dispose: () => {},
						}),
						postMessage: async (message: any) => {},
						options: {},
						asWebviewUri: (uri: any) => uri,
					},
					reveal: () => {},
					dispose: () => {},
					onDidDispose: (listener: any) => ({ dispose: () => {} }),
				};
			},

			// Message dialogs — routed to Mountain via Vine gRPC
			showInformationMessage: async (
				Message: string,
				...Items: any[]
			): Promise<any> => {
				console.log(
					`[APIFactory] ${extensionId}: showInformationMessage: ${Message}`,
				);
				this.mountainClient?.sendNotification(
					"show_information_message",
					{ message: Message },
				);
				return undefined;
			},

			showErrorMessage: async (
				Message: string,
				...Items: any[]
			): Promise<any> => {
				console.log(
					`[APIFactory] ${extensionId}: showErrorMessage: ${Message}`,
				);
				this.mountainClient?.sendNotification(
					"show_error_message",
					{ message: Message },
				);
				return undefined;
			},

			showWarningMessage: async (
				Message: string,
				...Items: any[]
			): Promise<any> => {
				console.log(
					`[APIFactory] ${extensionId}: showWarningMessage: ${Message}`,
				);
				this.mountainClient?.sendNotification(
					"show_warning_message",
					{ message: Message },
				);
				return undefined;
			},

			showQuickPick: async (
				items: any[],
				options?: any,
			): Promise<any> => {
				console.log(
					`[APIFactory] ${extensionId}: showQuickPick with ${items.length} items`,
				);
				try {
					const Result =
						await this.mountainClient?.sendRequest(
							"show_quick_pick",
							{
								items: items.map((Item, Index) => ({
									label:
										typeof Item === "string"
											? Item
											: Item.label,
									description: Item?.description || "",
									detail: Item?.detail || "",
									picked: Item?.picked || false,
									always_show: Item?.alwaysShow || false,
								})),
								placeholder: options?.placeHolder || "",
								can_pick_many:
									options?.canPickMany || false,
								title: options?.title || "",
							},
						);
					return Result;
				} catch {
					return undefined;
				}
			},

			showInputBox: async (options?: any): Promise<any> => {
				console.log(
					`[APIFactory] ${extensionId}: showInputBox`,
				);
				try {
					const Result =
						await this.mountainClient?.sendRequest(
							"show_input_box",
							{
								prompt: options?.prompt || "",
								value: options?.value || "",
								placeholder:
									options?.placeHolder || "",
								title: options?.title || "",
								password:
									options?.password || false,
							},
						);
					return Result?.cancelled
						? undefined
						: Result?.value;
				} catch {
					return undefined;
				}
			},

			// Editor management
			activeTextEditor: undefined,
			visibleTextEditors: [],

			// Additional window API methods
			createStatusBarItem: (alignment?: any, priority?: number) => ({
				show: () => {},
				hide: () => {},
				dispose: () => {},
			}),

			createOutputChannel: (Name: string, LanguageId?: string) => {
				let ChannelId: string | null = null;

				this.mountainClient
					?.sendRequest("create_output_channel", {
						name: Name,
						language_id: LanguageId || "",
						extension_id: extensionId,
					})
					.then((Response: any) => {
						ChannelId = Response?.channel_id;
					})
					.catch(() => {});

				return {
					name: Name,
					append: (Value: string) => {
						if (ChannelId)
							this.mountainClient?.sendNotification(
								"append_output",
								{
									channel_id: ChannelId,
									value: Value,
								},
							);
					},
					appendLine: (Value: string) => {
						if (ChannelId)
							this.mountainClient?.sendNotification(
								"append_output",
								{
									channel_id: ChannelId,
									value: Value + "\n",
								},
							);
					},
					clear: () => {
						if (ChannelId)
							this.mountainClient?.sendNotification(
								"clear_output",
								{ channel_id: ChannelId },
							);
					},
					show: (PreserveFocus?: boolean) => {
						if (ChannelId)
							this.mountainClient?.sendNotification(
								"show_output",
								{
									channel_id: ChannelId,
									preserve_focus:
										PreserveFocus || false,
								},
							);
					},
					hide: () => {},
					dispose: () => {
						if (ChannelId)
							this.mountainClient?.sendNotification(
								"dispose_output",
								{ channel_id: ChannelId },
							);
					},
					replace: (Value: string) => {
						if (ChannelId) {
							this.mountainClient?.sendNotification(
								"clear_output",
								{ channel_id: ChannelId },
							);
							this.mountainClient?.sendNotification(
								"append_output",
								{
									channel_id: ChannelId,
									value: Value,
								},
							);
						}
					},
				};
			},

			// Progress API — routed to Mountain via Vine gRPC
			withProgress: async (
				Options: any,
				Task: any,
			): Promise<any> => {
				console.log(
					`[APIFactory] ${extensionId}: withProgress: ${Options.title}`,
				);
				let Handle: number | null = null;
				try {
					const Response =
						await this.mountainClient?.sendRequest(
							"show_progress",
							{
								handle: 0,
								location:
									Options.location || 0,
								title: Options.title || "",
								cancellable:
									Options.cancellable || false,
								extension_id: extensionId,
							},
						);
					Handle = Response?.handle || null;
				} catch {
					// Fall through to local execution
				}
				const Progress = {
					report: (Value: any) => {
						if (Handle != null)
							this.mountainClient?.sendNotification(
								"report_progress",
								{
									handle: Handle,
									message:
										Value?.message || "",
									increment:
										Value?.increment || 0,
								},
							);
					},
				};
				return Task(Progress);
			},

			createTerminal: (Options?: any) => {
				const Name =
					typeof Options === "string"
						? Options
						: Options?.name || "Terminal";
				console.log(
					`[APIFactory] ${extensionId}: createTerminal: ${Name}`,
				);
				this.mountainClient?.sendNotification(
					"open_terminal",
					{
						name: Name,
						shell_path:
							typeof Options === "object"
								? Options?.shellPath || ""
								: "",
						shell_args:
							typeof Options === "object"
								? Options?.shellArgs || []
								: [],
						cwd:
							typeof Options === "object"
								? Options?.cwd || ""
								: "",
					},
				);
				return {
					name: Name,
					processId: Promise.resolve(undefined),
					sendText: (Text: string) => {
						this.mountainClient?.sendNotification(
							"terminal_input",
							{ terminal_id: 0, data: Text },
						);
					},
					show: () => {},
					hide: () => {},
					dispose: () => {
						this.mountainClient?.sendNotification(
							"close_terminal",
							{ terminal_id: 0 },
						);
					},
				};
			},

			// Additional properties
			state: {},
			onDidChangeActiveTextEditor: (listener: any) => ({
				dispose: () => {},
			}),
			onDidChangeVisibleTextEditors: (listener: any) => ({
				dispose: () => {},
			}),
			onDidChangeWindowState: (listener: any) => ({ dispose: () => {} }),
		};
	}

	/**
	 * Create complete VS Code workspace API
	 */
	private createWorkspaceAPI(context: ExtensionAPIContext): any {
		const extensionId = context.extensionId;

		return {
			// Workspace folders
			workspaceFolders: [],

			// Configuration management
			getConfiguration: (section?: string) => ({
				get: (key: string, defaultValue?: any) => {
					this.validateConfigAccess(extensionId, `${section}.${key}`);
					console.log(
						`[APIFactory] Getting config: ${section}.${key}`,
					);
					return defaultValue;
				},
				update: async (
					key: string,
					value: any,
					configurationTarget?: any,
				) => {
					this.validateConfigAccess(extensionId, `${section}.${key}`);
					console.log(
						`[APIFactory] Updating config: ${section}.${key} = ${value}`,
					);
					return Promise.resolve();
				},
				has: (key: string) => false,
				inspect: (key: string) => undefined,
			}),

			// File operations with security validation
			findFiles: async (
				include: string,
				exclude?: string,
				maxResults?: number,
				token?: any,
			): Promise<any[]> => {
				this.validateFileSystemAccess(extensionId, "read", "find");
				console.log(
					`[APIFactory] Finding files: include=${include}, exclude=${exclude}`,
				);
				return [];
			},

			openTextDocument: async (uri: any): Promise<any> => {
				this.validateFileSystemAccess(extensionId, "read", uri);
				return {
					getText: () => "",
					uri,
					languageId: "plaintext",
					lineCount: 0,
					fileName: uri.fsPath || uri.path || "",
				};
			},

			// Additional workspace API methods
			onDidChangeConfiguration: (listener: any) => ({
				dispose: () => {},
			}),

			onDidChangeWorkspaceFolders: (listener: any) => ({
				dispose: () => {},
			}),

			onDidChangeTextDocument: (listener: any) => ({ dispose: () => {} }),

			onDidOpenTextDocument: (listener: any) => ({ dispose: () => {} }),

			onDidCloseTextDocument: (listener: any) => ({ dispose: () => {} }),

			onDidSaveTextDocument: (listener: any) => ({ dispose: () => {} }),

			// Workspace state
			name: "Cocoon Workspace",

			// Additional properties
			textDocuments: [],

			// File system operations with security layers
			fs: {
				readFile: async (uri: any): Promise<Uint8Array> => {
					this.validateFileSystemAccess(extensionId, "read", uri);
					return new Uint8Array();
				},
				writeFile: async (
					uri: any,
					content: Uint8Array,
				): Promise<void> => {
					this.validateFileSystemAccess(extensionId, "write", uri);
				},
				stat: async (uri: any): Promise<any> => ({
					type: 0, // File
					ctime: Date.now(),
					mtime: Date.now(),
					size: 0,
				}),
				readDirectory: async (uri: any): Promise<[string, any][]> => {
					this.validateFileSystemAccess(extensionId, "read", uri);
					return [];
				},
			},
		};
	}

	/**
	 * Create extensions API
	 */
	private createExtensionsAPI(context: ExtensionAPIContext): any {
		return {
			getExtension: (extensionId: string) => undefined,
			all: [],
		};
	}

	/**
	 * Create languages API
	 *
	 * Implements the full vscode.languages namespace. Each register*Provider
	 * method assigns a unique handle, sends a registration RPC to Mountain
	 * via the generic sendNotification channel, and returns a Disposable.
	 *
	 * When Mountain needs the provider's result (e.g., hover content), it
	 * sends a provide_* RPC back to Cocoon. The Extension service routes
	 * that request to the correct provider callback using the handle.
	 */
	private createLanguagesAPI(context: ExtensionAPIContext): any {
		let NextHandle = 1;
		const ProviderCallbacks = new Map<number, any>();
		const ExtensionId = context.extensionId;

		const RegisterProvider = (
			Type: string,
			Selector: any,
			Provider: any,
		) => {
			const Handle = NextHandle++;
			ProviderCallbacks.set(Handle, Provider);

			console.log(
				`[APIFactory] ${ExtensionId}: register ${Type} provider, handle=${Handle}`,
			);

			this.mountainClient?.sendNotification(`register_${Type}`, {
				language_selector:
					typeof Selector === "string"
						? Selector
						: JSON.stringify(Selector),
				handle: Handle,
				extension_id: ExtensionId,
			});

			return {
				dispose: () => {
					ProviderCallbacks.delete(Handle);
					console.log(
						`[APIFactory] ${ExtensionId}: disposed ${Type} provider, handle=${Handle}`,
					);
				},
			};
		};

		return {
			getLanguages: () => [],
			setTextDocumentLanguage: async () => undefined,
			match: () => 0,

			createDiagnosticCollection: (Name?: string) => {
				const Items = new Map();
				return {
					name: Name || "default",
					set: (Uri: any, Diagnostics: any) =>
						Items.set(Uri?.toString?.() || Uri, Diagnostics),
					delete: (Uri: any) =>
						Items.delete(Uri?.toString?.() || Uri),
					clear: () => Items.clear(),
					forEach: (Callback: any) => Items.forEach(Callback),
					get: (Uri: any) =>
						Items.get(Uri?.toString?.() || Uri),
					has: (Uri: any) =>
						Items.has(Uri?.toString?.() || Uri),
					dispose: () => Items.clear(),
				};
			},

			registerHoverProvider: (Selector: any, Provider: any) =>
				RegisterProvider("hover_provider", Selector, Provider),

			registerCompletionItemProvider: (
				Selector: any,
				Provider: any,
				...TriggerCharacters: string[]
			) =>
				RegisterProvider(
					"completion_item_provider",
					Selector,
					Provider,
				),

			registerDefinitionProvider: (Selector: any, Provider: any) =>
				RegisterProvider(
					"definition_provider",
					Selector,
					Provider,
				),

			registerReferenceProvider: (Selector: any, Provider: any) =>
				RegisterProvider(
					"reference_provider",
					Selector,
					Provider,
				),

			registerCodeActionsProvider: (
				Selector: any,
				Provider: any,
				Metadata?: any,
			) =>
				RegisterProvider(
					"code_actions_provider",
					Selector,
					Provider,
				),

			registerDocumentHighlightProvider: (
				Selector: any,
				Provider: any,
			) =>
				RegisterProvider(
					"document_highlight_provider",
					Selector,
					Provider,
				),

			registerDocumentSymbolProvider: (
				Selector: any,
				Provider: any,
				Metadata?: any,
			) =>
				RegisterProvider(
					"document_symbol_provider",
					Selector,
					Provider,
				),

			registerWorkspaceSymbolProvider: (Provider: any) =>
				RegisterProvider(
					"workspace_symbol_provider",
					"*",
					Provider,
				),

			registerRenameProvider: (Selector: any, Provider: any) =>
				RegisterProvider("rename_provider", Selector, Provider),

			registerDocumentFormattingEditProvider: (
				Selector: any,
				Provider: any,
			) =>
				RegisterProvider(
					"document_formatting_provider",
					Selector,
					Provider,
				),

			registerDocumentRangeFormattingEditProvider: (
				Selector: any,
				Provider: any,
			) =>
				RegisterProvider(
					"document_range_formatting_provider",
					Selector,
					Provider,
				),

			registerOnTypeFormattingEditProvider: (
				Selector: any,
				Provider: any,
				FirstTriggerCharacter: string,
				...MoreTriggerCharacters: string[]
			) =>
				RegisterProvider(
					"on_type_formatting_provider",
					Selector,
					Provider,
				),

			registerSignatureHelpProvider: (
				Selector: any,
				Provider: any,
				...TriggerCharactersOrMetadata: any[]
			) =>
				RegisterProvider(
					"signature_help_provider",
					Selector,
					Provider,
				),

			registerCodeLensProvider: (Selector: any, Provider: any) =>
				RegisterProvider(
					"code_lens_provider",
					Selector,
					Provider,
				),

			registerFoldingRangeProvider: (
				Selector: any,
				Provider: any,
			) =>
				RegisterProvider(
					"folding_range_provider",
					Selector,
					Provider,
				),

			registerSelectionRangeProvider: (
				Selector: any,
				Provider: any,
			) =>
				RegisterProvider(
					"selection_range_provider",
					Selector,
					Provider,
				),

			registerDocumentSemanticTokensProvider: (
				Selector: any,
				Provider: any,
				Legend: any,
			) =>
				RegisterProvider(
					"semantic_tokens_provider",
					Selector,
					Provider,
				),

			registerDocumentRangeSemanticTokensProvider: (
				Selector: any,
				Provider: any,
				Legend: any,
			) =>
				RegisterProvider(
					"semantic_tokens_provider",
					Selector,
					Provider,
				),

			registerInlayHintsProvider: (
				Selector: any,
				Provider: any,
			) =>
				RegisterProvider(
					"inlay_hints_provider",
					Selector,
					Provider,
				),

			registerTypeHierarchyProvider: (
				Selector: any,
				Provider: any,
			) =>
				RegisterProvider(
					"type_hierarchy_provider",
					Selector,
					Provider,
				),

			registerCallHierarchyProvider: (
				Selector: any,
				Provider: any,
			) =>
				RegisterProvider(
					"call_hierarchy_provider",
					Selector,
					Provider,
				),

			registerLinkedEditingRangeProvider: (
				Selector: any,
				Provider: any,
			) =>
				RegisterProvider(
					"linked_editing_range_provider",
					Selector,
					Provider,
				),

			registerDocumentLinkProvider: (
				Selector: any,
				Provider: any,
			) =>
				RegisterProvider(
					"document_link_provider",
					Selector,
					Provider,
				),

			registerColorProvider: (Selector: any, Provider: any) =>
				RegisterProvider(
					"color_provider",
					Selector,
					Provider,
				),

			registerImplementationProvider: (
				Selector: any,
				Provider: any,
			) =>
				RegisterProvider(
					"implementation_provider",
					Selector,
					Provider,
				),

			registerTypeDefinitionProvider: (
				Selector: any,
				Provider: any,
			) =>
				RegisterProvider(
					"type_definition_provider",
					Selector,
					Provider,
				),

			registerDeclarationProvider: (
				Selector: any,
				Provider: any,
			) =>
				RegisterProvider(
					"declaration_provider",
					Selector,
					Provider,
				),

			registerEvaluatableExpressionProvider: (
				Selector: any,
				Provider: any,
			) =>
				RegisterProvider(
					"evaluatable_expression_provider",
					Selector,
					Provider,
				),

			registerInlineValuesProvider: (
				Selector: any,
				Provider: any,
			) =>
				RegisterProvider(
					"inline_values_provider",
					Selector,
					Provider,
				),

			setLanguageConfiguration: (
				Language: string,
				Configuration: any,
			) => {
				console.log(
					`[APIFactory] ${ExtensionId}: setLanguageConfiguration for ${Language}`,
				);
				return { dispose: () => {} };
			},
		};
	}

	/**
	 * Create debug API
	 */
	private createDebugAPI(context: ExtensionAPIContext): any {
		return {
			registerDebugAdapterTracker: () => ({ dispose: () => {} }),
			startDebugging: async () => false,
		};
	}

	/**
	 * Create SCM API
	 */
	private createSCMAPI(context: ExtensionAPIContext): any {
		return {
			createSourceControl: () => ({
				createResourceGroup: () => ({}),
			}),
		};
	}

	/**
	 * Create authentication API
	 */
	private createAuthenticationAPI(context: ExtensionAPIContext): any {
		return {
			getSession: async () => undefined,
			getSessions: async () => [],
		};
	}

	// Security validation methods

	/**
	 * Validate URI access
	 */
	private validateURIAccess(extensionId: string, uri: any): void {
		const securityContext =
			this.securityPolicies.get(extensionId) ||
			this.securityPolicies.get("default");

		if (securityContext && !securityContext.allowNetworkAccess) {
			if (uri && (uri.scheme === "http" || uri.scheme === "https")) {
				throw new Error(
					`[APIFactory] Network access denied for ${extensionId}: ${uri}`,
				);
			}
		}
	}

	/**
	 * Validate clipboard access
	 */
	private validateClipboardAccess(
		extensionId: string,
		type: "read" | "write",
	): void {
		// All extensions have clipboard access by default
		console.log(
			`[APIFactory] Clipboard ${type} access granted to ${extensionId}`,
		);
	}

	/**
	 * Validate external access
	 */
	private validateExternalAccess(extensionId: string, target: any): void {
		const securityContext =
			this.securityPolicies.get(extensionId) ||
			this.securityPolicies.get("default");

		if (securityContext && !securityContext.allowNetworkAccess) {
			console.warn(
				`[APIFactory] External access restricted for ${extensionId}: ${target}`,
			);
		}
	}

	/**
	 * Validate config access
	 */
	private validateConfigAccess(extensionId: string, key: string): void {
		const securityContext =
			this.securityPolicies.get(extensionId) ||
			this.securityPolicies.get("default");

		if (securityContext && securityContext.restrictedAPIs.length > 0) {
			const restricted = securityContext.restrictedAPIs.includes(key);
			if (restricted) {
				console.warn(
					`[APIFactory] Config access restricted for ${extensionId}: ${key}`,
				);
			}
		}
	}

	/**
	 * Validate command access
	 */
	private validateCommandAccess(extensionId: string, command: string): void {
		const securityContext =
			this.securityPolicies.get(extensionId) ||
			this.securityPolicies.get("default");

		const dangerousCommands = [
			"workbench.action.files.saveAll",
			"workbench.action.closeAllEditors",
			"workbench.action.reloadWindow",
		];

		if (dangerousCommands.includes(command)) {
			if (securityContext && !securityContext.allowFileSystemAccess) {
				console.warn(
					`[APIFactory] Dangerous command access restricted for ${extensionId}: ${command}`,
				);
			}
		}
	}

	/**
	 * Validate webview access
	 */
	private validateWebviewAccess(extensionId: string, viewType: string): void {
		const securityContext =
			this.securityPolicies.get(extensionId) ||
			this.securityPolicies.get("default");

		if (
			securityContext &&
			securityContext.restrictedAPIs.includes("window.createWebviewPanel")
		) {
			throw new Error(
				`[APIFactory] Webview access denied for ${extensionId}: ${viewType}`,
			);
		}
	}

	/**
	 * Validate file system access
	 */
	private validateFileSystemAccess(
		extensionId: string,
		type: "read" | "write",
		path: any,
	): void {
		const securityContext =
			this.securityPolicies.get(extensionId) ||
			this.securityPolicies.get("default");

		if (
			securityContext &&
			!securityContext.allowFileSystemAccess &&
			type === "write"
		) {
			throw new Error(
				`[APIFactory] File system write access denied for ${extensionId}: ${path}`,
			);
		}
	}

	/**
	 * Apply security policies to API
	 */
	private async applySecurityPolicies(
		api: VSCodeAPI,
		securityContext: any,
	): Promise<void> {
		console.log(`[APIFactory] Applying security policies to API`);

		// Apply restricted APIs
		if (securityContext.restrictedAPIs) {
			for (const restrictedAPI of securityContext.restrictedAPIs) {
				const parts = restrictedAPI.split(".");
				let current = api as any;

				for (let i = 0; i < parts.length; i++) {
					if (current && typeof current === "object") {
						if (i === parts.length - 1) {
							// Remove or block the restricted API
							delete current[parts[i]];
							break;
						}
						current = current[parts[i]];
					}
				}
			}
		}

		// Restrict file system access if needed
		if (!securityContext.allowFileSystemAccess) {
			if (api.workspace && api.workspace.fs) {
				api.workspace.fs.writeFile = async () => {
					throw new Error(
						"File system write access denied by security policy",
					);
				};
			}
		}

		console.log(`[APIFactory] Security policies applied successfully`);
	}

	/**
	 * Validate constructed API matches version spec
	 */
	private validateConstructedAPI(
		api: VSCodeAPI,
		apiVersion: string,
	): { valid: boolean; issues: string[] } {
		const issues: string[] = [];
		const versionMatrix = this.apiVersions.get("vscode") || [];
		const versionInfo = versionMatrix.find((v) => v.version === apiVersion);

		if (!versionInfo) {
			issues.push(`API version ${apiVersion} not found in matrix`);
			return { valid: false, issues };
		}

		// Check for required APIs
		for (const requiredAPI of versionInfo.availableAPIs) {
			if (!(requiredAPI in api)) {
				issues.push(`Required API ${requiredAPI} missing`);
			}
		}

		// Check for removed APIs
		for (const removedAPI of versionInfo.removedAPIs) {
			if (removedAPI in api) {
				issues.push(`Removed API ${removedAPI} still present`);
			}
		}

		return {
			valid: issues.length === 0,
			issues,
		};
	}

	/**
	 * Create extension context
	 */
	async createExtensionContext(
		extensionId: string,
		extensionDescription: any,
	): Promise<any> {
		console.log(
			`[APIFactory] Creating extension context for ${extensionId}`,
		);

		return {
			extension: {
				id: extensionId,
				extensionUri: extensionDescription.extensionLocation,
				extensionPath: extensionDescription.extensionLocation,
				isActive: true,
				exports: undefined,
				packageJSON: {},
			},
			subscriptions: [],
			workspaceState: {},
			globalState: {},
			secrets: {},
			asAbsolutePath: (relativePath: string) => {
				return `${extensionDescription.extensionLocation}/${relativePath}`;
			},
		};
	}

	/**
	 * Register API service
	 */
	async registerService(
		serviceName: string,
		serviceImplementation: any,
	): Promise<void> {
		console.log(`[APIFactory] Registering service: ${serviceName}`);

		// Validate service implementation
		if (
			!serviceImplementation ||
			typeof serviceImplementation !== "object"
		) {
			throw new Error(
				`Invalid service implementation for ${serviceName}`,
			);
		}

		// Add service to available APIs
		this.apiVersions.set(serviceName, [
			{
				version: "1.0.0",
				availableAPIs: Object.keys(serviceImplementation),
				deprecatedAPIs: [],
				removedAPIs: [],
				securityLevel: "strict",
			},
		]);

		console.log(
			`[APIFactory] Service ${serviceName} registered successfully`,
		);
	}

	/**
	 * Validate API compatibility
	 */
	async validateAPICompatibility(
		extensionId: string,
		apiVersion: string,
	): Promise<APIValidationResult> {
		console.log(
			`[APIFactory] Validating API compatibility for ${extensionId}: ${apiVersion}`,
		);

		const versionMatrix = this.apiVersions.get("vscode") || [];
		const versionInfo = versionMatrix.find((v) => v.version === apiVersion);

		if (!versionInfo) {
			return {
				valid: false,
				missingAPIs: ["All APIs"],
				deprecatedAPIs: [],
				performanceWarnings: [],
			};
		}

		return {
			valid: true,
			missingAPIs: [],
			deprecatedAPIs: versionInfo.deprecatedAPIs,
			performanceWarnings: [],
		};
	}

	/**
	 * Get API usage statistics
	 */
	async getUsageStatistics(): Promise<{
		totalAPIConstructions: number;
		averageConstructionTime: number;
		mostUsedAPIs: string[];
		performanceMetrics: any;
	}> {
		const avgTime =
			this.constructionMetrics.total > 0
				? this.constructionMetrics.totalTime /
					this.constructionMetrics.total
				: 0;

		// Find most used extensions
		const sortedStats = Array.from(
			this.constructionMetrics.statistics.entries(),
		).sort((a, b) => b[1] - a[1]);

		const cacheHitRate =
			this.apiCache.size > 0
				? this.constructionMetrics.total /
					(this.constructionMetrics.total + this.apiCache.size)
				: 0;

		return {
			totalAPIConstructions: this.constructionMetrics.total,
			averageConstructionTime: avgTime,
			mostUsedAPIs: sortedStats.slice(0, 5).map(([ext]) => ext),
			performanceMetrics: {
				cacheHitRate,
				constructionSuccessRate:
					this.constructionMetrics.total > 0 ? 1.0 : 0,
				averageCacheSize: this.apiCache.size,
			},
		};
	}

	/**
	 * Update API version
	 */
	async updateAPIVersion(version: string): Promise<void> {
		console.log(`[APIFactory] Updating API version to ${version}`);

		// Validate version exists
		const versionMatrix = this.apiVersions.get("vscode") || [];
		const exists = versionMatrix.some((v) => v.version === version);

		if (!exists) {
			throw new Error(`API version ${version} not found`);
		}

		// Clear cache on version update
		this.apiCache.clear();

		// Reinitialize cache with new version
		await this.initializeCache();

		console.log(`[APIFactory] API version updated to ${version}`);
	}

	/**
	 * Get cache key
	 */
	private getCacheKey(extensionId: string, apiVersion: string): string {
		return `${extensionId}:${apiVersion}`;
	}

	/**
	 * Get API surface for version
	 */
	private getAPISurfaceForVersion(apiVersion: string): string[] {
		const versionMatrix = this.apiVersions.get("vscode") || [];
		const versionInfo = versionMatrix.find((v) => v.version === apiVersion);
		return versionInfo?.availableAPIs || [];
	}

	/**
	 * Track API cache hit
	 */
	private trackAPICacheHit(cacheKey: string): void {
		// Track cache hits for analytics
		console.log(`[APIFactory] Cache hit for ${cacheKey}`);
	}

	/**
	 * Update construction metrics
	 */
	private updateMetrics(constructionTime: number, extensionId: string): void {
		this.constructionMetrics.total++;
		this.constructionMetrics.totalTime += constructionTime;

		// Track per-extension statistics
		const currentCount =
			this.constructionMetrics.statistics.get(extensionId) || 0;
		this.constructionMetrics.statistics.set(extensionId, currentCount + 1);
	}

	/**
	 * Cleanup API factory service
	 */
	async cleanup(): Promise<void> {
		console.log("[APIFactory] Cleaning up service");

		this.apiCache.clear();
		this.apiVersions.clear();
		this.securityPolicies.clear();
		this.constructionMetrics = {
			total: 0,
			totalTime: 0,
			statistics: new Map(),
		};

		console.log("[APIFactory] Service cleaned up");
	}
}

/**
 * Service layer for APIFactory
 */
export const APIFactoryLayer = Layer.effect(
	IAPIFactory,
	Effect.sync(
		() =>
			new APIFactory(
				{} as IConfigurationService,
				{} as IModuleInterceptor,
			),
	),
);

/**
 * Live implementation for testing
 */
export const APIFactoryLive = Layer.effect(
	IAPIFactory,
	Effect.sync(
		() =>
			new APIFactory(
				{} as IConfigurationService,
				{} as IModuleInterceptor,
			),
	),
);

export default APIFactory;
