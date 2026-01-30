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
 * New implementation includes:
 * - Mountain gRPC integration for extension discovery
 * - Enhanced extension metadata validation
 * - Comprehensive TODOs for dependency resolution
 * - Marketplace integration hooks
 *
 * Dependencies:
 * - Service/Configuration: For extension configuration access
 * - Service/Logger: For operation logging
 * - Optional: IMountainClientService for remote extension discovery
 *
 * TODOs:
 * - HIGH: Implement extension dependency resolution
 * - MEDIUM: Implement marketplace integration for extension discovery
 * - LOW: Implement extension search by capabilities/features
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
 * TODO: Align with VSCode's IExtensionDescription interface
 *
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
 * TODOs:
 * - DEPENDENCY: Resolve and validate extension dependencies (HIGH)
 * - MARKETPLACE: Integrate with extension marketplace for discovery (MEDIUM)
 * - SEARCH: Implement extension search by capabilities/features (LOW)
 * - TELEMETRY: Track extension usage patterns (LOW)
 */
export declare class ExtensionService extends ExtensionService_base {
}
export {};
//# sourceMappingURL=Extension.d.ts.map