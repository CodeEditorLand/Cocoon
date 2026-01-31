/**
 * @module Extension
 * @description
 * Implements the extension discovery and metadata registry service.
 *
 * Architecture:
 * - Lifted from: src/vs/workbench/services/extensions/common/extensionDescriptionRegistry.ts (VSCode Dependency/Editor)
 * - Adapted from: Source/Archive/Extension.ts (borrowed working patterns)
 * - Mountain Integration: Extension discovery via gRPC from Mountain's registry
 *
 * Patterns borrowed from these files:
 * - Extension metadata registry with Ref
 * - Extension description parsing and validation
 * - Extension discovery from configuration files
 * - Change event emitters for extension lifecycle
 *
 * Responsibilities:
 * - Extension discovery from configuration and Mountain
 * - Extension metadata validation and management
 * - Dependency resolution with circular dependency detection
 * - Extension activation/deactivation lifecycle management
 * - Extension state persistence (Mountain integration pending)
 * - Activation metrics tracking for performance monitoring
 * - Extension export caching and retrieval
 * - Change event emission for extension lifecycle
 *
 * Dependencies:
 * - Service/Configuration: For extension configuration access
 * - Service/Logger: For operation logging
 * - Optional: IMountainClientService for remote extension discovery and state persistence
 *
 * TODOs:
 * - MEDIUM: Implement marketplace integration for extension discovery
 * - LOW: Implement extension search by capabilities/features
 * - MEDIUM: Integrate Mountain gRPC for extension discovery (currently stubbed)
 * - LOW: Add extension validation against manifest schema
 */
import { Effect } from "effect";
import type * as VSCode from "vscode";
/**
 * @interface Logger
 * @description Logger interface for service logging
 */
export interface Logger {
    readonly Trace: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;
    readonly Debug: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;
    readonly Info: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;
    readonly Warn: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;
    readonly Error: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;
}
/**
 * @interface Configuration
 * @description Configuration service interface
 */
export interface Configuration {
    readonly GetValue: <T>(key: string, defaultValue?: T) => T;
    readonly UpdateValue: <T>(key: string, value: T) => Promise<void>;
}
/**
 * Extension metadata interface
 * Specification: src/vs/platform/extensions/common/extensions.ts (IExtensionDescription)
 */
export interface IExtensionDescription {
    readonly identifier: string;
    readonly displayName?: string;
    readonly version: string;
    readonly publisher?: string;
    readonly description?: string;
    readonly extensionLocation: VSCode.Uri;
    readonly activationEvents?: string[];
    readonly main?: string;
    readonly browser?: string;
    readonly engines?: {
        vscode: string;
    };
    readonly extensionDependencies?: string[];
    readonly extensionKind?: VSCode.ExtensionKind[];
    readonly contributes?: {
        commands?: Array<{
            command: string;
            title: string;
            category?: string;
        }>;
        configuration?: {
            properties: Record<string, {
                type: string;
                default?: any;
                description?: string;
            }>;
        };
        keybindings?: Array<{
            command: string;
            key: string;
        }>;
        languages?: Array<{
            id: string;
            aliases?: string[];
            extensions?: string[];
            configuration?: string;
        }>;
        grammars?: Array<{
            language: string;
            scopeName: string;
            path: string;
        }>;
        themes?: Array<{
            label: string;
            uiTheme: string;
            path: string;
        }>;
    };
    readonly enabled?: boolean;
    readonly kind?: VSCode.ExtensionKind[];
}
/**
 * Dependency resolution result
 */
export interface DependencyResolutionResult {
    /** Success flag */
    readonly Success: boolean;
    /** Ordered activation sequence */
    readonly ActivationSequence: readonly string[];
    /** Missing dependencies */
    readonly MissingDependencies: readonly string[];
    /** Circular dependency chains detected */
    readonly CircularDependencies: readonly string[][];
    /** Validation error if any */
    readonly Error?: string;
}
/**
 * Public extension interface (what extensions see)
 * This is the public-facing `vscode.Extension<T>` API
 */
export interface IExtension<T = unknown> {
    readonly id: string;
    readonly extensionUri: VSCode.Uri;
    readonly extensionPath: string;
    readonly isActive: boolean;
    readonly packageJSON: IExtensionDescription;
    readonly exports?: T;
    readonly extensionKind?: VSCode.ExtensionKind;
    activate(): Thenable<T>;
}
/**
 * @interface Extension
 * @description
 * The contract for the Extension service.
 *
 * Specification: src/vs/workbench/services/extensions/common/extensionDescriptionRegistry.ts
 */
export interface ExtensionService {
    readonly GetExtension: <T>(ExtensionId: string) => Effect.Effect<IExtension<T> | undefined, never>;
    readonly GetAllExtensions: () => Effect.Effect<readonly IExtension[], never>;
    readonly GetExtensionPath: (ExtensionId: string) => Effect.Effect<string | undefined, never>;
    readonly OnDidChange: VSCode.Event<void>;
    readonly ResolveDependencies: (ExtensionId: string) => Effect.Effect<DependencyResolutionResult, never>;
    readonly MarkActivated: (ExtensionId: string, Exports: unknown) => Effect.Effect<void, Error>;
    readonly MarkDeactivated: (ExtensionId: string) => Effect.Effect<void, Error>;
    readonly GetActivationMetrics: (ExtensionId: string) => Effect.Effect<ActivationMetrics | undefined, never>;
}
/**
 * Activation metrics for performance monitoring
 */
export interface ActivationMetrics {
    /** Timestamp when activation started */
    readonly StartTime: number;
    /** Timestamp when activation completed */
    readonly EndTime: number;
    /** Total activation duration in milliseconds */
    readonly Duration: number;
    /** Activation reason */
    readonly Reason: string;
    /** Whether activation completed successfully */
    readonly Success: boolean;
    /** Error message if activation failed */
    readonly Error?: string;
}
declare const ExtensionService_base: Effect.Service.Class<ExtensionService, "Service/Extension", {
    readonly effect: Effect.Effect<ExtensionService, unknown, unknown>;
}>;
/**
 * @class ExtensionService
 * @description
 * The Effect-TS service for the Extension discovery service. Manages extension metadata registry,
 * discovers extensions from configuration and Mountain, and provides the public-facing
 * `vscode.Extension` API objects.
 *
 * Architecture Pattern: src/vs/workbench/services/extensions/common/extensionDescriptionRegistry.ts
 * Implementation: Effect-TS service with Ref-based extension registry
 *
 * Features Implemented:
 * - Extension discovery from configuration
 * - Dependency resolution with circular dependency detection
 * - Activation/deactivation lifecycle management
 * - Activation metrics tracking
 * - Extension state persistence (Mountain integration pending)
 *
 * TODOs:
 * - MEDIUM: Integrate with extension marketplace for discovery
 * - LOW: Implement extension search by capabilities/features
 * - MEDIUM: Integrate Mountain gRPC for extension discovery (currently stubbed)
 */
export declare class ExtensionService extends ExtensionService_base {
}
export {};
//# sourceMappingURL=Extension.d.ts.map