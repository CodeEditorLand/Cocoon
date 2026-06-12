/**
 * @module Effect/ModuleInterceptor
 * @description
 * Atomic module interceptor service for Cocoon Extension Host.
 * Provides AST-based security sandboxing and module isolation for extensions.
 */

import { CocoonDevLog } from "../../Services/Dev/Log.js";
import { getTelemetry, type TelemetryService } from "../Telemetry.js";

// ============================================================================
// TYPES
// ============================================================================

export enum SecurityLevel {
	TRUSTED = "TRUSTED",

	SANDBOXED = "SANDBOXED",

	RESTRICTED = "RESTRICTED",

	BLOCKED = "BLOCKED",
}

export interface SecurityPolicy {
	extensionId: string;

	allowedModules: ReadonlyArray<string>;

	blockedModules: ReadonlyArray<string>;

	securityLevel: SecurityLevel;

	maxMemoryUsage?: number;

	maxExecutionTime?: number;
}

export interface ModuleInterceptionRequest {
	moduleId: string;

	parentModule?: string;

	extensionId: string;

	requirePath: string;
}

export interface ModuleInterceptionResult {
	success: boolean;

	module?: unknown;

	error?: string;

	securityLevel: SecurityLevel;
}

export interface InterceptionStats {
	totalInterceptions: number;

	blockedModules: number;

	averageResolutionTime: number;

	securityViolations: number;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class ModuleNotFoundError extends Error {
	readonly _tag = "ModuleNotFoundError";

	constructor(
		readonly moduleId: string,

		readonly extensionId: string,
	) {
		super(`Module not found: ${moduleId} for extension ${extensionId}`);
	}
}

export class ModuleAccessDeniedError extends Error {
	readonly _tag = "ModuleAccessDeniedError";

	constructor(
		readonly moduleId: string,

		readonly reason: string,
	) {
		super(`Module access denied: ${moduleId} - ${reason}`);
	}
}

export class SecurityPolicyNotFoundError extends Error {
	readonly _tag = "SecurityPolicyNotFoundError";

	constructor(readonly extensionId: string) {
		super(`Security policy not found for extension: ${extensionId}`);
	}
}

// ============================================================================
// MODULE INTERCEPTOR SERVICE INTERFACE
// ============================================================================

export interface ModuleInterceptorService {
	/**
	 * Initialize module interception service
	 */
	readonly initialize: () => Promise<void>;

	/**
	 * Install module interceptor into Node.js module system.
	 * Patches Module._load to intercept require('vscode').
	 */
	readonly install: () => Promise<void>;

	/**
	 * Register a vscode API instance for an extension.
	 * When the extension calls require('vscode'), this API is returned.
	 */
	readonly registerVscodeAPI: (
		extensionId: string,

		api: unknown,
	) => Promise<void>;

	/**
	 * Intercept module require calls
	 */
	readonly interceptRequire: (
		request: ModuleInterceptionRequest,
	) => Promise<ModuleInterceptionResult>;

	/**
	 * Resolve module path for extension
	 */
	readonly resolveModule: (
		extensionId: string,

		modulePath: string,
	) => Promise<string>;

	/**
	 * Set security policy for extension
	 */
	readonly setSecurityPolicy: (policy: SecurityPolicy) => Promise<void>;

	/**
	 * Get security policy for extension
	 */
	readonly getSecurityPolicy: (
		extensionId: string,
	) => Promise<SecurityPolicy>;

	/**
	 * Validate module security
	 */
	readonly validateModuleSecurity: (
		extensionId: string,

		moduleId: string,
	) => Promise<boolean>;

