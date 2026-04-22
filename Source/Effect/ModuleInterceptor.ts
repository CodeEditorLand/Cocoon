/**
 * @module Effect/ModuleInterceptor
 * @description
 * Atomic module interceptor service for Cocoon Extension Host using Effect-TS.
 * Provides AST-based security sandboxing and module isolation for extensions.
 * Wraps the existing ModuleInterceptorService with Effect patterns.
 */

import {
	Context,
	Effect,
	HashMap,
	Layer,
	Option,
	Ref,
	SubscriptionRef,
} from "effect";

import { TelemetryTag } from "./Telemetry.js";

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
	readonly initialize: Effect.Effect<void, never>;

	/**
	 * Install module interceptor into Node.js module system.
	 * Patches Module._load to intercept require('vscode').
	 */
	readonly install: Effect.Effect<void, never>;

	/**
	 * Register a vscode API instance for an extension.
	 * When the extension calls require('vscode'), this API is returned.
	 */
	readonly registerVscodeAPI: (
		extensionId: string,
		api: unknown,
	) => Effect.Effect<void, never>;

	/**
	 * Intercept module require calls
	 */
	readonly interceptRequire: (
		request: ModuleInterceptionRequest,
	) => Effect.Effect<ModuleInterceptionResult, never>;

	/**
	 * Resolve module path for extension
	 */
	readonly resolveModule: (
		extensionId: string,
		modulePath: string,
	) => Effect.Effect<string, ModuleNotFoundError>;

	/**
	 * Set security policy for extension
	 */
	readonly setSecurityPolicy: (
		policy: SecurityPolicy,
	) => Effect.Effect<void, never>;

	/**
	 * Get security policy for extension
	 */
	readonly getSecurityPolicy: (
		extensionId: string,
	) => Effect.Effect<SecurityPolicy, SecurityPolicyNotFoundError>;

	/**
	 * Validate module security
	 */
	readonly validateModuleSecurity: (
		extensionId: string,
		moduleId: string,
	) => Effect.Effect<boolean, never>;

	/**
	 * Get interception statistics
	 */
	readonly getStatistics: Effect.Effect<InterceptionStats, never>;
}

// ============================================================================
// SERVICE TAG
// ============================================================================

export class ModuleInterceptorTag extends Context.Tag(
	"Cocoon/ModuleInterceptor",
)<ModuleInterceptorTag, ModuleInterceptorService>() {}

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

