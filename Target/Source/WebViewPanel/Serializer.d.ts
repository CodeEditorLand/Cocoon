/**
 * @module Serializer
 * @description
 * WebView State Serializer - Convert WebView state to/from Mountain DTOs
 *
 * RESPONSIBILITIES:
 * - Serialize WebView panel state to Mountain DTO format
 * - Deserialize Mountain DTOs back to WebView panel state
 * - Handle version compatibility and migration
 * - Ensure type safety in serialization/deserialization
 * - Validate DTO integrity during deserialization
 *
 * ARCHITECTURE:
 * - Serialization: PanelState → Mountain DTO for backend storage
 * - Deserialization: Mountain DTO → PanelState for restoration
 * - Versioning: DTO version field enables schema evolution
 * - Validation: Type checking ensures data integrity
 *
 * INTEGRATION:
 * - **Sky**: Not directly used - Sky consumes restored state
 * - **Wind**: Not directly used - Wind provides DTO services
 * - **Mountain**: Serialized DTOs sent to Mountain for persistence
 * - **State**: State module uses Serializer for persistence
 * - **Panel**: Panel state serialized for Mountain storage
 *
 * CONNECTIONS:
 * - State: Uses Serializer for state persistence and restoration
 * - TypeConverter: May use TypeConverter for URI conversions
 * - IPC: Serialized DTOs sent via IPC to Mountain
 *
 * IMPLEMENTATION NOTES:
 * - DTO format optimized for Mountain storage backend
 * - Version field enables forward/backward migration
 * - Defensive validation prevents corruption
 * - Type guarantees in TypeScript ensure safety
 * - URI string representation for DTO transport
 *
 * TODOs (DTO Versioning - LOW):
 * - Add automatic version migration
 * - Add backward compatibility handlers
 * - Add schema validation for each version
 *
 * TODOs (DTO Compression - LOW):
 * - Add DTO compression for large payloads
 * - Add selective field serialization
 * - Add binary encoding for efficiency
 *
 * TODOs (DTO Security - LOW):
 * - Add DTO encryption for sensitive data
 * - Add DTO signing for integrity verification
 * - Add tamper detection
 *
 * Reference: TODOs mention WebViewPanel as HIGH priority for Mountain integration
 */
import { Effect } from "effect";
import type { PanelState } from "./State.js";
/**
 * @interface MountainDTO
 * @description DTO format for WebView state in Mountain backend
 */
export interface MountainDTO {
    readonly Version: number;
    readonly Handle: string;
    readonly ExtensionId: string;
    readonly ViewType: string;
    readonly Title: string;
    readonly ViewColumn: number;
    readonly PreservedFocus: boolean;
    readonly IsActive: boolean;
    readonly IsVisible: boolean;
    readonly Options: {
        readonly EnableScripts?: boolean;
        readonly RetainContextWhenHidden?: boolean;
        readonly EnableFindWidget?: boolean;
        readonly LocalResourceRoots?: readonly string[];
        readonly PortMapping?: readonly unknown[];
    };
    readonly IconPath?: string;
    readonly Content?: {
        readonly Html?: string;
        readonly Uris?: readonly string[];
    };
    readonly Metadata?: {
        readonly CreatedAt: number;
        readonly LastRestoredAt?: number;
    };
}
/**
 * @interface Serializer
 * @description Contract for WebView state serialization
 */
export interface Serializer {
    readonly SerializeToDTO: (State: PanelState) => Effect.Effect<MountainDTO, Error>;
    readonly DeserializeFromDTO: (DTO: unknown) => Effect.Effect<PanelState, Error>;
    readonly ValidateDTO: (DTO: unknown) => Effect.Effect<MountainDTO, Error>;
}
declare const SerializerService_base: Effect.Service.Class<SerializerService, "Serializer/WebViewPanel", {
    readonly effect: Effect.Effect<{
        SerializeToDTO: (State: PanelState) => Effect.Effect<MountainDTO, Error>;
        DeserializeFromDTO: (DTO: unknown) => Effect.Effect<PanelState, Error>;
        ValidateDTO: (DTO: unknown) => Effect.Effect<MountainDTO, Error>;
    }, never, never>;
}>;
/**
 * @class SerializerService
 * @description Service for serializing WebView state to/from Mountain DTOs
 */
export declare class SerializerService extends SerializerService_base {
}
export {};
//# sourceMappingURL=Serializer.d.ts.map