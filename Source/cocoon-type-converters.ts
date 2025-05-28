/*---------------------------------------------------------------------------------------------
 * Cocoon API Type Converters (cocoon-type-converters.ts)
 * --------------------------------------------------------------------------------------------
 * This module serves as the central hub for all type conversion logic required to bridge
 * the gap between VS Code's public API types (e.g., `vscode.CompletionItem`, `vscode.Hover`)
 * and their corresponding Data Transfer Object (DTO) representations. These DTOs are
 * utilized for RPC/IPC (Remote Procedure Call / Inter-Process Communication) with the
 * Mountain host process (the main application backend).
 *
 * Design Philosophy:
 * - Mirror VS Code's `vs/workbench/api/common/extHostTypeConverters.ts`: This module aims
 *   to replicate the purpose, structure, and much of the logic found in VS Code's own
 *   internal type conversion utilities. This promotes compatibility and leverages
 *   established patterns for handling complex API types.
 * - Bidirectional Conversion: For each complex API type that needs to be transmitted
 *   over RPC, this module should ideally provide two conversion functions:
 *   - `toApi(dtoValue, ...contextArgs)`: Converts a DTO received from the MainThread
 *     (Mountain) into an instance of the corresponding VS Code public API object.
 *   - `fromApi(apiValue, ...contextArgs)`: Converts an instance of a VS Code public
 *     API object (often returned by an extension's provider) into its DTO representation,
 *     suitable for sending to the MainThread.
 * - Contextual Information: Converters may require contextual information, such as:
 *   - `IURITransformerService`: For transforming URIs between the Extension Host and
 *     MainThread representations, especially if they have different authorities or schemes.
 *   - `CommandsConverter`: A specialized utility for converting `vscode.Command` objects
 *     to/from `ICommandDto`, often involving registration of internal commands or
 *     marshalling of command arguments.
 *   - `DisposableStore`: For managing any disposable resources created during the
 *     conversion process (e.g., temporary command registrations by `CommandsConverter`).
 * - Comprehensive Coverage: The goal is to provide converters for all complex types
 *   that are part of the APIs shimmed by Cocoon. This is crucial for ensuring the
 *   correct behavior and full functionality of those APIs.
 *
 * Critical Implementation Status:
 * - TODO (Ongoing - CRITICAL): This file is currently in a foundational state and
 *   requires significant expansion. Comprehensive converters need to be implemented for
 *   a wide range of API types, particularly those used by:
 *   - Language Features API: `CompletionItem`, `CompletionList`, `Hover`, `SignatureHelp`,
 *     `CodeAction`, `WorkspaceEdit`, `DocumentSymbol`, `Location`, `DefinitionLink`, etc.
 *   - Debug API: `DebugConfiguration`, `Breakpoint` variants, `DebugSessionOptions`,
 *     `DebugAdapterDescriptor`.
 *   - Task API: `Task`, `TaskDefinition`, `ShellExecution`, `ProcessExecution`,
 *     `CustomExecution`, `TaskGroup`, `TaskScope`.
 *   - Notebook API: `NotebookData`, `NotebookCellData`, `NotebookCellOutput`,
 *     `NotebookCellOutputItem`, and related types.
 *   - Language Model API: `LanguageModelChatMessage`, `ChatResponsePart`, etc.
 *   - And numerous other APIs involving complex data structures (e.g., `TreeViewItem`,
 *     `WebviewPanelOptions`, various UI elements).
 *
 * Key Responsibilities of Each Converter:
 * - Null/Undefined Handling: Gracefully handle `undefined` and `null` input values,
 *   typically by returning `undefined` or `null` respectively.
 * - Array Conversion: Provide utility functions (or ensure individual converters are
 *   mapped over arrays) to handle arrays of objects.
 * - Nested Types: Correctly marshal and revive nested complex types. For example, a
 *   `Location` object contains a `Range` and a `Uri`, both of which need their own
 *   conversion.
 * - URI Transformation: Integrate with `IURITransformerService` (if available and
 *   configured) to transform URIs when converting to/from DTOs. This is important
 *   if the Extension Host and MainThread have different perspectives on URI schemes
 *   or authorities (e.g., in remote development scenarios, though less common for Cocoon's
 *   typical local sidecar model).
 * - Command Conversion: Utilize a `CommandsConverter` for any `vscode.Command` objects
 *   embedded within other API types (e.g., `CompletionItem.command`, `CodeLens.command`).
 *   This converter handles the complexities of command representation across RPC.
 * - Fidelity: Strive for high fidelity with VS Code's internal conversion logic to
 *   ensure compatibility and avoid subtle bugs.
 * - Testing: Rigorous testing of all converters is essential.
 * - Centralization: This module should replace all temporary or ad-hoc converters
 *   currently scattered within individual shim implementations.
 *--------------------------------------------------------------------------------------------*/

// --- VS Code Public API Namespace Import ---
// Used for type annotations and instantiating API objects.
import type { IMarkdownString as VSCodeInternalIMarkdownString } from "vs/base/common/htmlContent"; // Internal DTO for Markdown strings.

// --- VS Code Base/Platform Lifecycle Imports ---
import {
	DisposableStore, // For managing disposable resources, particularly from CommandsConverter.
	// type IDisposable, // Interface for disposable objects.
} from "vs/base/common/lifecycle";
import { MarshalledId } from "vs/base/common/marshalling"; // For checking `$mid` property in DTOs for revival hints.

// --- VS Code Base/Platform URI and Content Imports ---
import {
	URI as VSCodeInternalURI, // VS Code's internal URI implementation.
	type UriComponents as VSCodeInternalUriComponents, // DTO for URI components.
} from "vs/base/common/uri";
import type { ISingleEditOperation as VSCodeInternalISingleEditOperation } from "vs/editor/common/core/editOperation"; // Internal DTO for a single text edit.

