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
 * DEPENDENCY: Type generation - depends on Mountain DTO schema
 * FUTURE: Runtime validation - use zod for type guards
 * FUTURE: Schema migration - implement migrateDTO() for versions
 *
 * TODOs (Performance - LOW):
 * PERFORMANCE: Caching - cache conversions with Map by input hash
 * PERFORMANCE: Large payloads - use streaming serialization
 * PERFORMANCE: Incremental - convert only changed fields
 *
 * TODOs (Error Handling - MEDIUM):
 * FUTURE: Error context - add conversion chain to error messages
 * FUTURE: Retry logic - implement exponential backoff
 * FUTURE: Telemetry - track conversion metrics
 */

import { Effect } from "effect";
import type { Uri } from "vscode";

// URI class for runtime use - the `import type` above is erased at runtime.
const { URI } = await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/uri.js");

// ============================================================================
// DTO Type Definitions (generated from Mountain Rust DTOs)
// ============================================================================

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
 * @interface WebviewStateDTO
 * @description Mountain's WebviewStateDTO serialized from Rust
 * Matches: Element/Mountain/Source/ApplicationState/DTO/WebviewStateDTO.rs
 */
export interface WebviewStateDTO {
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
	readonly EnvironmentVariables:
		| ReadonlyMap<string, string | null>
		| undefined;
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
 * @interface WorkspaceFolderStateDTO
 * @description Mountain's WorkspaceFolderStateDTO serialized from Rust
 */
export interface WorkspaceFolderStateDTO {
	readonly URI: string;
	readonly Name: string;
	readonly Identifier: number;
}

// ============================================================================
// Internal TypeScript Types (Wind)
// ============================================================================

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
 * @interface WebviewState
 * @description Wind's internal WebviewState type
 */
export interface WebviewState {
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
	readonly environmentVariables:
		| ReadonlyMap<string, string | null>
		| undefined;
	readonly isPTY: boolean;
}

// ============================================================================
// Validation Constants (matching Mountain Rust constants)
// ============================================================================

const MIN_ZOOM_LEVEL = -20.0;
const MAX_ZOOM_LEVEL = 20.0;

const MAX_DOCUMENT_LINES = 1_000_000;
const MAX_LINE_LENGTH = 100_000;
const MAX_LANGUAGE_ID_LENGTH = 128;

const MAX_TERMINAL_NAME_LENGTH = 128;
const MAX_SHELL_PATH_LENGTH = 1024;
const MAX_SHELL_ARGUMENTS = 100;
const MAX_ARGUMENT_LENGTH = 4096;

const MAX_WEBVIEW_TITLE_LENGTH = 256;
const MAX_VIEW_TYPE_LENGTH = 128;
const MAX_HANDLE_LENGTH = 128;
const MAX_SIDECAR_IDENTIFIER_LENGTH = 128;
const MAX_EXTENSION_IDENTIFIER_LENGTH = 128;

// ============================================================================
// DTO Validation Functions
// ============================================================================

/**
 * Validate WindowStateDTO fields
 * Implements validation from WindowStateDTO::New and SetZoomLevel
 */
const ValidateWindowStateDTO = (
	dto: WindowStateDTO,
): Effect.Effect<WindowStateDTO, Error> =>
	Effect.gen(function* () {
		if (typeof dto.IsFocused !== "boolean") {
			return yield* Effect.fail(
				new Error("WindowStateDTO.IsFocused must be a boolean"),
			);
		}

		if (typeof dto.IsFullScreen !== "boolean") {
			return yield* Effect.fail(
				new Error("WindowStateDTO.IsFullScreen must be a boolean"),
			);
		}

		if (typeof dto.ZoomLevel !== "number") {
			return yield* Effect.fail(
				new Error("WindowStateDTO.ZoomLevel must be a number"),
			);
		}

		if (dto.ZoomLevel < MIN_ZOOM_LEVEL || dto.ZoomLevel > MAX_ZOOM_LEVEL) {
			return yield* Effect.fail(
				new Error(
					`WindowStateDTO.ZoomLevel must be between ${MIN_ZOOM_LEVEL} and ${MAX_ZOOM_LEVEL}, got ${dto.ZoomLevel}`,
				),
			);
		}

		return dto;
	});

/**
 * Validate DocumentStateDTO fields
 * Implements validation from DocumentStateDTO::Create
 */
const ValidateDocumentStateDTO = (
	dto: DocumentStateDTO,
): Effect.Effect<DocumentStateDTO, Error> =>
	Effect.gen(function* () {
		// Validate URI
		if (typeof dto.URI !== "string" || dto.URI.trim().length === 0) {
			return yield* Effect.fail(
				new Error("DocumentStateDTO.URI cannot be empty"),
			);
		}

		try {
			// Attempt to parse as URI to validate format
			new URL(dto.URI);
		} catch {
			return yield* Effect.fail(
				new Error(
					`DocumentStateDTO.URI has invalid format: ${dto.URI}`,
				),
			);
		}

		// Validate LanguageIdentifier
		if (typeof dto.LanguageIdentifier !== "string") {
			return yield* Effect.fail(
				new Error(
					"DocumentStateDTO.LanguageIdentifier must be a string",
				),
			);
		}

		if (dto.LanguageIdentifier.length > MAX_LANGUAGE_ID_LENGTH) {
			return yield* Effect.fail(
				new Error(
					`DocumentStateDTO.LanguageIdentifier exceeds maximum length of ${MAX_LANGUAGE_ID_LENGTH} bytes`,
				),
			);
		}

		// Validate Version
		if (typeof dto.Version !== "number" || dto.Version < 1) {
			return yield* Effect.fail(
				new Error("DocumentStateDTO.Version must be a positive number"),
			);
		}

		// Validate Lines array
		if (!Array.isArray(dto.Lines)) {
			return yield* Effect.fail(
				new Error("DocumentStateDTO.Lines must be an array"),
			);
		}

		if (dto.Lines.length > MAX_DOCUMENT_LINES) {
			return yield* Effect.fail(
				new Error(
					`DocumentStateDTO.Lines exceeds maximum line count of ${MAX_DOCUMENT_LINES}`,
				),
			);
		}

		for (let i = 0; i < dto.Lines.length; i++) {
			const line = dto.Lines[i]!;
			if (typeof line !== "string") {
				return yield* Effect.fail(
					new Error(`DocumentStateDTO.Lines[${i}] must be a string`),
				);
			}

			if (line.length > MAX_LINE_LENGTH) {
				return yield* Effect.fail(
					new Error(
						`DocumentStateDTO.Lines[${i}] exceeds maximum length of ${MAX_LINE_LENGTH} bytes`,
					),
				);
			}
		}

		// Validate EOL
		if (dto.EOL !== "\n" && dto.EOL !== "\r\n") {
			return yield* Effect.fail(
				new Error(
					"DocumentStateDTO.EOL must be either '\\n' or '\\r\\n'",
				),
			);
		}

		// Validate IsDirty
		if (typeof dto.IsDirty !== "boolean") {
			return yield* Effect.fail(
				new Error("DocumentStateDTO.IsDirty must be a boolean"),
			);
		}

		// Validate Encoding
		if (typeof dto.Encoding !== "string" || dto.Encoding.length === 0) {
			return yield* Effect.fail(
				new Error("DocumentStateDTO.Encoding cannot be empty"),
			);
		}

		return dto;
	});

/**
 * Validate WebviewStateDTO fields
 * Implements validation from WebviewStateDTO::New
 */
const ValidateWebviewStateDTO = (
	dto: WebviewStateDTO,
): Effect.Effect<WebviewStateDTO, Error> =>
	Effect.gen(function* () {
		// Validate Handle
		if (typeof dto.Handle !== "string" || dto.Handle.trim().length === 0) {
			return yield* Effect.fail(
				new Error("WebviewStateDTO.Handle cannot be empty"),
			);
		}

		if (dto.Handle.length > MAX_HANDLE_LENGTH) {
			return yield* Effect.fail(
				new Error(
					`WebviewStateDTO.Handle exceeds maximum length of ${MAX_HANDLE_LENGTH} bytes`,
				),
			);
		}

		// Validate ViewType
		if (typeof dto.ViewType !== "string") {
			return yield* Effect.fail(
				new Error("WebviewStateDTO.ViewType must be a string"),
			);
		}

		if (dto.ViewType.length > MAX_VIEW_TYPE_LENGTH) {
			return yield* Effect.fail(
				new Error(
					`WebviewStateDTO.ViewType exceeds maximum length of ${MAX_VIEW_TYPE_LENGTH} bytes`,
				),
			);
		}

		// Validate Title
		if (typeof dto.Title !== "string") {
			return yield* Effect.fail(
				new Error("WebviewStateDTO.Title must be a string"),
			);
		}

		if (dto.Title.length > MAX_WEBVIEW_TITLE_LENGTH) {
			return yield* Effect.fail(
				new Error(
					`WebviewStateDTO.Title exceeds maximum length of ${MAX_WEBVIEW_TITLE_LENGTH} bytes`,
				),
			);
		}

		// Validate ContentOptions
		if (!dto.ContentOptions || typeof dto.ContentOptions !== "object") {
			return yield* Effect.fail(
				new Error("WebviewStateDTO.ContentOptions must be an object"),
			);
		}

		if (typeof dto.ContentOptions.EnableScripts !== "boolean") {
			return yield* Effect.fail(
				new Error(
					"WebviewStateDTO.ContentOptions.EnableScripts must be a boolean",
				),
			);
		}

		if (!Array.isArray(dto.ContentOptions.LocalResourceRoots)) {
			return yield* Effect.fail(
				new Error(
					"WebviewStateDTO.ContentOptions.LocalResourceRoots must be an array",
				),
			);
		}

		// Validate PanelOptions
		if (dto.PanelOptions !== null && typeof dto.PanelOptions !== "object") {
			return yield* Effect.fail(
				new Error(
					"WebviewStateDTO.PanelOptions must be an object or null",
				),
			);
		}

		// Validate SideCarIdentifier
		if (typeof dto.SideCarIdentifier !== "string") {
			return yield* Effect.fail(
				new Error("WebviewStateDTO.SideCarIdentifier must be a string"),
			);
		}

		if (dto.SideCarIdentifier.length > MAX_SIDECAR_IDENTIFIER_LENGTH) {
			return yield* Effect.fail(
				new Error(
					`WebviewStateDTO.SideCarIdentifier exceeds maximum length of ${MAX_SIDECAR_IDENTIFIER_LENGTH} bytes`,
				),
			);
		}

		// Validate ExtensionIdentifier
		if (typeof dto.ExtensionIdentifier !== "string") {
			return yield* Effect.fail(
				new Error(
					"WebviewStateDTO.ExtensionIdentifier must be a string",
				),
			);
		}

		if (dto.ExtensionIdentifier.length > MAX_EXTENSION_IDENTIFIER_LENGTH) {
			return yield* Effect.fail(
				new Error(
					`WebviewStateDTO.ExtensionIdentifier exceeds maximum length of ${MAX_EXTENSION_IDENTIFIER_LENGTH} bytes`,
				),
			);
		}

		// Validate IsActive
		if (typeof dto.IsActive !== "boolean") {
			return yield* Effect.fail(
				new Error("WebviewStateDTO.IsActive must be a boolean"),
			);
		}

		// Validate IsVisible
		if (typeof dto.IsVisible !== "boolean") {
			return yield* Effect.fail(
				new Error("WebviewStateDTO.IsVisible must be a boolean"),
			);
		}

		return dto;
	});

/**
 * Validate TerminalStateDTO fields
 * Implements validation from TerminalStateDTO::Create
 */
const ValidateTerminalStateDTO = (
	dto: TerminalStateDTO,
): Effect.Effect<TerminalStateDTO, Error> =>
	Effect.gen(function* () {
		// Validate Identifier
		if (typeof dto.Identifier !== "number" || dto.Identifier <= 0) {
			return yield* Effect.fail(
				new Error(
					"TerminalStateDTO.Identifier must be a positive number",
				),
			);
		}

		// Validate Name
		if (typeof dto.Name !== "string") {
			return yield* Effect.fail(
				new Error("TerminalStateDTO.Name must be a string"),
			);
		}

		if (dto.Name.length > MAX_TERMINAL_NAME_LENGTH) {
			return yield* Effect.fail(
				new Error(
					`TerminalStateDTO.Name exceeds maximum length of ${MAX_TERMINAL_NAME_LENGTH} bytes`,
				),
			);
		}

		// Validate ShellPath
		if (typeof dto.ShellPath !== "string") {
			return yield* Effect.fail(
				new Error("TerminalStateDTO.ShellPath must be a string"),
			);
		}

		if (dto.ShellPath.length > MAX_SHELL_PATH_LENGTH) {
			return yield* Effect.fail(
				new Error(
					`TerminalStateDTO.ShellPath exceeds maximum length of ${MAX_SHELL_PATH_LENGTH} bytes`,
				),
			);
		}

		// Validate ShellArguments
		if (!Array.isArray(dto.ShellArguments)) {
			return yield* Effect.fail(
				new Error("TerminalStateDTO.ShellArguments must be an array"),
			);
		}

		if (dto.ShellArguments.length > MAX_SHELL_ARGUMENTS) {
			return yield* Effect.fail(
				new Error(
					`TerminalStateDTO.ShellArguments exceeds maximum count of ${MAX_SHELL_ARGUMENTS}`,
				),
			);
		}

		for (let i = 0; i < dto.ShellArguments.length; i++) {
			const arg = dto.ShellArguments[i]!;
			if (typeof arg !== "string") {
				return yield* Effect.fail(
					new Error(
						`TerminalStateDTO.ShellArguments[${i}] must be a string`,
					),
				);
			}

			if (arg.length > MAX_ARGUMENT_LENGTH) {
				return yield* Effect.fail(
					new Error(
						`TerminalStateDTO.ShellArguments[${i}] exceeds maximum length of ${MAX_ARGUMENT_LENGTH} bytes`,
					),
				);
			}
		}

		// Validate IsPTY
		if (typeof dto.IsPTY !== "boolean") {
			return yield* Effect.fail(
				new Error("TerminalStateDTO.IsPTY must be a boolean"),
			);
		}

		return dto;
	});

// ============================================================================
// Conversion Functions: Wind → Mountain DTO (ConvertToDTO)
// ============================================================================

/**
 * Convert Wind's WindowState to Mountain's WindowStateDTO
 */
export const WindowStateConvertToDTO = (
	state: WindowState,
): Effect.Effect<WindowStateDTO, Error> =>
	Effect.gen(function* () {
		const dto: WindowStateDTO = {
			IsFocused: state.isFocused,
			IsFullScreen: state.isFullScreen,
			ZoomLevel: state.zoomLevel,
		};

		return yield* ValidateWindowStateDTO(dto);
	});

/**
 * Convert Wind's DocumentState to Mountain's DocumentStateDTO
 */
export const DocumentStateConvertToDTO = (
	state: DocumentState,
): Effect.Effect<DocumentStateDTO, Error> =>
	Effect.gen(function* () {
		const dto: DocumentStateDTO = {
			URI: state.uri.toString(),
			LanguageIdentifier: state.languageIdentifier,
			Version: state.version,
			Lines: state.lines,
			EOL: state.eol,
			IsDirty: state.isDirty,
			Encoding: state.encoding,
			VersionIdentifier: state.versionIdentifier,
		};

		return yield* ValidateDocumentStateDTO(dto);
	});

/**
 * Convert Wind's WebviewState to Mountain's WebviewStateDTO
 */
export const WebviewStateConvertToDTO = (
	state: WebviewState,
): Effect.Effect<WebviewStateDTO, Error> =>
	Effect.gen(function* () {
		const dto: WebviewStateDTO = {
			Handle: state.handle,
			ViewType: state.viewType,
			Title: state.title,
			ContentOptions: {
				EnableScripts: state.contentOptions.enableScripts,
				LocalResourceRoots: state.contentOptions.localResourceRoots,
			},
			PanelOptions: state.panelOptions,
			SideCarIdentifier: state.sideCarIdentifier,
			ExtensionIdentifier: state.extensionIdentifier,
			IsActive: state.isActive,
			IsVisible: state.isVisible,
		};

		return yield* ValidateWebviewStateDTO(dto);
	});

/**
 * Convert Wind's TerminalState to Mountain's TerminalStateDTO
 */
export const TerminalStateConvertToDTO = (
	state: TerminalState,
): Effect.Effect<TerminalStateDTO, Error> =>
	Effect.gen(function* () {
		const dto: TerminalStateDTO = {
			Identifier: state.identifier,
			Name: state.name,
			OSProcessIdentifier: state.osProcessIdentifier,
			ShellPath: state.shellPath,
			ShellArguments: state.shellArguments,
			CurrentWorkingDirectory: state.currentWorkingDirectory,
			EnvironmentVariables: state.environmentVariables,
			IsPTY: state.isPTY,
		};

		return yield* ValidateTerminalStateDTO(dto);
	});

// ============================================================================
// Conversion Functions: Mountain DTO → Wind (ConvertFromDTO)
// ============================================================================

/**
 * Convert Mountain's WindowStateDTO to Wind's WindowState
 */
export const WindowStateConvertFromDTO = (
	dto: WindowStateDTO,
): Effect.Effect<WindowState, Error> =>
	Effect.gen(function* () {
		const validated = yield* ValidateWindowStateDTO(dto);

		return {
			isFocused: validated.IsFocused,
			isFullScreen: validated.IsFullScreen,
			zoomLevel: validated.ZoomLevel,
		};
	});

/**
 * Convert Mountain's DocumentStateDTO to Wind's DocumentState
 */
export const DocumentStateConvertFromDTO = (
	dto: DocumentStateDTO,
): Effect.Effect<DocumentState, Error> =>
	Effect.gen(function* () {
		const validated = yield* ValidateDocumentStateDTO(dto);

		// Parse URI using the real VS Code URI class from @codeeditorland/output.
		const uri = URI.parse(validated.URI) as unknown as Uri;

		// Validate EOL is either \n or \r\n
		const eol = validated.EOL === "\r\n" ? "\r\n" : "\n";

		return {
			uri,
			languageIdentifier: validated.LanguageIdentifier,
			version: validated.Version,
			lines: validated.Lines,
			eol,
			isDirty: validated.IsDirty,
			encoding: validated.Encoding,
			versionIdentifier: validated.VersionIdentifier,
		};
	});

/**
 * Convert Mountain's WebviewStateDTO to Wind's WebviewState
 */
export const WebviewStateConvertFromDTO = (
	dto: WebviewStateDTO,
): Effect.Effect<WebviewState, Error> =>
	Effect.gen(function* () {
		const validated = yield* ValidateWebviewStateDTO(dto);

		return {
			handle: validated.Handle,
			viewType: validated.ViewType,
			title: validated.Title,
			contentOptions: {
				enableScripts: validated.ContentOptions.EnableScripts,
				localResourceRoots: validated.ContentOptions.LocalResourceRoots,
			},
			panelOptions: validated.PanelOptions,
			sideCarIdentifier: validated.SideCarIdentifier,
			extensionIdentifier: validated.ExtensionIdentifier,
			isActive: validated.IsActive,
			isVisible: validated.IsVisible,
		};
	});

/**
 * Convert Mountain's TerminalStateDTO to Wind's TerminalState
 */
export const TerminalStateConvertFromDTO = (
	dto: TerminalStateDTO,
): Effect.Effect<TerminalState, Error> =>
	Effect.gen(function* () {
		const validated = yield* ValidateTerminalStateDTO(dto);

		return {
			identifier: validated.Identifier,
			name: validated.Name,
			osProcessIdentifier: validated.OSProcessIdentifier,
			shellPath: validated.ShellPath,
			shellArguments: validated.ShellArguments,
			currentWorkingDirectory: validated.CurrentWorkingDirectory,
			environmentVariables: validated.EnvironmentVariables,
			isPTY: validated.IsPTY,
		};
	});

// ============================================================================
// Generic DTO Validation Function
// ============================================================================

/**
 * Generic DTO validation function
 * Routes to specific validator based on DTO type
 */
export const ValidateDTO = <T extends Record<string, unknown>>(
	dto: T & { readonly __typename?: string },
): Effect.Effect<T, Error> =>
	Effect.gen(function* () {
		// Infer DTO type from __typename field or structure
		const typename =
			dto.__typename || (dto as { readonly URI?: string }).URI
				? "DocumentStateDTO"
				: (dto as { readonly Handle?: string }).Handle
					? "WebviewStateDTO"
					: (dto as { readonly IsFocused?: boolean }).IsFocused !==
						  undefined
						? "WindowStateDTO"
						: (dto as { readonly Identifier?: number })
									.Identifier !== undefined
							? "TerminalStateDTO"
							: "Unknown";

		switch (typename) {
			case "WindowStateDTO":
				return yield* ValidateWindowStateDTO(
					dto as unknown as WindowStateDTO,
				) as unknown as Effect.Effect<T, Error>;
			case "DocumentStateDTO":
				return yield* ValidateDocumentStateDTO(
					dto as unknown as DocumentStateDTO,
				) as unknown as Effect.Effect<T, Error>;
			case "WebviewStateDTO":
				return yield* ValidateWebviewStateDTO(
					dto as unknown as WebviewStateDTO,
				) as unknown as Effect.Effect<T, Error>;
			case "TerminalStateDTO":
				return yield* ValidateTerminalStateDTO(
					dto as unknown as TerminalStateDTO,
				) as unknown as Effect.Effect<T, Error>;
			default:
				return yield* Effect.fail(
					new Error(
						`Unknown DTO type: ${typename}. Cannot validate.`,
					),
				);
		}
	});
