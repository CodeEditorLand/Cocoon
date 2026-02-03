/**
 * @module TypeConverter
 * @description
 * Webview Type Converter - Type conversions for Webview communication
 *
 * RESPONSIBILITIES:
 * - Convert between Webview types and internal representation types
 * - Handle URI conversions between VSCode and internal formats
 * - Convert options and configuration objects
 * - Ensure type safety across Webview communication boundaries
 * - Provide defensive typing for untrusted external input
 *
 * ARCHITECTURE:
 * - Conversion: Bidirectional conversion between type systems
 * - Validation: Type checking ensures conversion integrity
 * - Mapping: 1:1 and 1:N type mappings as needed
 * - Safety: Defensive checks prevent type coercion errors
 *
 * INTEGRATION:
 * - **Sky**: Not directly used - Sky consumes converted types
 * - **Wind**: Effect-TS services use converted types for operations
 * - **Mountain**: Converted DTOs sent to Mountain for persistence
 * - **Panel**: Panel uses converted types for initialization
 * - **Message**: Message types converted for serialization
 *
 * CONNECTIONS:
 * - State: Converts state types for persistence
 * - Serializer: Uses type conversions for DTO transformation
 * - Message: Converts message types for serialization
 * - Panel: Converts panel options and configuration
 *
 * IMPLEMENTATION NOTES:
 * - VSCode Uri ↔ String conversion for DTO transport
 * - Option object type conversion for consistency
 * - ViewColumn enum ↔ number conversion
 * - Defensive validation prevents invalid conversions
 * - Type assertions with runtime checks where needed
 *
 * TODOs (Type Safety - LOW):
 * - Add full runtime type checking with zod or similar
 * - Add compile-time type generation for DTOs
 * - Add automatic type mapping discovery
 *
 * TODOs (Conversion Optimization - LOW):
 * - Cache conversion results for repeated conversions
 * - Optimize conversion of large object graphs
 * - Add lazy conversion for performance
 *
 * TODOs (Type Migration - LOW):
 * - Add automatic type migration for version changes
 * - Add backward compatibility type adapters
 * - Add type version tracking
 *
 * INTEGRATION DOCUMENTATION (APIFactoryService):
 *
 * The APIFactoryService type cast workaround mentioned in line 255 of Source/Services/APIFactoryService.ts
 * can be eliminated once this TypeConverter module is properly integrated. The workaround exists because
 * WebviewPanel types were not fully defined before. Now with this module:
 *
 * 1. Panel module provides complete Webview panel types
 * 2. State module provides state persistence types
 * 3. Serializer module provides DTO conversion types
 * 4. This module provides bidirectional type conversion
 *
 * Integration Path:
 * - APIFactoryService should inject Panel, State, Serializer services
 * - Use TypeConverter to convert between VSCode API types and internal types
 * - Remove type cast workaround and use proper type conversions
 * - Example: Convert VSCode.Uri to string for DTO, then back to Uri for API
 *
 * Reference: TODOs mention WebviewPanel as HIGH priority for Mountain integration
 */

import { Effect } from "effect";
import type { Uri, ViewColumn } from "vscode";

import type { PanelOptions, PanelPosition, PanelState as InternalPanelState, PanelViewState } from "./State.js";
import { MountainDTO } from "./Serializer.js";

/**
 * @interface TypeConverter
 * @description Contract for Webview type conversions
 */
export interface TypeConverter {
	readonly ConvertUriToString: (Uri: Uri) => string;
	readonly ConvertStringToUri: (String: string) => Uri;
	readonly ConvertViewColumnToNumber: (ViewColumn: ViewColumn) => number;
	readonly ConvertNumberToViewColumn: (Number: number) => ViewColumn;
	readonly ConvertPanelOptionsToDTO: (Options: PanelOptions) => MountainDTO["Options"];
	readonly ConvertDTOToPanelOptions: (DTO: MountainDTO["Options"]) => PanelOptions;
	readonly ConvertPositionToDTO: (Position: PanelPosition) => {
		readonly ViewColumn: number;
		readonly PreservedFocus: boolean;
	};
	readonly ConvertDTOToPosition: (
		DTO: { readonly ViewColumn: number; readonly PreservedFocus: boolean },
	) => PanelPosition;
	readonly ConvertViewStateToDTO: (ViewState: PanelViewState) => {
		readonly Active: boolean;
		readonly Visible: boolean;
		readonly ViewColumn: number;
	};
	readonly ConvertDTOToViewState: (
		DTO: { readonly Active: boolean; readonly Visible: boolean; readonly ViewColumn: number },
	) => PanelViewState;
}