// --- VS Code Editor Core Type Imports ---
// These are often used in language feature DTOs.
import type {
	IPosition as VSCodeInternalIPosition, // Internal DTO for position (1-based).
	IRange as VSCodeInternalIRange, // Internal DTO for range (1-based).
	ISelection as VSCodeInternalISelection, // Internal DTO for selection (1-based).
} from "vs/editor/common/core/selection";
// --- VS Code Protocol DTO Imports ---
// These are DTOs defined for RPC communication between Extension Host and MainThread.
import {
	type ICommandDto as RpcCommandDto, // DTO for `vscode.Command`.
	type IWorkspaceFileEditDto as RpcFileEditDto, // DTO for a file operation (create, delete, rename) within a WorkspaceEdit.
	type ILocationDto as RpcLocationDto, // DTO for `vscode.Location`.
	type ILocationLinkDto as RpcLocationLinkDto, // DTO for `vscode.LocationLink` / `vscode.DefinitionLink`.
	type IWorkspaceTextEditDto as RpcTextEditDto, // DTO for a text edit within a WorkspaceEdit.
	type IWorkspaceEditDto as RpcWorkspaceEditDto, // DTO for `vscode.WorkspaceEdit`.
	// TODO: Add other DTOs from `vs/workbench/api/common/extHost.protocol.ts` as they are needed by converters.
	// e.g., ISuggestDataDto, ISuggestResultDto, IHoverDto, ISignatureHelpDto, etc.
} from "vs/workbench/api/common/extHost.protocol";
// --- VS Code Service Interface Imports ---
// These services might be needed by some converters.
import type { IURITransformerService } from "vs/workbench/api/common/extHostUriTransformerService"; // For URI transformation.
import type * as vscode from "vscode";

import { BaseCocoonShim } from "../_baseShim"; // For _convertApiArgToInternal in WorkspaceEditConverter stub

// --- Placeholder for CommandsConverter ---
// A real `CommandsConverter` is a complex component responsible for marshalling `vscode.Command`
// objects. This involves handling command identifiers, arguments (which may themselves be complex
// types or contain special markers like `$ident`), and potentially managing the lifecycle of
// temporary command registrations if commands are created on the fly.
// TODO: Implement a proper `CommandsConverter` and inject/use it where needed.
export interface CommandsConverter {
	// Converts an RpcCommandDto from the MainThread into a vscode.Command object.
	// fromInternal(commandDto: RpcCommandDto): vscode.Command | undefined;

	// Converts a vscode.Command object into an RpcCommandDto for sending to the MainThread.
	// `disposables` is a DisposableStore to which any temporary resources (like internal command registrations)
	// created during this conversion should be added.
	// toInternal(apiCommand: vscode.Command | undefined, disposables: DisposableStore): RpcCommandDto | undefined;

	// --- Temporary simplified signature for placeholder ---
	fromInternal: (commandDto: any) => vscode.Command | undefined;
	toInternal: (
		apiCommand: any,
		disposables: DisposableStore,
	) => RpcCommandDto | undefined;
}

// Temporary placeholder implementation of CommandsConverter.
const tempCommandsConverterPlaceholder: CommandsConverter = {
	fromInternal: (commandDto) => {
		// Basic conversion, assuming DTO has id, title, arguments, tooltip.
		// A real implementation would use a CommandsService to look up or register commands.
		if (!commandDto) return undefined;
		return {
			title: commandDto.title,
			command: commandDto.id, // `id` in DTO maps to `command` string in API.
			arguments: commandDto.arguments, // Arguments might need deep revival.
			tooltip: commandDto.tooltip,
		};
	},
	toInternal: (apiCommand, _disposables) => {
		// `_disposables` unused in this placeholder.
		// Basic conversion. A real implementation handles argument marshalling and $ident.
		if (!apiCommand) return undefined;
		return {
			id: apiCommand.command, // `command` string in API maps to `id` in DTO.
			title: apiCommand.title,
			tooltip: apiCommand.tooltip,
			arguments: apiCommand.arguments, // Arguments might need deep marshalling.
		};
	},
};
// --- End Placeholder for CommandsConverter ---

// --- Placeholder for URI Transformer Service ---
// In a real setup, an instance of `IURITransformerService` would typically be injected
// into this module or into individual shims that then pass it to these converters.
// For these converters:
// - URIs in DTOs coming from the MainThread (via `RPCProtocol`) are often already revived
//   if they were simple `UriComponents`. However, if a DTO contains a `UriComponents` field
//   that needs explicit transformation (e.g., due to remote authorities), the transformer is used.
// - `vscode.Uri` objects from the API side need to be converted to `UriComponents` (often via `toJSON()`)
//   for DTOs, and then potentially transformed by `transformOutgoing` if needed.
let globalUriTransformerService: IURITransformerService | null = null;

/**
 * Sets the global URI transformer service instance to be used by these converters.
 * This is a temporary mechanism for providing the transformer. Ideally, it would be
 * passed contextually or via DI to the converters.
 * @param transformer - The `IURITransformerService` instance, or `null`.
 */
export function setUriTransformer(
	transformer: IURITransformerService | null,
): void {
	globalUriTransformerService = transformer;
}
// --- End Placeholder for URI Transformer Service ---

// === Namespace for Position Conversion ===
export namespace PositionConverter {
	/**
	 * Converts a position DTO (`VSCodeInternalIPosition`, 1-based) to a `vscode.Position` (0-based).
	 * @param positionDto - The position DTO from the MainThread (1-based line and column).
	 * @returns A `vscode.Position` instance.
	 */
	export function toApi(
		positionDto: VSCodeInternalIPosition,
	): vscode.Position {
		// VS Code's public API `vscode.Position` uses 0-based lines and characters.
		// The internal DTO `VSCodeInternalIPosition` (from `vs/editor/common/core/selection`)
		// uses 1-based `lineNumber` and `column`.
		return new vscode.Position(
			positionDto.lineNumber - 1,
			positionDto.column - 1,
		);
	}

	/**
	 * Converts a `vscode.Position` (0-based) to a position DTO (`VSCodeInternalIPosition`, 1-based).
	 * @param apiPosition - The `vscode.Position` instance.
	 * @returns A `VSCodeInternalIPosition` DTO.
	 */
	export function fromApi(
		apiPosition: vscode.Position,
	): VSCodeInternalIPosition {
		// Convert 0-based API `line` and `character` to 1-based DTO `lineNumber` and `column`.
		return {
			lineNumber: apiPosition.line + 1,
			column: apiPosition.character + 1,
		};
	}
}

