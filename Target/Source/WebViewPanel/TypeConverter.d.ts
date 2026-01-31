/**
 * @module TypeConverter
 * @description
 * WebView Type Converter - Type conversions for WebView communication
 *
 * RESPONSIBILITIES:
 * - Convert between WebView types and internal representation types
 * - Handle URI conversions between VSCode and internal formats
 * - Convert options and configuration objects
 * - Ensure type safety across WebView communication boundaries
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
 * WebViewPanel types were not fully defined before. Now with this module:
 *
 * 1. Panel module provides complete WebView panel types
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
 * Reference: TODOs mention WebViewPanel as HIGH priority for Mountain integration
 */
import { Effect } from "effect";
import type { Uri, ViewColumn } from "vscode";
import type { PanelOptions, PanelPosition, PanelViewState } from "./State.js";
import { MountainDTO } from "./Serializer.js";
/**
 * @interface TypeConverter
 * @description Contract for WebView type conversions
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
    readonly ConvertDTOToPosition: (DTO: {
        readonly ViewColumn: number;
        readonly PreservedFocus: boolean;
    }) => PanelPosition;
    readonly ConvertViewStateToDTO: (ViewState: PanelViewState) => {
        readonly Active: boolean;
        readonly Visible: boolean;
        readonly ViewColumn: number;
    };
    readonly ConvertDTOToViewState: (DTO: {
        readonly Active: boolean;
        readonly Visible: boolean;
        readonly ViewColumn: number;
    }) => PanelViewState;
}
declare const TypeConverterService_base: Effect.Service.Class<TypeConverterService, "TypeConverter/WebViewPanel", {
    readonly effect: Effect.Effect<{
        ConvertUriToString: (Uri: Uri) => string;
        ConvertStringToUri: (String: string) => Uri;
        ConvertViewColumnToNumber: (ViewColumn: ViewColumn) => number;
        ConvertNumberToViewColumn: (Number: number) => ViewColumn;
        ConvertPanelOptionsToDTO: (Options: PanelOptions) => MountainDTO["Options"];
        ConvertDTOToPanelOptions: (DTO: MountainDTO["Options"]) => PanelOptions;
        ConvertPositionToDTO: (Position: PanelPosition) => {
            readonly ViewColumn: number;
            readonly PreservedFocus: boolean;
        };
        ConvertDTOToPosition: (DTO: {
            readonly ViewColumn: number;
            readonly PreservedFocus: boolean;
        }) => PanelPosition;
        ConvertViewStateToDTO: (ViewState: PanelViewState) => {
            readonly Active: boolean;
            readonly Visible: boolean;
            readonly ViewColumn: number;
        };
        ConvertDTOToViewState: (DTO: {
            readonly Active: boolean;
            readonly Visible: boolean;
            readonly ViewColumn: number;
        }) => PanelViewState;
    }, never, never>;
}>;
/**
 * @class TypeConverterService
 * @description Service for WebView type conversions
 */
export declare class TypeConverterService extends TypeConverterService_base {
}
export {};
//# sourceMappingURL=TypeConverter.d.ts.map