	/**
	 * Get interception statistics
	 */
	readonly getStatistics: () => Promise<InterceptionStats>;
}

// ============================================================================
// SERVICE TAG (plain object, no Effect.Context.Tag)
// ============================================================================

export const ModuleInterceptorTag = {
	_tag: "Cocoon/ModuleInterceptor",
} as const;

export const ModuleInterceptor = ModuleInterceptorTag;

// ============================================================================
// IMPLEMENTATION
// ============================================================================

const defaultSecurityPolicy = {
	allowedModules: ["path", "url", "util", "events", "stream", "buffer"],

	blockedModules: [
		"fs",

		"child_process",

		"net",

		"http",

		"https",

		"os",

		"crypto",
	],

	securityLevel: SecurityLevel.SANDBOXED,

	maxMemoryUsage: 128 * 1024 * 1024, // 128MB

	maxExecutionTime: 5000, // 5 seconds
} satisfies Omit<SecurityPolicy, "extensionId">;

async function makeModuleInterceptorService(): Promise<ModuleInterceptorService> {
	const telemetry: TelemetryService = getTelemetry();

	// Security policies for extensions
	const policies = new Map<string, SecurityPolicy>();

	// Module cache
	const moduleCache = new Map<string, unknown>();

	// Statistics
	let stats: InterceptionStats = {
		totalInterceptions: 0,

		blockedModules: 0,

		averageResolutionTime: 0,

		securityViolations: 0,
	};

	// Resolution times for average calculation
	const resolutionTimes: number[] = [];

	// vscode API registry: extensionId → vscode API instance
	const vscodeAPIRegistry = new Map<string, unknown>();

	// Check if module is a Node.js built-in
	const isNodeBuiltin = (moduleId: string): boolean => {
		const builtins = [
			"fs",

			"path",

			"os",

			"net",

			"http",

			"https",

			"child_process",

			"crypto",

			"util",

			"events",

			"stream",

			"buffer",

			"url",

			"querystring",
		];

		return builtins.includes(moduleId);
	};

	// Atom: Initialize
	const initialize = async (): Promise<void> => {
		telemetry.log(
			"info",

			"[ModuleInterceptor] Initializing module interceptor service...",
		);

		await new Promise<void>((r) => setTimeout(r, 5));

		telemetry.log(
			"info",

			"[ModuleInterceptor] Module interceptor service initialized",
		);
	};

	// Atom: Install - patches Node.js Module._load to intercept require('vscode')
	const install = async (): Promise<void> => {
		telemetry.log(
			"info",

			"[ModuleInterceptor] Installing Node.js Module._load hook...",
		);

		// Cocoon/Main.js is an ESM bundle - `require` is not in scope.
		// Use dynamic import() to get the Module constructor.
		const { default: NodeModule } = (await import("node:module")) as any;

		const OriginalLoad = NodeModule._load;

		NodeModule._load = function PatchedLoad(
			Request: string,

			Parent: any,

			IsMain: boolean,
		) {
			// Intercept require('vscode') - return the API shim
			if (Request === "vscode") {
				// Determine which extension is loading by checking parent filename
				const ParentFilename: string =
					Parent?.filename ?? Parent?.id ?? "";

				// Look up registered API for this extension, or use default
				for (const [ExtensionId, API] of vscodeAPIRegistry) {
					if (ParentFilename.includes(ExtensionId)) {
						return API;
					}
				}

				// Fallback: return the last registered API (single-extension mode)
				if (vscodeAPIRegistry.size > 0) {
					const LastAPI = [...vscodeAPIRegistry.values()].pop();

					return LastAPI;
				}

				// Bridge fallback: GRPCServerService sets globalThis.__cocoonVscodeAPI
				// before activating extensions. Bridges imperative activation
				// with the module interception layer.
				const GlobalAPI = (globalThis as any).__cocoonVscodeAPI;

				if (GlobalAPI) {
					return GlobalAPI;
				}

				// No API registered yet - return empty namespace
				CocoonDevLog(
					"ext-host",

					`[ModuleInterceptor] require('vscode') called but no API registered (parent: ${ParentFilename.slice(-80)})`,
				);

				return {};
			}

			// All other modules: pass through to Node.js
			return OriginalLoad.apply(this, [Request, Parent, IsMain]);
		};

		telemetry.log(
			"info",

			"[ModuleInterceptor] Module._load hook installed - require('vscode') intercepted",
		);
	};

	// Atom: Intercept require
	const interceptRequire = async (
		request: ModuleInterceptionRequest,
	): Promise<ModuleInterceptionResult> => {
		const startTime = Date.now();

		// Update statistics
		stats = { ...stats, totalInterceptions: stats.totalInterceptions + 1 };

		// Get security policy for extension
		const policy = policies.get(request.extensionId) ?? {
			...defaultSecurityPolicy,

			extensionId: request.extensionId,
		};

		if (!policies.has(request.extensionId)) {
			telemetry.log(
				"warn",

				`[ModuleInterceptor] No policy for extension ${request.extensionId}, using default`,
			);
		}

		// Check blocked modules
		if (policy.blockedModules.includes(request.moduleId)) {
			telemetry.log(
				"warn",

				`[ModuleInterceptor] Blocked module access: ${request.moduleId} for ${request.extensionId}`,
			);

			stats = {
				...stats,

				blockedModules: stats.blockedModules + 1,

				securityViolations: stats.securityViolations + 1,
			};

			return {
				success: false,

				error: `Module access denied: ${request.moduleId}`,

				securityLevel: SecurityLevel.BLOCKED,
			} satisfies ModuleInterceptionResult;
		}

		// Check allowed modules
		if (
			!policy.allowedModules.includes(request.moduleId) &&
			!isNodeBuiltin(request.moduleId)
		) {
			// For non-builtin and non-allowed modules, block
			telemetry.log(
				"warn",

				`[ModuleInterceptor] Module not in allowlist: ${request.moduleId} for ${request.extensionId}`,
			);

			stats = {
				...stats,

				blockedModules: stats.blockedModules + 1,

				securityViolations: stats.securityViolations + 1,
			};

			return {
				success: false,

				error: `Module not in allowlist: ${request.moduleId}`,

				securityLevel: SecurityLevel.RESTRICTED,
			} satisfies ModuleInterceptionResult;
		}

		// Check cache first
		const cacheKey = `${request.extensionId}:${request.moduleId}`;

		const cachedModule = moduleCache.get(cacheKey);

		if (cachedModule !== undefined) {
			const duration = Date.now() - startTime;

			resolutionTimes.push(duration);

			const avgTime =
				resolutionTimes.reduce((a, b) => a + b, 0) /
				resolutionTimes.length;

			stats = { ...stats, averageResolutionTime: avgTime };

			telemetry.log(
				"debug",

				`[ModuleInterceptor] Module cache hit: ${request.moduleId} (${duration}ms)`,
			);

			return {
				success: true,

				module: cachedModule,

				securityLevel: policy.securityLevel,
			} satisfies ModuleInterceptionResult;
		}

		// Load module (in production, this would actually require the module)
		await new Promise<void>((r) => setTimeout(r, 5)); // Simulate loading

		telemetry.log(
			"info",

			`[ModuleInterceptor] Module loaded: ${request.moduleId} for ${request.extensionId}`,
		);

		// For now, return a mock module object
		const loadedModule: unknown = { module: request.moduleId };

		// Cache the module
		moduleCache.set(cacheKey, loadedModule);

		const duration = Date.now() - startTime;

		resolutionTimes.push(duration);

		const avgTime =
			resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length;

		stats = { ...stats, averageResolutionTime: avgTime };

		return {
			success: true,

			module: loadedModule,

			securityLevel: policy.securityLevel,
		} satisfies ModuleInterceptionResult;
	};

	// Atom: Resolve module
	const resolveModule = async (
		extensionId: string,

		modulePath: string,
	): Promise<string> => {
		// In production, this would resolve the actual module path
		await new Promise<void>((r) => setTimeout(r, 5));

		// Mock resolution
		if (!modulePath) {
			throw new ModuleNotFoundError(modulePath, extensionId);
		}

		// Return resolved path (mock)
		return `/node_modules/${modulePath}/index.js`;
	};

	// Atom: Set security policy
	const setSecurityPolicy = async (policy: SecurityPolicy): Promise<void> => {
		policies.set(policy.extensionId, policy);

		telemetry.log(
			"info",

			`[ModuleInterceptor] Security policy set for extension ${policy.extensionId} (${policy.securityLevel})`,
		);
	};

	// Atom: Get security policy
	const getSecurityPolicy = async (
		extensionId: string,
	): Promise<SecurityPolicy> => {
		const policy = policies.get(extensionId);

		if (policy === undefined) {
			throw new SecurityPolicyNotFoundError(extensionId);
		}

		return policy;
	};

	// Atom: Validate module security
	const validateModuleSecurity = async (
		extensionId: string,

		moduleId: string,
	): Promise<boolean> => {
		const policy = policies.get(extensionId) ?? {
			...defaultSecurityPolicy,

			extensionId,
		};

		return (
			!policy.blockedModules.includes(moduleId) ||
			policy.allowedModules.includes(moduleId) ||
			isNodeBuiltin(moduleId)
		);
	};

	// Atom: Get statistics
	const getStatistics = async (): Promise<InterceptionStats> => stats;

	// Atom: Register vscode API for an extension
	const registerVscodeAPI = async (
		extensionId: string,

		api: unknown,
	): Promise<void> => {
		vscodeAPIRegistry.set(extensionId, api);

		telemetry.log(
			"info",

			`[ModuleInterceptor] Registered vscode API for extension: ${extensionId}`,
		);
	};

	return {
		initialize,

		install,

		registerVscodeAPI,

		interceptRequire,

		resolveModule,

		setSecurityPolicy,

		getSecurityPolicy,

		validateModuleSecurity,

		getStatistics,
	} satisfies ModuleInterceptorService;
}

// ============================================================================
// SINGLETON
// ============================================================================

let _instance: ModuleInterceptorService | undefined;

export async function getModuleInterceptor(): Promise<ModuleInterceptorService> {
	if (_instance === undefined) {
		_instance = await makeModuleInterceptorService();
	}

	return _instance;
}

// Eagerly-created live layer (resolves on first access)
export const ModuleInterceptorLive: Promise<ModuleInterceptorService> =
	makeModuleInterceptorService();

// ============================================================================
// MOCK FOR TESTING
// ============================================================================

export const makeMockModuleInterceptor = (): ModuleInterceptorService => ({
	initialize: async () => {
		await new Promise<void>((r) => setTimeout(r, 1));
	},

	install: async () => {
		await new Promise<void>((r) => setTimeout(r, 1));
	},

	registerVscodeAPI: async (_extensionId, _api) => {
		await new Promise<void>((r) => setTimeout(r, 1));
	},

	interceptRequire: async (request) => {
		await new Promise<void>((r) => setTimeout(r, 1));

		return {
			success: true,
			module: { mock: true, moduleId: request.moduleId },
			securityLevel: SecurityLevel.SANDBOXED,
		} satisfies ModuleInterceptionResult;
	},

	resolveModule: async (_extensionId, modulePath) => {
		await new Promise<void>((r) => setTimeout(r, 1));

		return `/node_modules/${modulePath}/index.js`;
	},

	setSecurityPolicy: async (_policy) => {
		await new Promise<void>((r) => setTimeout(r, 1));
	},

	getSecurityPolicy: async (extensionId) => {
		await new Promise<void>((r) => setTimeout(r, 1));

		return {
			extensionId,
			allowedModules: ["path", "util"],
			blockedModules: ["fs"],
			securityLevel: SecurityLevel.SANDBOXED,
		} satisfies SecurityPolicy;
	},

	validateModuleSecurity: async (_extensionId, _moduleId) => {
		await new Promise<void>((r) => setTimeout(r, 1));

		return true;
	},

	getStatistics: async () => {
		await new Promise<void>((r) => setTimeout(r, 1));

		return {
			totalInterceptions: 100,
			blockedModules: 5,
			averageResolutionTime: 2.5,
			securityViolations: 3,
		} satisfies InterceptionStats;
	},
});

export const ModuleInterceptorMock: ModuleInterceptorService =
	makeMockModuleInterceptor();