// === Namespace for Range Conversion ===
export namespace RangeConverter {
	/**
	 * Converts a range DTO (`VSCodeInternalIRange`, 1-based) to a `vscode.Range` (0-based).
	 * @param rangeDto - The range DTO from the MainThread (1-based line and column for start/end).
	 *                   `VSCodeInternalIRange` from `vs/editor/common/core/range.js` is 1-based.
	 * @returns A `vscode.Range` instance.
	 */
	export function toApi(rangeDto: VSCodeInternalIRange): vscode.Range {
		// Convert 1-based DTO start/end line/column to 0-based API `Position` objects.
		return new vscode.Range(
			rangeDto.startLineNumber - 1,
			rangeDto.startColumn - 1,
			rangeDto.endLineNumber - 1,
			rangeDto.endColumn - 1,
		);
	}

	/**
	 * Converts a `vscode.Range` (0-based) to a range DTO (`VSCodeInternalIRange`, 1-based).
	 * @param apiRange - The `vscode.Range` instance.
	 * @returns A `VSCodeInternalIRange` DTO.
	 */
	export function fromApi(apiRange: vscode.Range): VSCodeInternalIRange {
		// Convert 0-based API start/end `Position` line/character to 1-based DTO line/column.
		return {
			startLineNumber: apiRange.start.line + 1,
			startColumn: apiRange.start.character + 1,
			endLineNumber: apiRange.end.line + 1,
			endColumn: apiRange.end.character + 1,
		};
	}
}

// === Namespace for Selection Conversion ===
export namespace SelectionConverter {
	/**
	 * Converts a selection DTO (`VSCodeInternalISelection`, 1-based) to a `vscode.Selection` (0-based).
	 * @param selectionDto - The selection DTO from the MainThread (1-based lines/columns for anchor and active).
	 * @returns A `vscode.Selection` instance.
	 */
	export function toApi(
		selectionDto: VSCodeInternalISelection,
	): vscode.Selection {
		// `VSCodeInternalISelection` uses 1-based:
		// - `selectionStartLineNumber`, `selectionStartColumn` for the anchor (selection start).
		// - `positionLineNumber`, `positionColumn` for the active (cursor position).
		// `vscode.Selection` constructor takes (anchorLine, anchorChar, activeLine, activeChar), all 0-based.
		return new vscode.Selection(
			selectionDto.selectionStartLineNumber - 1, // anchorLine (0-based)
			selectionDto.selectionStartColumn - 1, // anchorChar (0-based)
			selectionDto.positionLineNumber - 1, // activeLine (0-based)
			selectionDto.positionColumn - 1, // activeChar (0-based)
		);
	}

	/**
	 * Converts a `vscode.Selection` (0-based) to a selection DTO (`VSCodeInternalISelection`, 1-based).
	 * @param apiSelection - The `vscode.Selection` instance.
	 * @returns A `VSCodeInternalISelection` DTO.
	 */
	export function fromApi(
		apiSelection: vscode.Selection,
	): VSCodeInternalISelection {
		// `vscode.Selection` has `anchor` and `active` `Position` objects (0-based).
		// Convert to 1-based DTO fields.
		return {
			selectionStartLineNumber: apiSelection.anchor.line + 1,
			selectionStartColumn: apiSelection.anchor.character + 1,
			positionLineNumber: apiSelection.active.line + 1,
			positionColumn: apiSelection.active.character + 1,
			// Note: `VSCodeInternalISelection` also includes `startLineNumber`, `startColumn`,
			// `endLineNumber`, `endColumn`. These represent the "visual" start/end of the selection,
			// ordered by document position, whereas anchor/active define its direction.
			// These are usually derived by the editor and not typically part of the core DTO
			// that an extension host would send *to* the main thread if it's just reporting anchor/active.
			// If needed, they can be calculated from `apiSelection.start` and `apiSelection.end`.
		};
	}
}

// === Namespace for Location Conversion ===
export namespace LocationConverter {
	/**
	 * Converts a location DTO (`RpcLocationDto`) to a `vscode.Location`.
	 * Handles URI revival and transformation, and range conversion.
	 * @param locationDto - The location DTO from the MainThread.
	 * @returns A `vscode.Location` instance.
	 */
	export function toApi(locationDto: RpcLocationDto): vscode.Location {
		// Revive/transform the URI from the DTO.
		// If a global URI transformer is set, use it for incoming URIs.
		// Otherwise, fall back to standard URI revival from components.
		const revivedUri = globalUriTransformerService
			? (globalUriTransformerService.transformIncoming(
					locationDto.uri,
				) as vscode.Uri) // Cast needed as transformIncoming returns general UriComponents.
			: (VSCodeInternalURI.revive(locationDto.uri) as vscode.Uri); // Standard revival.

		// Convert the range DTO to an API Range object.
		const apiRange = RangeConverter.toApi(locationDto.range);

		return new vscode.Location(revivedUri, apiRange);
	}

	/**
	 * Converts a `vscode.Location` to a location DTO (`RpcLocationDto`).
	 * Handles URI marshalling (toJSON) and transformation, and range conversion.
	 * @param apiLocation - The `vscode.Location` instance.
	 * @returns An `RpcLocationDto`.
	 */
	export function fromApi(apiLocation: vscode.Location): RpcLocationDto {
		// Marshal the API URI to UriComponents (typically via `toJSON()`).
		// If a global URI transformer is set, use it for outgoing URIs.
		const marshalledUri = globalUriTransformerService
			? globalUriTransformerService.transformOutgoing(
					apiLocation.uri.toJSON(),
				)
			: apiLocation.uri.toJSON(); // Standard marshalling.

		// Convert the API Range object to a range DTO.
		const rangeDto = RangeConverter.fromApi(apiLocation.range);

		return {
			uri: marshalledUri,
			range: rangeDto,
		};
	}

	/**
	 * Converts an array of `vscode.Location` objects to an array of `RpcLocationDto`.
	 * @param apiLocationArray - The array of `vscode.Location` instances.
	 * @returns An array of `RpcLocationDto`.
	 */
	export function fromApiArray(
		apiLocationArray: vscode.Location[],
	): RpcLocationDto[] {
		return apiLocationArray.map((locationApiObject) =>
			fromApi(locationApiObject),
		);
	}
}

