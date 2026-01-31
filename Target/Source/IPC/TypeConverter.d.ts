/**
 * @module TypeConverter
 * @description
 * Mountain IPC Type Converter - Type conversions for Mountain-Wind communication
 *
 * RESPONSIBILITIES:
 * - Convert between Wind TypeScript types and Mountain Rust DTOs
 * - Handle bidirectional serialization/deserialization of application state
 * - Provide comprehensive DTO validation for security and data integrity
 * - Ensure type safety across Wind-Mountain IPC boundaries
 * - Handle complex nested data structures for state transfer
 * - Defensive validation prevents corrupted data propagation
 *
 * ARCHITECTURE:
 * - Bidirectional Conversion: Wind ↔ Mountain DTO transformations
 * - Validation: Multi-level validation ensures data integrity
 * - Serialization: JSON-based serialization with PascalCase field names
 * - Mapping: Type mappings between TypeScript and Rust type systems
 * - Safety: Defensive checks prevent runtime errors and data corruption
 *
 * INTEGRATION:
 * - **Mountain**: Core backend storing persistent application state
 * - **Wind**: Frontend TypeScript code sending/receiving IPC messages
 * - **Sky**: Monitoring system receives converted metrics and status
 * - **WindServiceHandlers**: Primary consumer of conversion functions
 * - **WindServiceAdapters**: Uses converted types for API compatibility
 *
 * CONNECTIONS:
 * - TauriIPCServer: Validates incoming/outgoing IPC payloads using converters
 * - WindServiceHandlers: Converts TypeScript requests to Mountain internal calls
 * - WindServiceAdapters: Transforms responses from Mountain to Wind-compatible types
 * - ConfigurationBridge: Uses converters for configuration synchronization
 * - WindAdvancedSync: Converts document changes for real-time sync
 *
 * MOUNTAIN-WIND COMMUNICATION FLOW:
 * ```
 * Wind (TypeScript)                          Mountain (Rust)
 *      |                                           |
 *      |  1. Send IPC Request (TS types)           |
 *      |------------------------------------------>|
 *      |                                           |
 *      |                                   2. Deserialize DTO
 *      |                                   Validate DTO fields
 *      |                                   ConvertFromDTO (Rust types)
 *      |                                   Process request
 *      |                                           |
 *      |                                           | 3. ConvertToDTO (PascalCase)
 *      |                                           | Serialize DTO (JSON)
 *      |  4. Receive Response (DTO)                |
 *      |<------------------------------------------|
 *      |                                           |
 *      |  ConvertFromDTO (TS types)                |
 *      | Validate response                         |
 *      | Update UI state                           |
 * ```
 *
 * NAMING CONVENTION:
 * This module strictly follows the Land ecosystem's PascalCase naming convention.
 * Mountain DTOs use PascalCase for both struct names and field names (serde rename_all="PascalCase").
 * See: https://github.com/CodeEditorLand/Mountain/blob/main/Documentation/GitHub/Naming%20Conventions.md
 *
 * IMPLEMENTATION NOTES:
 * - All DTO fields use PascalCase to match Rust serde serialization
 * - Validation implements Mountain's business rules and constraints
 * - Effect-based error handling for functional programming patterns
 * - Defensive validation prevents DoS via large payloads or malformed data
 * - URI validation uses VSCode Uri interface for compatibility
 * - Version tracking ensures change synchronization integrity
 * - Runtime handles (channels, tasks) excluded from serialization
 *
 * VALIDATION STRATEGY:
 * - Structural: Required fields present and correct types
 * - Business Logic: Values within acceptable ranges (zoom levels, string lengths)
 * - Referential: URIs, identifiers are well-formed
 * - Security: String length limits prevent DoS attacks
 * - Integrity: Version numbers consistent with data state
 *
 * TODOs (Type Safety - MEDIUM):
 * - Generate TypeScript types from Rust DTO schema for compile-time safety
 * - Add zod or io-ts runtime type validation for comprehensive type checking
 * - Implement automatic schema migration for version changes
 *
 * TODOs (Performance - LOW):
 * - Cache conversion results for frequently converted objects
 * - Optimize serialization for large document payloads
 * - Add incremental conversion for partial state updates
 *
 * TODOs (Error Handling - MEDIUM):
 * - Add detailed error context for debugging conversion failures
 * - Implement retry logic for transient serialization errors
 * - Add telemetry for monitoring conversion performance and failures
 */
import { Effect } from "effect";
import type { Uri } from "vscode";
/**
 * @interface WindowStateDTO
 * @description Mountain's WindowStateDTO serialized from Rust
 * Matches: Element/Mountain/Source/ApplicationState/DTO/WindowStateDTO.rs
 */
export interface WindowStateDTO {
    readonly IsFocused: boolean;
    readonly IsFullScreen: boolean;
    readonly ZoomLevel: number;
}
/**
 * @interface DocumentStateDTO
 * @description Mountain's DocumentStateDTO serialized from Rust
 * Matches: Element/Mountain/Source/ApplicationState/DTO/DocumentStateDTO.rs
 */
export interface DocumentStateDTO {
    readonly URI: string;
    readonly LanguageIdentifier: string;
    readonly Version: number;
    readonly Lines: readonly string[];
    readonly EOL: string;
    readonly IsDirty: boolean;
    readonly Encoding: string;
    readonly VersionIdentifier: number;
}
/**
 * @interface WebViewStateDTO
 * @description Mountain's WebViewStateDTO serialized from Rust
 * Matches: Element/Mountain/Source/ApplicationState/DTO/WebViewStateDTO.rs
 */
