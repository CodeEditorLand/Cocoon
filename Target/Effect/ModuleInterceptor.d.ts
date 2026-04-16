/**
 * @module Effect/ModuleInterceptor
 * @description
 * Atomic module interceptor service for Cocoon Extension Host using Effect-TS.
 * Provides AST-based security sandboxing and module isolation for extensions.
 * Wraps the existing ModuleInterceptorService with Effect patterns.
 */
import { Context, Effect, Layer } from "effect";
import { TelemetryTag } from "./Telemetry.js";
export declare enum SecurityLevel {
    TRUSTED = "TRUSTED",
    SANDBOXED = "SANDBOXED",
    RESTRICTED = "RESTRICTED",
    BLOCKED = "BLOCKED"
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
export declare class ModuleNotFoundError extends Error {
    readonly moduleId: string;
    readonly extensionId: string;
    readonly _tag = "ModuleNotFoundError";
    constructor(moduleId: string, extensionId: string);
}
export declare class ModuleAccessDeniedError extends Error {
    readonly moduleId: string;
    readonly reason: string;
    readonly _tag = "ModuleAccessDeniedError";
    constructor(moduleId: string, reason: string);
}
export declare class SecurityPolicyNotFoundError extends Error {
    readonly extensionId: string;
    readonly _tag = "SecurityPolicyNotFoundError";
    constructor(extensionId: string);
}
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
    readonly registerVscodeAPI: (extensionId: string, api: unknown) => Effect.Effect<void, never>;
    /**
     * Intercept module require calls
     */
    readonly interceptRequire: (request: ModuleInterceptionRequest) => Effect.Effect<ModuleInterceptionResult, never>;
    /**
     * Resolve module path for extension
     */
    readonly resolveModule: (extensionId: string, modulePath: string) => Effect.Effect<string, ModuleNotFoundError>;
    /**
     * Set security policy for extension
     */
    readonly setSecurityPolicy: (policy: SecurityPolicy) => Effect.Effect<void, never>;
    /**
     * Get security policy for extension
     */
    readonly getSecurityPolicy: (extensionId: string) => Effect.Effect<SecurityPolicy, SecurityPolicyNotFoundError>;
    /**
     * Validate module security
     */
    readonly validateModuleSecurity: (extensionId: string, moduleId: string) => Effect.Effect<boolean, never>;
    /**
     * Get interception statistics
     */
    readonly getStatistics: Effect.Effect<InterceptionStats, never>;
}
declare const ModuleInterceptorTag_base: Context.TagClass<ModuleInterceptorTag, "Cocoon/ModuleInterceptor", ModuleInterceptorService>;
export declare class ModuleInterceptorTag extends ModuleInterceptorTag_base {
}
export declare const ModuleInterceptor: typeof ModuleInterceptorTag;
export declare const ModuleInterceptorLive: Layer.Layer<ModuleInterceptorTag, never, TelemetryTag>;
export declare const makeMockModuleInterceptor: () => ModuleInterceptorService;
export declare const ModuleInterceptorMock: Layer.Layer<ModuleInterceptorTag, never, never>;
export {};
//# sourceMappingURL=ModuleInterceptor.d.ts.map