// === Namespace for DefinitionLink / LocationLink Conversion ===
// `vscode.DefinitionLink` is used for features like "Go to Definition".
// The DTO is `RpcLocationLinkDto`.
export namespace DefinitionLinkConverter {
	/**
	 * Converts a location link DTO (`RpcLocationLinkDto`) to a `vscode.DefinitionLink`.
	 * @param locationLinkDto - The DTO from the MainThread.
	 * @returns A `vscode.DefinitionLink` instance.
	 */
	export function toApi(
		locationLinkDto: RpcLocationLinkDto,
	): vscode.DefinitionLink {
		// Revive/transform the target URI.
		const targetUri = globalUriTransformerService
			? (globalUriTransformerService.transformIncoming(
					locationLinkDto.uri,
				) as vscode.Uri)
			: (VSCodeInternalURI.revive(locationLinkDto.uri) as vscode.Uri);

		// Convert ranges.
		const targetRange = RangeConverter.toApi(locationLinkDto.range);
		const targetSelectionRange = locationLinkDto.targetSelectionRange
			? RangeConverter.toApi(locationLinkDto.targetSelectionRange)
			: targetRange; // Fallback to targetRange if targetSelectionRange is not provided.
		const originSelectionRange = locationLinkDto.originSelectionRange
			? RangeConverter.toApi(locationLinkDto.originSelectionRange)
			: undefined;

		return {
			targetUri: targetUri,
			targetRange: targetRange,
			targetSelectionRange: targetSelectionRange,
			originSelectionRange: originSelectionRange,
		};
	}

	/**
	 * Converts a `vscode.DefinitionLink` or `vscode.Location` to an `RpcLocationLinkDto`.
	 * Providers for definition-like features can return either type.
	 * @param apiDefinitionLinkOrLocation - The API object from the provider.
	 * @returns An `RpcLocationLinkDto`.
	 */
	export function fromApi(
		apiDefinitionLinkOrLocation: vscode.DefinitionLink | vscode.Location,
	): RpcLocationLinkDto {
		let targetUriValue: vscode.Uri;
		let targetRangeValue: vscode.Range;
		let targetSelectionRangeValue: vscode.Range | undefined;
		let originSelectionRangeValue: vscode.Range | undefined;

		// Check if it's a vscode.DefinitionLink (has `targetUri` property).
		if ("targetUri" in apiDefinitionLinkOrLocation) {
			targetUriValue = apiDefinitionLinkOrLocation.targetUri;
			targetRangeValue = apiDefinitionLinkOrLocation.targetRange;
			targetSelectionRangeValue =
				apiDefinitionLinkOrLocation.targetSelectionRange;
			originSelectionRangeValue =
				apiDefinitionLinkOrLocation.originSelectionRange;
		} else {
			// It's a vscode.Location.
			targetUriValue = apiDefinitionLinkOrLocation.uri;
			targetRangeValue = apiDefinitionLinkOrLocation.range;
			// `vscode.Location` doesn't have `targetSelectionRange` or `originSelectionRange`.
			// `targetSelectionRange` for DTO will default to `targetRangeValue`.
		}

		// Marshal/transform URI and convert ranges.
		const marshalledUri = globalUriTransformerService
			? globalUriTransformerService.transformOutgoing(
					targetUriValue.toJSON(),
				)
			: targetUriValue.toJSON();

		return {
			uri: marshalledUri,
			range: RangeConverter.fromApi(targetRangeValue),
			targetSelectionRange: targetSelectionRangeValue
				? RangeConverter.fromApi(targetSelectionRangeValue)
				: RangeConverter.fromApi(targetRangeValue), // DTO spec might require targetSelectionRange
			originSelectionRange: originSelectionRangeValue
				? RangeConverter.fromApi(originSelectionRangeValue)
				: undefined,
		};
	}

	/**
	 * Converts an array of `vscode.DefinitionLink` or `vscode.Location` objects to an array of `RpcLocationLinkDto`.
	 * @param apiArray - The array of API objects.
	 * @returns An array of `RpcLocationLinkDto`.
	 */
	export function fromApiArray(
		apiArray: (vscode.DefinitionLink | vscode.Location)[],
	): RpcLocationLinkDto[] {
		return apiArray.map((item) => fromApi(item));
	}
}

// === Namespace for TextEdit Conversion ===
export namespace TextEditConverter {
	/**
	 * Converts a text edit DTO (`VSCodeInternalISingleEditOperation`) to a `vscode.TextEdit`.
	 * `VSCodeInternalISingleEditOperation` often comes from model change events or internal editor operations.
	 * @param singleEditOperationDto - The DTO (range is 1-based, text can be null).
	 * @returns A `vscode.TextEdit` instance.
	 */
	export function toApi(
		singleEditOperationDto: VSCodeInternalISingleEditOperation,
	): vscode.TextEdit {
		// Convert range from 1-based DTO to 0-based API.
		const apiRange = RangeConverter.toApi(singleEditOperationDto.range);
		// DTO `text` can be null (for delete operations), API `newText` should be empty string in that case.
		const newText = singleEditOperationDto.text ?? "";
		return new vscode.TextEdit(apiRange, newText);
	}

	/**
	 * Converts a `vscode.TextEdit` to a text edit DTO (`VSCodeInternalISingleEditOperation`).
	 * @param apiTextEdit - The `vscode.TextEdit` instance.
	 * @returns A `VSCodeInternalISingleEditOperation` DTO.
	 */
	export function fromApi(
		apiTextEdit: vscode.TextEdit,
	): VSCodeInternalISingleEditOperation {
		// Convert range from 0-based API to 1-based DTO.
		const dtoRange = RangeConverter.fromApi(apiTextEdit.range);
		return {
			range: dtoRange,
			text: apiTextEdit.newText,
			// `forceMoveMarkers` is an editor internal concept, not typically set from the API side
			// and thus not included when converting from an API `TextEdit`.
		};
	}

	/**
	 * Converts an array of `vscode.TextEdit` objects to an array of `VSCodeInternalISingleEditOperation`.
	 * @param apiTextEditArray - The array of `vscode.TextEdit` instances.
	 * @returns An array of `VSCodeInternalISingleEditOperation`.
	 */
	export function fromApiArray(
		apiTextEditArray: vscode.TextEdit[],
	): VSCodeInternalISingleEditOperation[] {
		return apiTextEditArray.map((textEditApiObject) =>
			fromApi(textEditApiObject),
		);
	}
}

