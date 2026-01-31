/**
 * @module Factory
 * @description
 * WebView Panel Factory - Central creation and management of WebView panel instances
 *
 * RESPONSIBILITIES:
 * - Create new WebView panel instances with proper initialization
 * - Track active panel lifecycle and manage panel registry
 * - Handle panel disposal and cleanup
 * - Provide panel discovery and enumeration
 * - Coordinate panel creation with IPC service
 *
 * ARCHITECTURE:
 * - Pattern: VSCode extHostWebview.ts factory pattern
 * - Registry: Ref-based Map for tracking active panels by handle
 * - Lifecycle: Create → Register → Track → Dispose → Unregister
 * - Thread Safety: Effect-based atomic operations with Ref
 *
 * INTEGRATION:
 * - **Sky**: Astro display layer renders WebView iframe content created by this factory
 * - **Wind**: Effect-TS services provide WebView resources and serve content files
 * - **Mountain**: WebView panels send state via IPC to Mountain host for persistence
 * - **IPC**: Coordinates panel creation with Mountain host through IPC communication
 *
 * CONNECTIONS:
 * - Panel: Constructs Panel instances with proper initialization
 * - Message: Establishes message channels for panel communication
 * - State: Registers panels for state tracking and restoration
 * - IPC: Communicates panel creation events to Mountain host
 *
 * IMPLEMENTATION NOTES:
 * - UUID generation ensures unique panel identifiers
 * - Ref-based Map provides atomic panel registry operations
 * - All panel operations use Effect for error handling
 * - Defensive validation prevents malformed panel creation
 * - OnDispose callback ensures cleanup on panel disposal
 *
 * TODOs (WebView Debugging - LOW):
 * - Add dev tools integration for WebView debugging
 * - Add WebView inspector for DOM examination
 * - Add console.log capture from WebView context
 * - Add performance profiling for WebView rendering
 *
 * TODOs (Remote WebView - LOW):
 * - Add remote WebView support via tunneling
 * - Add secure WebSocket communication for remote WebViews
 * - Add remote development session support
 *
 * Reference: TODOs mention WebViewPanel as HIGH priority for Mountain integration
 */
import type { IExtensionDescription } from "@codeeditorland/output/vs/platform/extensions/common/extensions.js";
import { Effect } from "effect";
import type { Panel } from "./Panel.js";
/**
 * @interface PanelRegistryEntry
 * @description Metadata about a registered panel in the factory registry
 */
export interface PanelRegistryEntry {
    readonly Handle: string;
    readonly Panel: Panel;
    readonly ExtensionId: string;
    readonly ViewType: string;
    readonly CreatedAt: Date;
}
/**
 * @interface CreatePanelOptions
 * @description Configuration options for creating a new WebView panel
 */
export interface CreatePanelOptions {
    readonly ViewType: string;
    readonly Title: string;
    readonly ShowOptions: {
        readonly ViewColumn?: number;
        readonly PreserveFocus?: boolean;
    };
    readonly Options?: {
        readonly EnableScripts?: boolean;
        readonly RetainContextWhenHidden?: boolean;
        readonly EnableFindWidget?: boolean;
        readonly LocalResourceRoots?: readonly unknown[];
        readonly PortMapping?: readonly unknown[];
    };
}
/**
 * @interface Factory
 * @description The contract for the WebView Panel Factory service
 */
export interface Factory {
    readonly CreatePanel: (Extension: IExtensionDescription, Options: CreatePanelOptions) => Effect.Effect<Panel, Error>;
    readonly GetPanel: (Handle: string) => Effect.Effect<Panel, Error>;
    readonly GetAllPanels: () => Effect.Effect<readonly Panel[], never>;
    readonly DisposePanel: (Handle: string) => Effect.Effect<void, never>;
    readonly DisposeAllPanels: () => Effect.Effect<void, never>;
}
declare const FactoryService_base: Effect.Service.Class<FactoryService, "Factory/WebViewPanel", {
    readonly effect: Effect.Effect<{
        CreatePanel: (Extension: IExtensionDescription, Options: CreatePanelOptions) => Effect.Effect<Panel, Error>;
        GetPanel: (Handle: string) => Effect.Effect<Panel, Error>;
        GetAllPanels: () => Effect.Effect<readonly Panel[], never>;
        DisposePanel: (Handle: string) => Effect.Effect<void, never>;
        DisposeAllPanels: () => Effect.Effect<void, never>;
    }, never, never>;
}>;
/**
 * @class FactoryService
 * @description The Effect Service for managing WebView Panel Factory
 */
export declare class FactoryService extends FactoryService_base {
}
export {};
//# sourceMappingURL=Factory.d.ts.map