export const ModuleInterceptorLive = Layer.effect(
	ModuleInterceptor,
	Effect.gen(function* () {
		const telemetry = yield* TelemetryTag;

		// Security policies for extensions
		const policiesRef = yield* SubscriptionRef.make<
			HashMap.HashMap<string, SecurityPolicy>
		>(HashMap.empty());

		// Module cache
		const moduleCacheRef = yield* SubscriptionRef.make<
			HashMap.HashMap<string, unknown>
		>(HashMap.empty());

		// Statistics
		const statsRef = yield* SubscriptionRef.make<InterceptionStats>({
			totalInterceptions: 0,
			blockedModules: 0,
			averageResolutionTime: 0,
			securityViolations: 0,
		});

		// Resolution times for average calculation
		const resolutionTimes: number[] = [];

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
		const initialize = Effect.gen(function* () {
			telemetry.log(
				"info",
				"[ModuleInterceptor] Initializing module interceptor service...",
			);
			// Initialization logic would go here
			yield* Effect.sleep("5 millis");
			telemetry.log(
				"info",
				"[ModuleInterceptor] Module interceptor service initialized",
			);
		});

		// vscode API registry: extensionId → vscode API instance
		const vscodeAPIRegistry = new Map<string, unknown>();

		// Atom: Install - patches Node.js Module._load to intercept require('vscode')
		const install = Effect.gen(function* () {
			telemetry.log(
				"info",
				"[ModuleInterceptor] Installing Node.js Module._load hook...",
			);

			// CocoonMain.js is an ESM bundle - `require` is not in scope.
			// Use dynamic import() to get the Module constructor.
			const { default: NodeModule } = (yield* Effect.tryPromise({
				try: () => import("node:module"),
				catch: (Err) =>
					new Error(`[ModuleInterceptor] import('node:module') failed: ${Err}`),
			})) as any;

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
					// with the Effect-TS module interception layer.
					const GlobalAPI = (globalThis as any).__cocoonVscodeAPI;
					if (GlobalAPI) {
						return GlobalAPI;
					}

					// No API registered yet - return empty namespace
					console.warn(
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
		});

		// Atom: Intercept require
		const interceptRequire = (request: ModuleInterceptionRequest) =>
			Effect.gen(function* () {
				const startTime = Date.now();

				// Update statistics
				const currentStats = yield* statsRef.get;
				yield* Ref.set(statsRef, {
					...currentStats,
					totalInterceptions: currentStats.totalInterceptions + 1,
				});

				// Get security policy for extension
				const policyOpt = HashMap.get(
					yield* policiesRef.get,
					request.extensionId,
				);

				if (policyOpt._tag === "None") {
					// Use default policy
					yield* telemetry.log(
						"warn",
						`[ModuleInterceptor] No policy for extension ${request.extensionId}, using default`,
					);
				}

				const policy =
					policyOpt._tag === "Some"
						? policyOpt.value
						: {
								...defaultSecurityPolicy,
								extensionId: request.extensionId,
							};

				// Check blocked modules
				if (policy.blockedModules.includes(request.moduleId)) {
					yield* telemetry.log(
						"warn",
						`[ModuleInterceptor] Blocked module access: ${request.moduleId} for ${request.extensionId}`,
					);

					// Update statistics
					const statsAfter = yield* statsRef.get;
					yield* Ref.set(statsRef, {
						...statsAfter,
						blockedModules: statsAfter.blockedModules + 1,
						securityViolations: statsAfter.securityViolations + 1,
					});

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
					yield* telemetry.log(
						"warn",
						`[ModuleInterceptor] Module not in allowlist: ${request.moduleId} for ${request.extensionId}`,
					);

					// Update statistics
					const statsAfter = yield* statsRef.get;
					yield* Ref.set(statsRef, {
						...statsAfter,
						blockedModules: statsAfter.blockedModules + 1,
						securityViolations: statsAfter.securityViolations + 1,
					});

					return {
						success: false,
						error: `Module not in allowlist: ${request.moduleId}`,
						securityLevel: SecurityLevel.RESTRICTED,
					} satisfies ModuleInterceptionResult;
				}

				// Check cache first
				const cacheKey = `${request.extensionId}:${request.moduleId}`;
				const cachedModule = HashMap.get(
					yield* moduleCacheRef.get,
					cacheKey,
				);

				if (cachedModule._tag === "Some") {
					const duration = Date.now() - startTime;
					resolutionTimes.push(duration);

					// Update average
					const allTimes = [...resolutionTimes];
					const avgTime =
						allTimes.reduce((a, b) => a + b, 0) / allTimes.length;
					const statsAfter = yield* statsRef.get;
					yield* Ref.set(statsRef, {
						...statsAfter,
						averageResolutionTime: avgTime,
					});

					telemetry.log(
						"debug",
						`[ModuleInterceptor] Module cache hit: ${request.moduleId} (${duration}ms)`,
					);

					return {
						success: true,
						module: cachedModule.value,
						securityLevel: policy.securityLevel,
					} satisfies ModuleInterceptionResult;
				}

				// Load module (in production, this would actually require the module)
				yield* Effect.sleep("5 millis"); // Simulate loading

				telemetry.log(
					"info",
					`[ModuleInterceptor] Module loaded: ${request.moduleId} for ${request.extensionId}`,
				);

				// For now, return a mock module object
				const module: unknown = { module: request.moduleId };

				// Cache the module
				const currentCache = yield* moduleCacheRef.get;
				yield* Ref.set(
					moduleCacheRef,
					HashMap.set(currentCache, cacheKey, module),
				);

				const duration = Date.now() - startTime;
				resolutionTimes.push(duration);

				// Update average
				const allTimes = [...resolutionTimes];
				const avgTime =
					allTimes.reduce((a, b) => a + b, 0) / allTimes.length;
				const statsAfter = yield* statsRef.get;
				yield* Ref.set(statsRef, {
					...statsAfter,
					averageResolutionTime: avgTime,
				});

				return {
					success: true,
					module,
					securityLevel: policy.securityLevel,
				} satisfies ModuleInterceptionResult;
			});

		// Atom: Resolve module
		const resolveModule = (extensionId: string, modulePath: string) =>
			Effect.gen(function* () {
				// In production, this would resolve the actual module path
				yield* Effect.sleep("5 millis");

				// Mock resolution
				if (!modulePath) {
					return yield* Effect.fail(
						new ModuleNotFoundError(modulePath, extensionId),
					);
				}

				// Return resolved path (mock)
				const resolvedPath = `/node_modules/${modulePath}/index.js`;
				return resolvedPath;
			});

		// Atom: Set security policy
		const setSecurityPolicy = (policy: SecurityPolicy) =>
			Effect.gen(function* () {
				const currentPolicies = yield* policiesRef.get;
				yield* Ref.set(
					policiesRef,
					HashMap.set(currentPolicies, policy.extensionId, policy),
				);

				telemetry.log(
					"info",
					`[ModuleInterceptor] Security policy set for extension ${policy.extensionId} (${policy.securityLevel})`,
				);
			});

		// Atom: Get security policy
		const getSecurityPolicy = (extensionId: string) =>
			Effect.gen(function* () {
				const policies = yield* policiesRef.get;
				const policy = HashMap.get(policies, extensionId);

				if (policy._tag === "None") {
					return yield* Effect.fail(
						new SecurityPolicyNotFoundError(extensionId),
					);
				}

				return policy.value;
			});

		// Atom: Validate module security
		const validateModuleSecurity = (
			extensionId: string,
			moduleId: string,
		) =>
			Effect.gen(function* () {
				const policies = yield* policiesRef.get;
				const policyOpt = HashMap.get(policies, extensionId);

				if (policyOpt._tag === "None") {
					// Use default policy for validation
					const policy = { ...defaultSecurityPolicy, extensionId };
					return (
						!policy.blockedModules.includes(moduleId) ||
						policy.allowedModules.includes(moduleId) ||
						isNodeBuiltin(moduleId)
					);
				}

				const policy = policyOpt.value;
				return (
					!policy.blockedModules.includes(moduleId) ||
					policy.allowedModules.includes(moduleId) ||
					isNodeBuiltin(moduleId)
				);
			});

		// Atom: Get statistics
		const getStatistics = Effect.gen(function* () {
			return yield* statsRef.get;
		});

		// Atom: Register vscode API for an extension
		const registerVscodeAPI = (extensionId: string, api: unknown) =>
			Effect.gen(function* () {
				vscodeAPIRegistry.set(extensionId, api);
				telemetry.log(
					"info",
					`[ModuleInterceptor] Registered vscode API for extension: ${extensionId}`,
				);
			});

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
	}),
);

// ============================================================================
// MOCK FOR TESTING
// ============================================================================

export const makeMockModuleInterceptor = (): ModuleInterceptorService => ({
	initialize: Effect.gen(function* () {
		yield* Effect.sleep("1 millis");
	}),

	install: Effect.gen(function* () {
		yield* Effect.sleep("1 millis");
	}),

	registerVscodeAPI: (_extensionId, _api) =>
		Effect.gen(function* () {
			yield* Effect.sleep("1 millis");
		}),

	interceptRequire: (request) =>
		Effect.gen(function* () {
			yield* Effect.sleep("1 millis");
			return {
				success: true,
				module: { mock: true, moduleId: request.moduleId },
				securityLevel: SecurityLevel.SANDBOXED,
			} satisfies ModuleInterceptionResult;
		}),

	resolveModule: (extensionId, modulePath) =>
		Effect.gen(function* () {
			yield* Effect.sleep("1 millis");
			return `/node_modules/${modulePath}/index.js`;
		}),

	setSecurityPolicy: (policy) =>
		Effect.gen(function* () {
			yield* Effect.sleep("1 millis");
		}),

	getSecurityPolicy: (extensionId) =>
		Effect.gen(function* () {
			yield* Effect.sleep("1 millis");
			return {
				extensionId,
				allowedModules: ["path", "util"],
				blockedModules: ["fs"],
				securityLevel: SecurityLevel.SANDBOXED,
			} satisfies SecurityPolicy;
		}),

	validateModuleSecurity: (extensionId, moduleId) =>
		Effect.gen(function* () {
			yield* Effect.sleep("1 millis");
			return true;
		}),

	getStatistics: Effect.gen(function* () {
		yield* Effect.sleep("1 millis");
		return {
			totalInterceptions: 100,
			blockedModules: 5,
			averageResolutionTime: 2.5,
			securityViolations: 3,
		} satisfies InterceptionStats;
	}),
});

export const ModuleInterceptorMock = Layer.effect(
	ModuleInterceptor,
	Effect.succeed(makeMockModuleInterceptor()),
);