// === Namespace for SnippetString Conversion ===
export namespace SnippetStringConverter {
	/**
	 * Converts a DTO value (string or object with a `snippet` property) to a `vscode.SnippetString` or plain string.
	 * The DTO structure depends on how snippets are sent from the MainThread.
	 * @param dtoValue - The DTO value, which can be a plain string or an object like `{ snippet: "content" }`.
	 * @returns A `vscode.SnippetString` if the DTO indicates a snippet, otherwise a plain string.
	 */
	export function toApiValue(
		dtoValue: string | { snippet: string },
	): vscode.SnippetString | string {
		// If the DTO is an object with a `snippet` property, treat it as a SnippetString.
		if (
			typeof dtoValue === "object" &&
			dtoValue !== null &&
			typeof (dtoValue as any).snippet === "string"
		) {
			return new vscode.SnippetString((dtoValue as any).snippet);
		}
		// Otherwise, assume it's a plain string.
		return dtoValue as string;
	}

	/**
	 * Converts a `vscode.SnippetString` or plain string to its DTO representation.
	 * VS Code's protocol often sends snippet values with a flag or within a structure
	 * indicating that the string should be inserted as a snippet.
	 * @param apiSnippetOrString - The `vscode.SnippetString` instance or a plain string.
	 * @returns A DTO, typically a string or an object like `{ value: string; insertAsSnippet?: boolean }`.
	 */
	export function fromApi(
		apiSnippetOrString: vscode.SnippetString | string,
	): string | { value: string; insertAsSnippet?: boolean } {
		// If it's an instance of vscode.SnippetString, convert it to a DTO structure.
		if (apiSnippetOrString instanceof vscode.SnippetString) {
			// The common DTO pattern is an object with the snippet's `value` and a flag.
			return { value: apiSnippetOrString.value, insertAsSnippet: true };
		}
		// If it's already a plain string, return it as is.
		return apiSnippetOrString;
	}
}

// === Namespace for MarkdownString Conversion ===
export namespace MarkdownStringConverter {
	/**
	 * Converts a Markdown string DTO (`VSCodeInternalIMarkdownString` or plain string) to a `vscode.MarkdownString`.
	 * @param markdownDto - The DTO from the MainThread.
	 * @returns A `vscode.MarkdownString` instance.
	 */
	export function toApi(
		markdownDto: VSCodeInternalIMarkdownString | string,
	): vscode.MarkdownString {
		// If the DTO is a plain string, create a simple MarkdownString.
		if (typeof markdownDto === "string") {
			return new vscode.MarkdownString(markdownDto);
		}
		// If it's an object (VSCodeInternalIMarkdownString DTO), create a more detailed MarkdownString.
		const apiMarkdownString = new vscode.MarkdownString(
			markdownDto.value,
			markdownDto.supportThemeIcons,
		);
		// Handle `isTrusted` which can be a boolean or MarkdownStringTrustedOptions.
		// The DTO `isTrusted` might be a boolean or an object like `{ enabledCommands: string[] }`.
		apiMarkdownString.isTrusted =
			typeof markdownDto.isTrusted === "boolean"
				? markdownDto.isTrusted
				: typeof markdownDto.isTrusted === "object" &&
					  markdownDto.isTrusted !== null
					? (markdownDto.isTrusted as any).enabledCommands
					: undefined;
		apiMarkdownString.supportHtml = markdownDto.supportHtml;
		// Revive/transform `baseUri` if present.
		apiMarkdownString.baseUri = markdownDto.baseUri
			? globalUriTransformerService
				? (globalUriTransformerService.transformIncoming(
						markdownDto.baseUri,
					) as vscode.Uri)
				: (VSCodeInternalURI.revive(markdownDto.baseUri) as vscode.Uri)
			: undefined;
		// TODO: Revive `markdownDto.uris` if its structure is defined and needed.
		// This would involve mapping over `markdownDto.uris` and reviving each URI component.
		// Example: `apiMarkdownString.uris = markdownDto.uris ? mapObject(markdownDto.uris, reviveUri) : undefined;`
		return apiMarkdownString;
	}

	/**
	 * Converts a `vscode.MarkdownString` or plain string to its DTO representation (`VSCodeInternalIMarkdownString` or string).
	 * @param apiMarkdownOrString - The `vscode.MarkdownString` instance or a plain string.
	 * @returns A DTO suitable for sending to the MainThread.
	 */
	export function fromApi(
		apiMarkdownOrString: vscode.MarkdownString | string,
	): VSCodeInternalIMarkdownString | string {
		// If it's a plain string, return it as is.
		if (typeof apiMarkdownOrString === "string") {
			return apiMarkdownOrString;
		}
		// If it's a vscode.MarkdownString instance, convert to DTO.
		const markdownDto: VSCodeInternalIMarkdownString = {
			value: apiMarkdownOrString.value,
			isTrusted: apiMarkdownOrString.isTrusted, // `isTrusted` in API can be boolean or MarkdownStringTrustedOptions. DTO expects compatible structure.
			supportThemeIcons: apiMarkdownOrString.supportThemeIcons,
			supportHtml: apiMarkdownOrString.supportHtml,
			// Marshal/transform `baseUri` if present.
			baseUri: apiMarkdownOrString.baseUri
				? globalUriTransformerService
					? globalUriTransformerService.transformOutgoing(
							apiMarkdownOrString.baseUri.toJSON(),
						)
					: apiMarkdownOrString.baseUri.toJSON()
				: undefined,
			// TODO: Marshal `apiMarkdownOrString.uris` if its structure is defined and needed.
			// This would involve mapping over `apiMarkdownOrString.uris` and marshalling each vscode.Uri.
			// Example: `markdownDto.uris = apiMarkdownOrString.uris ? mapObject(apiMarkdownOrString.uris, marshalUri) : undefined;`
		};
		return markdownDto;
	}

	/**
	 * Converts an array of `vscode.MarkdownString` or plain strings to their DTO representations.
	 * @param apiArray - The array of API objects or strings.
	 * @returns An array of DTOs.
	 */
	export function fromApiArray(
		apiArray: (vscode.MarkdownString | string)[],
	): (VSCodeInternalIMarkdownString | string)[] {
		return apiArray.map((item) => fromApi(item));
	}
}