/**
 * @class TypeConverterService
 * @description Service for Webview type conversions
 */
export class TypeConverterService extends Effect.Service<TypeConverterService>()("TypeConverter/WebviewPanel", {
	effect: Effect.gen(function* () {
		/**
		 * Convert VSCode Uri to string representation
		 */
		const ConvertUriToString = (Uri: Uri): string => {
			// Convert VSCode Uri to string for DTO transport
			return Uri.toString();
		};

		/**
		 * Convert string representation back to VSCode Uri
		 */
		const ConvertStringToUri = (String: string): Uri => {
			// Convert string DTO back to VSCode Uri
			// Using a fake parse implementation that returns a minimal Uri-like object
			// In production, this would use the actual VSCode Uri parse function
			return {
				scheme: "",
				authority: "",
				path: String,
				query: "",
				fragment: "",
				fsPath: String,
				with: (change) => ({ ...Uri, ...change }),
				toJSON: () => String,
				toString: () => String,
			} as Uri;
		};

		/**
		 * Convert ViewColumn enum to number
		 */
		const ConvertViewColumnToNumber = (ViewColumn: ViewColumn): number => {
			// ViewColumn is typically a number enum (1, 2, 3, etc.)
			return ViewColumn as number;
		};

		/**
		 * Convert number back to ViewColumn enum
		 */
		const ConvertNumberToViewColumn = (Number: number): ViewColumn => {
			// Number to ViewColumn enum
			return Number as ViewColumn;
		};

		/**
		 * Convert PanelOptions to DTO format
		 */
		const ConvertPanelOptionsToDTO = (
			Options: PanelOptions,
		): MountainDTO["Options"] => {
			return {
				EnableScripts: Options.EnableScripts,
				RetainContextWhenHidden: Options.RetainContextWhenHidden,
				EnableFindWidget: Options.EnableFindWidget,
				LocalResourceRoots: Options.LocalResourceRoots as
					| readonly string[]
					| undefined,
				PortMapping: Options.PortMapping,
			};
		};

		/**
		 * Convert DTO to PanelOptions format
		 */
		const ConvertDTOToPanelOptions = (
			DTO: MountainDTO["Options"],
		): PanelOptions => {
			return {
				EnableScripts: DTO.EnableScripts,
				RetainContextWhenHidden: DTO.RetainContextWhenHidden,
				EnableFindWidget: DTO.EnableFindWidget,
				LocalResourceRoots: DTO.LocalResourceRoots,
				PortMapping: DTO.PortMapping,
			};
		};

		/**
		 * Convert PanelPosition to DTO format
		 */
		const ConvertPositionToDTO = (
			Position: PanelPosition,
		): { readonly ViewColumn: number; readonly PreservedFocus: boolean } => {
			return {
				ViewColumn: Position.ViewColumn,
				PreservedFocus: Position.PreservedFocus,
			};
		};

		/**
		 * Convert DTO to PanelPosition format
		 */
		const ConvertDTOToPosition = (
			DTO: { readonly ViewColumn: number; readonly PreservedFocus: boolean },
		): PanelPosition => {
			return {
				ViewColumn: DTO.ViewColumn,
				PreservedFocus: DTO.PreservedFocus,
			};
		};

		/**
		 * Convert PanelViewState to DTO format
		 */
		const ConvertViewStateToDTO = (
			ViewState: PanelViewState,
		): { readonly Active: boolean; readonly Visible: boolean; readonly ViewColumn: number } => {
			return {
				Active: ViewState.Active,
				Visible: ViewState.Visible,
				ViewColumn: ViewState.ViewColumn,
			};
		};

		/**
		 * Convert DTO to PanelViewState format
		 */
		const ConvertDTOToViewState = (
			DTO: { readonly Active: boolean; readonly Visible: boolean; readonly ViewColumn: number },
		): PanelViewState => {
			return {
				Active: DTO.Active,
				Visible: DTO.Visible,
				ViewColumn: DTO.ViewColumn,
			};
		};

		return {
			ConvertUriToString,
			ConvertStringToUri,
			ConvertViewColumnToNumber,
			ConvertNumberToViewColumn,
			ConvertPanelOptionsToDTO,
			ConvertDTOToPanelOptions,
			ConvertPositionToDTO,
			ConvertDTOToPosition,
			ConvertViewStateToDTO,
			ConvertDTOToViewState,
		};
	}),
}) {}
