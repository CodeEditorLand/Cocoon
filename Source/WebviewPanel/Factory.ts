/**
 * @module Factory
 * @description
 * Webview Panel Factory - Central creation and management of Webview panel instances
 *
 * RESPONSIBILITIES:
 * - Create new Webview panel instances with proper initialization
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
 * - **Sky**: Astro display layer renders Webview iframe content created by this factory
 * - **Wind**: Effect-TS services provide Webview resources and serve content files
 * - **Mountain**: Webview panels send state via IPC to Mountain host for persistence
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
 * TODOs (Webview Debugging - LOW):
 * FUTURE: Dev tools - enable webview.devtools == true option
 * FUTURE: Inspector - create WebviewInspector command
 * FUTURE: Console capture - intercept console messages via postMessage
 * FUTURE: Profiling - track render time with performance.measure()
 *
 * TODOs (Remote Webview - LOW):
 * FUTURE: Remote support - tunnel via Mountain WebSocket
 * FUTURE: WebSocket - use secure wss:// for communication
 * FUTURE: Dev sessions - support VS Code remote development
 *
 * Reference: WebviewPanel is HIGH priority for Mountain integration
 */

import { generateUuid } from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/uuid.js";
import type { IExtensionDescription } from "@codeeditorland/output/Target/Microsoft/VSCode/vs/platform/extensions/common/extensions.js";
import { Effect, Ref } from "effect";
import type { WebviewPanel as VSCodeWebviewPanel } from "vscode";

import { Panel as PanelModule, type Panel } from "./Panel.js";

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
 * @description Configuration options for creating a new Webview panel
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
 * @description The contract for the Webview Panel Factory service
 */
export interface Factory {
	readonly CreatePanel: (
		Extension: IExtensionDescription,

		Options: CreatePanelOptions,
	) => Effect.Effect<Panel, Error>;

	readonly GetPanel: (Handle: string) => Effect.Effect<Panel, Error>;

	readonly GetAllPanels: () => Effect.Effect<readonly Panel[], never>;

	readonly DisposePanel: (Handle: string) => Effect.Effect<void, never>;

	readonly DisposeAllPanels: () => Effect.Effect<void, never>;
}

/**
 * @class FactoryService
 * @description The Effect Service for managing Webview Panel Factory
 */
export class FactoryService extends Effect.Service<FactoryService>()(
	"Factory/WebviewPanel",

	{
		effect: Effect.gen(function* () {
			const ActivePanelsRef = yield* Ref.make(
				new Map<string, PanelRegistryEntry>(),
			);

			/**
			 * Create a new Webview panel with proper initialization
			 */
			const CreatePanel = (
				Extension: IExtensionDescription,

				Options: CreatePanelOptions,
			): Effect.Effect<Panel, Error> =>
				Effect.gen(function* () {
					// Defensive: Validate required options
					if (!Options?.ViewType || !Options?.Title) {
						return yield* Effect.fail(
							new Error("Panel requires ViewType and Title"),
						);
					}

					// Generate unique handle for this panel
					const Handle = `panel_${generateUuid()}`;

					// Create dispose callback for registry cleanup
					const OnDispose = () =>
						Effect.runFork(
							Ref.update(ActivePanelsRef, (Registry) => {
								const Updated = new Map(Registry);

								Updated.delete(Handle);

								return Updated;
							}),
						);

					// Create the panel instance
					const PanelInstance = PanelModule.Create({
						Handle,
						Extension,
						ViewType: Options.ViewType,
						Title: Options.Title,
						ShowOptions: Options.ShowOptions,
						Options: Options.Options,
						OnDispose,
					});

					// Register panel for tracking
					yield* Ref.update(ActivePanelsRef, (Registry) => {
						const Updated = new Map(Registry);

						Updated.set(Handle, {
							Handle,
							Panel: PanelInstance,
							ExtensionId: Extension.identifier.value,
							ViewType: Options.ViewType,
							CreatedAt: new Date(),
						});

						return Updated;
					});

					return PanelInstance;
				});

			/**
			 * Get a specific panel by handle
			 */
			const GetPanel = (Handle: string): Effect.Effect<Panel, Error> =>
				Effect.gen(function* () {
					const Registry = yield* Ref.get(ActivePanelsRef);

					const Entry = Registry.get(Handle);

					if (!Entry) {
						return yield* Effect.fail(
							new Error(
								`Panel with handle '${Handle}' not found`,
							),
						);
					}

					return Entry.Panel;
				});

			/**
			 * Get all active panels
			 */
			const GetAllPanels = (): Effect.Effect<readonly Panel[], never> =>
				Effect.gen(function* () {
					const Registry = yield* Ref.get(ActivePanelsRef);

					return Array.from(Registry.values()).map(
						(Entry) => Entry.Panel,
					);
				});

			/**
			 * Dispose a specific panel by handle
			 */
			const DisposePanel = (Handle: string): Effect.Effect<void, never> =>
				Effect.gen(function* () {
					const Registry = yield* Ref.get(ActivePanelsRef);

					const Entry = Registry.get(Handle);

					if (Entry) {
						Entry.Panel.dispose();
					}
				});

			/**
			 * Dispose all active panels
			 */
			const DisposeAllPanels = (): Effect.Effect<void, never> =>
				Effect.gen(function* () {
					const Registry = yield* Ref.get(ActivePanelsRef);

					yield* Effect.all(
						Array.from(Registry.values()).map((Entry) =>
							Effect.sync(() => Entry.Panel.dispose()),
						),

						{ concurrency: "unbounded" },
					);
				});

			return {
				CreatePanel,
				GetPanel,
				GetAllPanels,
				DisposePanel,
				DisposeAllPanels,
			};
		}),
	},
) {}