// === Namespace for ThemeColor Conversion ===
export namespace ThemeColorConverter {
	/**
	 * Converts a theme color DTO (string or object with `id`) to a `vscode.ThemeColor` or plain string.
	 * @param themeColorDto - The DTO from the MainThread. Can be a color string (e.g., '#FF0000') or an object `{ id: 'editor.foreground' }`.
	 * @returns A `vscode.ThemeColor` instance if DTO is an ID object, otherwise the plain color string.
	 */
	export function toApi(
		themeColorDto: string | { id: string },
	): vscode.ThemeColor | string {
		// If the DTO is a plain string, it represents a direct color value.
		if (typeof themeColorDto === "string") {
			return themeColorDto;
		}
		// If it's an object with an `id`, it represents a themeable color.
		return new vscode.ThemeColor(themeColorDto.id);
	}

	/**
	 * Converts a `vscode.ThemeColor` or plain string to its DTO representation.
	 * @param apiThemeColorOrString - The `vscode.ThemeColor` instance or a plain color string.
	 * @returns A DTO, either a string or an object `{ id: string }`.
	 */
	export function fromApi(
		apiThemeColorOrString: vscode.ThemeColor | string,
	): string | { id: string } {
		// If it's a plain string, return it as is.
		if (typeof apiThemeColorOrString === "string") {
			return apiThemeColorOrString;
		}
		// If it's a vscode.ThemeColor instance, convert to DTO object with ID.
		return { id: apiThemeColorOrString.id };
	}
}

// === Namespace for ThemeIcon Conversion ===
export namespace ThemeIconConverter {
	/**
	 * Converts a theme icon DTO to a `vscode.ThemeIcon`.
	 * @param themeIconDto - The DTO from the MainThread, e.g., `{ id: 'codicon-zap', color?: { id: 'charts.red' } }`.
	 * @returns A `vscode.ThemeIcon` instance.
	 */
	export function toApi(themeIconDto: {
		id: string;
		color?: { id: string };
	}): vscode.ThemeIcon {
		// Convert the optional color DTO to a vscode.ThemeColor if present.
		const apiThemeColor = themeIconDto.color
			? new vscode.ThemeColor(themeIconDto.color.id)
			: undefined;
		return new vscode.ThemeIcon(themeIconDto.id, apiThemeColor);
	}

	/**
	 * Converts a `vscode.ThemeIcon` to its DTO representation.
	 * @param apiThemeIcon - The `vscode.ThemeIcon` instance.
	 * @returns A DTO, e.g., `{ id: 'codicon-zap', color?: { id: 'charts.red' } }`.
	 */
	export function fromApi(apiThemeIcon: vscode.ThemeIcon): {
		id: string;
		color?: { id: string };
	} {
		// Convert the optional vscode.ThemeColor to its DTO if present.
		const themeColorDto = apiThemeIcon.color
			? { id: apiThemeIcon.color.id }
			: undefined;
		return { id: apiThemeIcon.id, color: themeColorDto };
	}
}

// === Namespace for Command Conversion ===
// This uses the placeholder `CommandsConverter`. A real implementation is significantly more complex.
export namespace CommandConverter {
	/**
	 * Converts an `RpcCommandDto` from the MainThread to a `vscode.Command` object.
	 * @param rpcCommandDto - The command DTO.
	 * @param commandsConverterInstance - An instance of `CommandsConverter` (placeholder for now).
	 * @param _disposables - Optional `DisposableStore` (unused by placeholder, but a real converter might use it).
	 * @returns A `vscode.Command` object or `undefined`.
	 */
	export function toApi(
		rpcCommandDto: RpcCommandDto | undefined,
		commandsConverterInstance: CommandsConverter, // Should be the real one when available.
		_disposables?: DisposableStore, // For potential resource management in a real converter.
	): vscode.Command | undefined {
		if (!rpcCommandDto) {
			return undefined;
		}
		// A real CommandsConverter might involve looking up a command by its `$ident` (if used),
		// or creating a delegating command object that calls back to the MainThread.
		// The placeholder `fromInternal` does a basic field mapping.
		// Arguments in DTO might need deep revival (e.g., if they contain URIs or other complex types).
		// `revive` from `vs/base/common/marshalling` should be used if `globalUriTransformerService` (via RPCProtocol) is not already handling it.
		const revivedArguments = rpcCommandDto.arguments
			? revive(rpcCommandDto.arguments)
			: undefined;

		return {
			title: rpcCommandDto.title,
			command: rpcCommandDto.id, // DTO `id` is the command string.
			tooltip: rpcCommandDto.tooltip,
			arguments: revivedArguments,
		};
	}

	/**
	 * Converts a `vscode.Command` object to an `RpcCommandDto` for sending to the MainThread.
	 * @param apiCommand - The `vscode.Command` object.
	 * @param commandsConverterInstance - An instance of `CommandsConverter`.
	 * @param disposables - A `DisposableStore` for managing resources created during conversion.
	 * @returns An `RpcCommandDto` or `undefined`.
	 */
	export function fromApi(
		apiCommand: vscode.Command | undefined,
		commandsConverterInstance: CommandsConverter, // Should be the real one.
		disposables: DisposableStore,
	): RpcCommandDto | undefined {
		if (!apiCommand) {
			return undefined;
		}
		// A real CommandsConverter handles marshalling of arguments (e.g., replacing complex objects
		// with identifiers like `$ident` if they are managed resources) and might register
		// temporary internal commands if the API command doesn't have a pre-existing ID on the MainThread.
		// The placeholder `toInternal` does basic field mapping.
		return commandsConverterInstance.toInternal(apiCommand, disposables);
	}
}

