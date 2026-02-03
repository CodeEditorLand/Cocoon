/**
 * @module State
 * @description
 * WebView State Management - State persistence and restoration for WebView panels
 *
 * RESPONSIBILITIES:
 * - Manage WebView panel state persistence across sessions
 * - Restore WebView panels from saved state on session restart
 * - Track panel position, content, and display state
 * - Handle state serialization for Mountain backend storage
 * - Coordinate state restoration with Factory and Panel
 *
 * ARCHITECTURE:
 * - Persistence: State storage in Mountain backend via IPC
 * - Restoration: State-driven panel recreation on session load
 * - Versioning: State schema versioning for backward compatibility
 * - Validation: State integrity checks before restoration
 *
 * INTEGRATION:
 * - **Sky**: Astro display layer uses restored state for panel rendering
 * - **Wind**: Effect-TS services provide state storage and retrieval
 * - **Mountain**: WebView state persisted to Mountain backend for session restore
 * - **Factory**: Factory uses state to recreate panels on session restore
 * - **Panel**: Panel instances serialize state for persistence
 *
 * CONNECTIONS:
 * - Serializer: Converts panel state to/from Mountain DTOs
 * - Factory: Uses restored state to recreate panels
 * - Panel: Serializes panel state for persistence
 * - IPC: Communicates state persistence with Mountain
 *
 * IMPLEMENTATION NOTES:
 * - Full state capture: position, content, options, view state
 * - Version compatibility checks for state migration
 * - Defensive validation prevents restoration of invalid state
 * - Atomic state updates to prevent corruption
 * - State versioning for future compatibility
 *
 * TODOs (State Migration - LOW):
 * - Add state migration system for schema changes
 * - Add backward compatibility for older state versions
 * - Add state upgrade/downgrade handlers
 *
 * TODOs (State Compression - LOW):
 * - Add state compression for large payloads
 * - Add selective state restoration (partial load)
 * - Add lazy state loading for performance
 *
 * TODOs (State Security - LOW):
 * - Add state encryption for sensitive panel content
 * - Add state validation signatures
 * - Add state tampering detection
 *
 * Reference: TODOs mention WebViewPanel as HIGH priority for Mountain integration
 */
import { Effect } from "effect";
/**
 * @interface PanelPosition
 * @description Position information for panel placement
 */
export interface PanelPosition {
    readonly ViewColumn: number;
    readonly PreservedFocus: boolean;
}
/**
 * @interface PanelViewState
 * @description Current view state of panel
 */
export interface PanelViewState {
    readonly Active: boolean;
    readonly Visible: boolean;
    readonly ViewColumn: number;
}
/**
 * @interface PanelOptions
 * @description Panel options stored in state
 */
export interface PanelOptions {
    readonly EnableScripts?: boolean;
    readonly RetainContextWhenHidden?: boolean;
    readonly EnableFindWidget?: boolean;
    readonly LocalResourceRoots?: readonly string[];
    readonly PortMapping?: readonly unknown[];
}
/**
 * @interface PanelState
 * @description Complete state of a WebView panel for persistence
 */
export interface PanelState {
    readonly Version: number;
    readonly Handle: string;
    readonly ExtensionId: string;
    readonly ViewType: string;
    readonly Title: string;
    readonly Position: PanelPosition;
    readonly ViewState: PanelViewState;
    readonly Options: PanelOptions;
    readonly IconPath?: string;
    readonly Content?: {
        readonly Html?: string;
        readonly Uris?: readonly string[];
    };
    readonly Metadata?: {
        readonly CreatedAt: number;
        readonly LastRestoredAt?: number;
        readonly User?: string;
    };
}
/**
 * @interface StateManager
 * @description Contract for WebView state management
 */
export interface StateManager {
    readonly SavePanelState: (PanelState: PanelState) => Effect.Effect<void, Error>;
    readonly RestorePanelState: (Handle: string) => Effect.Effect<PanelState | null, Error>;
    readonly DeletePanelState: (Handle: string) => Effect.Effect<void, Error>;
    readonly GetAllPanelStates: (ExtensionId: string) => Effect.Effect<readonly PanelState[], Error>;
    readonly ClearAllPanelStates: () => Effect.Effect<void, Error>;
}
declare const StateService_base: Effect.Service.Class<StateService, "State/WebViewPanel", {
    readonly effect: Effect.Effect<{
        SavePanelState: (PanelStateData: PanelState) => Effect.Effect<void, Error>;
        RestorePanelState: (Handle: string) => Effect.Effect<PanelState | null, Error>;
        DeletePanelState: (Handle: string) => Effect.Effect<void, Error>;
        GetAllPanelStates: (ExtensionId: string) => Effect.Effect<readonly PanelState[], Error>;
        ClearAllPanelStates: () => Effect.Effect<void, Error>;
    }, unknown, never>;
}>;
/**
 * @class StateService
 * @description Service for managing WebView panel state
 */
export declare class StateService extends StateService_base {
}
export {};
//# sourceMappingURL=State.d.ts.map