export interface WebViewStateDTO {
    readonly Handle: string;
    readonly ViewType: string;
    readonly Title: string;
    readonly ContentOptions: {
        readonly EnableScripts: boolean;
        readonly LocalResourceRoots: readonly string[];
    };
    readonly PanelOptions: Record<string, unknown>;
    readonly SideCarIdentifier: string;
    readonly ExtensionIdentifier: string;
    readonly IsActive: boolean;
    readonly IsVisible: boolean;
}
/**
 * @interface TerminalStateDTO
 * @description Mountain's TerminalStateDTO serialized from Rust
 * Matches: Element/Mountain/Source/ApplicationState/DTO/TerminalStateDTO.rs
 * Runtime handles (PTYInputTransmitter, ReaderTaskHandle, ProcessWaitHandle) are excluded
 */
export interface TerminalStateDTO {
    readonly Identifier: number;
    readonly Name: string;
    readonly OSProcessIdentifier: number | undefined;
    readonly ShellPath: string;
    readonly ShellArguments: readonly string[];
    readonly CurrentWorkingDirectory: string | undefined;
    readonly EnvironmentVariables: ReadonlyMap<string, string | null> | undefined;
    readonly IsPTY: boolean;
}
/**
 * @interface OutputChannelStateDTO
 * @description Mountain's OutputChannelStateDTO serialized from Rust
 */
export interface OutputChannelStateDTO {
    readonly Name: string;
    readonly URI: string;
    readonly IsVisible: boolean;
    readonly PreserveFocus: boolean;
}
/**
 * @interface TreeViewStateDTO
 * @description Mountain's TreeViewStateDTO serialized from Rust
 */
export interface TreeViewStateDTO {
    readonly ViewId: string;
    readonly Title: string;
    readonly Description: string | undefined;
    readonly Selection: readonly string[];
    readonly ExpandState: Record<string, boolean>;
}
/**
 * @interface WorkSpaceFolderStateDTO
 * @description Mountain's WorkSpaceFolderStateDTO serialized from Rust
 */
export interface WorkSpaceFolderStateDTO {
    readonly URI: string;
    readonly Name: string;
    readonly Identifier: number;
}
/**
 * @interface WindowState
 * @description Wind's internal WindowState type
 */
export interface WindowState {
    readonly isFocused: boolean;
    readonly isFullScreen: boolean;
    readonly zoomLevel: number;
}
/**
 * @interface DocumentState
 * @description Wind's internal DocumentState type
 */
export interface DocumentState {
    readonly uri: Uri;
    readonly languageIdentifier: string;
    readonly version: number;
    readonly lines: readonly string[];
    readonly eol: "\n" | "\r\n";
    readonly isDirty: boolean;
    readonly encoding: string;
    readonly versionIdentifier: number;
}
/**
 * @interface WebViewState
 * @description Wind's internal WebViewState type
 */
export interface WebViewState {
    readonly handle: string;
    readonly viewType: string;
    readonly title: string;
    readonly contentOptions: {
        readonly enableScripts: boolean;
        readonly localResourceRoots: readonly string[];
    };
    readonly panelOptions: Record<string, unknown>;
    readonly sideCarIdentifier: string;
    readonly extensionIdentifier: string;
    readonly isActive: boolean;
    readonly isVisible: boolean;
}
/**
 * @interface TerminalState
 * @description Wind's internal TerminalState type
 */
export interface TerminalState {
    readonly identifier: number;
    readonly name: string;
    readonly osProcessIdentifier: number | undefined;
    readonly shellPath: string;
    readonly shellArguments: readonly string[];
    readonly currentWorkingDirectory: string | undefined;
    readonly environmentVariables: ReadonlyMap<string, string | null> | undefined;
    readonly isPTY: boolean;
}
/**
 * Convert Wind's WindowState to Mountain's WindowStateDTO
 */
export declare const WindowStateConvertToDTO: (state: WindowState) => Effect.Effect<WindowStateDTO, Error>;
/**
 * Convert Wind's DocumentState to Mountain's DocumentStateDTO
 */
export declare const DocumentStateConvertToDTO: (state: DocumentState) => Effect.Effect<DocumentStateDTO, Error>;
/**
 * Convert Wind's WebViewState to Mountain's WebViewStateDTO
 */
export declare const WebViewStateConvertToDTO: (state: WebViewState) => Effect.Effect<WebViewStateDTO, Error>;
/**
 * Convert Wind's TerminalState to Mountain's TerminalStateDTO
 */
export declare const TerminalStateConvertToDTO: (state: TerminalState) => Effect.Effect<TerminalStateDTO, Error>;
/**
 * Convert Mountain's WindowStateDTO to Wind's WindowState
 */
export declare const WindowStateConvertFromDTO: (dto: WindowStateDTO) => Effect.Effect<WindowState, Error>;
/**
 * Convert Mountain's DocumentStateDTO to Wind's DocumentState
 */
export declare const DocumentStateConvertFromDTO: (dto: DocumentStateDTO) => Effect.Effect<DocumentState, Error>;
/**
 * Convert Mountain's WebViewStateDTO to Wind's WebViewState
 */
export declare const WebViewStateConvertFromDTO: (dto: WebViewStateDTO) => Effect.Effect<WebViewState, Error>;
/**
 * Convert Mountain's TerminalStateDTO to Wind's TerminalState
 */
export declare const TerminalStateConvertFromDTO: (dto: TerminalStateDTO) => Effect.Effect<TerminalState, Error>;
/**
 * Generic DTO validation function
 * Routes to specific validator based on DTO type
 */
export declare const ValidateDTO: <T extends Record<string, unknown>>(dto: T & {
    readonly __typename?: string;
}) => Effect.Effect<T, Error>;
//# sourceMappingURL=TypeConverter.d.ts.map