// === Namespace for WorkspaceEdit Conversion ===
// `vscode.WorkspaceEdit` is a very complex type involving multiple kinds of edits
// (text edits, file operations, notebook edits, cell edits) across multiple resources.
export namespace WorkspaceEditConverter {
	/**
	 * Converts an `RpcWorkspaceEditDto` from the MainThread to a `vscode.WorkspaceEdit` object.
	 * @param rpcWorkspaceEditDto - The WorkspaceEdit DTO.
	 * @param commandsConverterInstance - An instance of `CommandsConverter` (used if edits involve commands, though not typical for direct edits).
	 * @returns A `vscode.WorkspaceEdit` instance.
	 */
	export function toApi(
		rpcWorkspaceEditDto: RpcWorkspaceEditDto,
		commandsConverterInstance: CommandsConverter, // Placeholder
	): vscode.WorkspaceEdit {
		const apiWorkspaceEdit = new vscode.WorkspaceEdit();

		if (rpcWorkspaceEditDto.edits) {
			for (const editEntry of rpcWorkspaceEditDto.edits) {
				// Revive/transform the resource URI.
				const resourceUri = globalUriTransformerService
					? (globalUriTransformerService.transformIncoming(
							editEntry.resource,
						) as vscode.Uri)
					: (VSCodeInternalURI.revive(
							editEntry.resource,
						) as vscode.Uri);

				// Check if it's a TextEdit DTO.
				if ((editEntry as RpcTextEditDto).textEdit) {
					const textEditDto = (editEntry as RpcTextEditDto).textEdit;
					// Convert the text edit part.
					const apiRange = RangeConverter.toApi(textEditDto.range);
					const newText = textEditDto.text ?? ""; // DTO text can be null for delete.
					// TODO: Handle `textEditDto.eol` (EndOfLineSequence) if present in DTO and needed by API.
					// The standard `vscode.WorkspaceEdit.replace/insert/delete` doesn't take EOL directly.
					// It's usually inferred or handled by the text model.
					// If metadata is present, it should be of type `vscode.WorkspaceEditEntryMetadata`.
					// The `vscode.WorkspaceEdit` API does not directly expose setting metadata per text edit
					// in the same way `set` method does for file operations.
					// `replace`, `insert`, `delete` are the primary methods for text changes.
					// For now, assuming simple replace.
					apiWorkspaceEdit.replace(
						resourceUri,
						apiRange,
						newText /*, editEntry.metadata - if API supported it here */,
					);
				} else if ((editEntry as RpcFileEditDto).options) {
					// It's a FileOperation DTO.
					const fileEditDto = editEntry as RpcFileEditDto;
					const newUriComponent = fileEditDto.newResource
						? globalUriTransformerService
							? (globalUriTransformerService.transformIncoming(
									fileEditDto.newResource,
								) as vscode.Uri)
							: (VSCodeInternalURI.revive(
									fileEditDto.newResource,
								) as vscode.Uri)
						: undefined;
					const oldUriComponent = fileEditDto.oldResource
						? globalUriTransformerService
							? (globalUriTransformerService.transformIncoming(
									fileEditDto.oldResource,
								) as vscode.Uri)
							: (VSCodeInternalURI.revive(
									fileEditDto.oldResource,
								) as vscode.Uri)
						: undefined;

					// TODO: Convert `fileEditDto.options` (like overwrite, ignoreIfNotExists) to `vscode.WorkspaceFileEditOptions`.
					// TODO: Handle `fileEditDto.contents` (VSBuffer DTO) for `createFile` if the protocol supports sending content.
					// The `vscode.WorkspaceEdit` API for file operations takes `options` and `metadata`.
					const apiFileEditOptions =
						fileEditDto.options as vscode.WorkspaceFileEditOptions; // Direct cast, needs proper conversion.
					const apiFileEditMetadata =
						fileEditDto.metadata as vscode.WorkspaceEditEntryMetadata; // Direct cast.

					if (newUriComponent && !oldUriComponent) {
						// Create file
						apiWorkspaceEdit.createFile(
							newUriComponent,
							apiFileEditOptions,
							apiFileEditMetadata,
						);
					} else if (oldUriComponent && !newUriComponent) {
						// Delete file
						apiWorkspaceEdit.deleteFile(
							oldUriComponent,
							apiFileEditOptions,
							apiFileEditMetadata,
						);
					} else if (oldUriComponent && newUriComponent) {
						// Rename file
						apiWorkspaceEdit.renameFile(
							oldUriComponent,
							newUriComponent,
							apiFileEditOptions,
							apiFileEditMetadata,
						);
					}
				}
				// TODO: Handle CellEdits (`ICellEditDto`) and CellReplaceEdits if `RpcWorkspaceEditDto` supports them.
				// This would involve converting `ICellEditDto` to `vscode.NotebookCellEdit` or similar,
				// and using `apiWorkspaceEdit.set(notebookUri, [vscode.NotebookEdit.replaceCells(...)])` or related methods.
			}
		}

		// TODO: Handle top-level notebook edits (`INotebookEditDto[]`) if they are part of `RpcWorkspaceEditDto`
		// and not nested under resource-specific entries. This depends on the exact DTO structure.
		// Example: `rpcWorkspaceEditDto.notebookEdits?.forEach(...)`

		return apiWorkspaceEdit;
	}

	/**
	 * Converts a `vscode.WorkspaceEdit` object to an `RpcWorkspaceEditDto`.
	 * This is a highly complex conversion due to the varied nature of edits and the internal
	 * structure of `vscode.WorkspaceEdit`. Directly using VS Code's internal conversion logic
	 * (e.g., from `vs/workbench/api/common/extHostBulkEdits.ts`) would be ideal if possible,
	 * but that involves deeper dependencies.
	 *
	 * For now, this is a STUB that relies on a generic marshaller from `BaseCocoonShim`.
	 * This placeholder is INSUFFICIENT for full fidelity.
	 *
	 * @param apiWorkspaceEdit - The `vscode.WorkspaceEdit` instance.
	 * @param versionProvider - Optional provider for version information of resources (like `IVersionInformationProvider`).
	 *                          Needed by VS Code's real converter to include document versions.
	 * @param commandsConverterInstance - Optional `CommandsConverter` (unused by stub).
	 * @param disposables - Optional `DisposableStore` (unused by stub).
	 * @returns An `RpcWorkspaceEditDto`.
	 */
	export function fromApi(
		apiWorkspaceEdit: vscode.WorkspaceEdit,
		versionProvider?: any, // Placeholder for IVersionInformationProvider or similar.
		commandsConverterInstance?: CommandsConverter, // Placeholder.
		disposables?: DisposableStore, // Placeholder.
	): RpcWorkspaceEditDto {
		// CRITICAL STUB: This conversion is extremely complex.
		// A proper implementation needs to iterate through `apiWorkspaceEdit._allEntries()`
		// (if that internal property is accessible, or use public API to get entries)
		// and convert each entry (text edit, file op, notebook edit) to its DTO form.
		// This includes handling resource URIs, ranges, text, options, metadata, and document versions.
		console.warn(
			"[TypeConverter] WorkspaceEdit.fromApi is highly complex and currently STUBBED. " +
				"It's using a generic marshaller from BaseCocoonShim, which is INSUFFICIENT for full fidelity. " +
				"A comprehensive implementation mirroring VS Code's internal logic (e.g., from extHostBulkEdits) is required.",
		);

		// Using BaseCocoonShim's generic _convertApiArgToInternal as a temporary, insufficient placeholder.
		// This will attempt to convert nested URIs, Ranges, etc., based on their `toJSON` or known DTO structures,
		// but it won't correctly handle the specific structure of RpcWorkspaceEditDto, especially for edits.
		// A dummy instance of BaseCocoonShim is created here just to access its protected method,
		// which is not ideal and indicates this utility should be refactored if used this way.
		const dummyShimInstance = new BaseCocoonShim(
			undefined,
			undefined,
			undefined,
		);
		const marshalledEdit =
			dummyShimInstance._convertApiArgToInternal(apiWorkspaceEdit);

		// The result of generic marshalling needs to be cast, but it's unlikely to match RpcWorkspaceEditDto correctly.
		// A proper implementation would build the RpcWorkspaceEditDto field by field.
		return marshalledEdit as RpcWorkspaceEditDto;
	}
}

// === Future Converters (TODO List) ===
// Comprehensive converters are needed for many more types to ensure full API functionality.
// Below is a non-exhaustive list of critical areas:
//
// - Hover (`vscode.Hover` <-> `IHoverDto`):
//   - Involves `MarkdownString` (or array of them) and `Range`.
//
// - CompletionItem / CompletionList (`vscode.CompletionItem`, `vscode.CompletionList` <-> `ISuggestDataDto`, `ISuggestResultDto`):
//   - This is one of the most complex conversions.
//   - `CompletionItem` fields: `label` (string or `CompletionItemLabel`), `kind` (enum), `detail`,
//     `documentation` (`MarkdownString` or string), `sortText`, `filterText`, `insertText` (string or `SnippetString`),
//     `range` (Range or object with inserting/replacing ranges), `commitCharacters`, `command` (`Command`),
//     `additionalTextEdits` (`TextEdit[]`), `tags` (enum array).
//   - `CompletionList`: `items` (`CompletionItem[]`), `isIncomplete`.
//
// - SignatureHelp / SignatureInformation / ParameterInformation:
//   - `SignatureHelp`: `signatures` (`SignatureInformation[]`), `activeSignature`, `activeParameter`.
//   - `SignatureInformation`: `label`, `documentation` (`MarkdownString` or string), `parameters` (`ParameterInformation[]`).
//   - `ParameterInformation`: `label` (string or `[number, number]` for substring), `documentation` (`MarkdownString` or string).
//
// - DocumentSymbol / SymbolInformation (`vscode.DocumentSymbol`, `vscode.SymbolInformation` <-> `IDocumentSymbolDto`):
//   - `DocumentSymbol`: `name`, `detail`, `kind` (enum), `range`, `selectionRange`, `children` (`DocumentSymbol[]`), `tags`.
//   - `SymbolInformation`: `name`, `kind` (enum), `location` (`Location`), `containerName`, `tags`.
//
// - CodeAction (`vscode.CodeAction` <-> `ICodeActionDto`):
//   - Involves: `title`, `kind` (`CodeActionKind`), `diagnostics` (`Diagnostic[]`), `edit` (`WorkspaceEdit`),
//     `command` (`Command`), `isPreferred`, `disabled` ({ reason: string }).
//
// - CodeLens (`vscode.CodeLens` <-> `ICodeLensDto`):
//   - Involves: `range`, `command` (`Command`).
//
// - DocumentLink (`vscode.DocumentLink` <-> `ILinkDto`):
//   - Involves: `range`, `target` (Uri, optional), `tooltip`.
//
// - FormattingOptions (`vscode.FormattingOptions` <-> `IFormattingOptionsDto`):
//   - `tabSize`, `insertSpaces`.
//
// - Task API Types:
//   - `vscode.Task` <-> `ITaskDto`.
//   - `vscode.TaskDefinition` <-> `ITaskDefinitionDto`.
//   - `vscode.ShellExecution` / `vscode.ProcessExecution` / `vscode.CustomExecution` <-> DTOs for execution types.
//   - `vscode.TaskGroup` (enum), `vscode.TaskScope` (enum).
//
// - Debug API Types:
//   - `vscode.DebugConfiguration` <-> `IDebugConfigurationDto`.
//   - `vscode.Breakpoint` (and variants like `SourceBreakpoint`, `FunctionBreakpoint`) <-> DTOs.
//   - `vscode.DebugSessionOptions` <-> DTO.
//   - `vscode.DebugAdapterDescriptor` (and variants like `DebugAdapterExecutable`, `DebugAdapterServer`) <-> DTOs.
//
// - Notebook API Types (Very Complex):
//   - `vscode.NotebookData` <-> `INotebookDataDto`.
//   - `vscode.NotebookCellData` <-> `INotebookCellDataDto`.
//   - `vscode.NotebookCellOutput` / `vscode.NotebookCellOutputItem` <-> DTOs.
//   - And many related types for metadata, execution state, etc.
//
// - Language Model API Types:
//   - `vscode.LanguageModelChatMessage` <-> DTO.
//   - `vscode.LanguageModelChatResponsePart` <-> DTO.
//
// This list highlights the significant effort required to achieve full type conversion fidelity.
// Each of these requires careful implementation mirroring VS Code's internal patterns.

// --- Module Placeholder Warning ---
console.warn(
	"[Cocoon Type Converters] This module is currently a placeholder and lacks comprehensive " +
		"type converters for many VS Code API types. Full implementation is critical for robust " +
		"API support and correct behavior of extensions relying on these types across RPC boundaries.",
);

// Placeholder export to ensure the file is treated as a module by TypeScript.
export const placeholderForModuleSystem = true;
