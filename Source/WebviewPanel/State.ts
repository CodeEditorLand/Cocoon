/**
 * @module State
 * @description
 * Webview State Management - State persistence and restoration for Webview panels
 *
 * RESPONSIBILITIES:
 * - Manage Webview panel state persistence across sessions
 * - Restore Webview panels from saved state on session restart
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
 * - **Mountain**: Webview state persisted to Mountain backend for session restore
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
 * FUTURE: Migration system - implement migrateState() for schema changes
 * FUTURE: Backward compatibility - handle v1 state in v2 parser
 * FUTURE: Upgrade/downgrade - support state version conversion
 *
 * TODOs (State Compression - LOW):
 * FUTURE: Compression - use zlib for large panel states
 * FUTURE: Partial load - restore only visible portion of state
 * FUTURE: Lazy loading - defer heavy state until needed
 *
 * TODOs (State Security - LOW):
 * FUTURE: Encryption - encrypt sensitive panel content
 * FUTURE: Signatures - add HMAC for state validation
 * FUTURE: Tamper detection - verify state before restoration
 *
 * Reference: WebviewPanel is HIGH priority for Mountain integration
 */

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
 * @description Complete state of a Webview panel for persistence
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
 * @description Contract for Webview state management
 */
export interface StateManager {

	readonly SavePanelState: (
		PanelState: PanelState,
	) => Promise<void>;

	readonly RestorePanelState: (
		Handle: string,
	) => Promise<PanelState | null>;

	readonly DeletePanelState: (Handle: string) => Promise<void>;

	readonly GetAllPanelStates: (
		ExtensionId: string,
	) => Promise<readonly PanelState[]>;

	readonly ClearAllPanelStates: () => Promise<void>;
}

/**
 * @constant STATE_VERSION
 * @description Current version of the state schema
 */
const STATE_VERSION = 1;

/**
 * @class StateService
 * @description Service for managing Webview panel state
 */
export class StateService extends /* Effect.Service */(
	"State/WebviewPanel",

	{
		effect: async function() {
			// In-memory cache of panel states - read path; Mountain storage
			// is the durable copy keyed `webviewPanelState:<handle>`.
			const StateCache = new Map<string, PanelState>();

			/**
			 * Resolve the live Mountain client published by
			 * `GRPCServerService.ConnectToMountain`. Undefined until the
			 * gRPC connection is up - persistence is then cache-only and
			 * the next save after connect re-syncs.
			 */
			const GetMountainClient = ():
				| {
						sendRequest: (
							method: string,

							parameters: unknown,
						) => Promise<unknown>;
				  }
				| undefined => (globalThis as any).__COCOON_MOUNTAIN_CLIENT__;

			const StorageKey = (Handle: string): string =>
				`webviewPanelState:${Handle}`;

			/**
			 * Validate a PanelState structure
			 */
			const ValidateState = (
				State: unknown,
			): Promise<PanelState> =>
				async function() {
					// Defensive: Check if state is an object
					if (
						typeof State !== "object" ||
						State === null ||
						Array.isArray(State)
					) {
						throw new Error("Panel state must be an object"),
						))))))))))));
					}

					const S = State as Record<string, unknown>;

					// Check required fields
					if (typeof S.Version !== "number") {
						throw new Error("Panel state missing Version"),
						;
					}

					if (typeof S.Handle !== "string") {
						throw new Error("Panel state missing Handle"),
						;
					}

					if (typeof S.ExtensionId !== "string") {
						throw new Error("Panel state missing ExtensionId"),
						;
					}

					if (typeof S.ViewType !== "string") {
						throw new Error("Panel state missing ViewType"),
						;
					}

					if (typeof S.Title !== "string") {
						throw new Error("Panel state missing Title"),
						;
					}

					// Validate nested objects
					if (
						typeof S.Position !== "object" ||
						S.Position === null ||
						Array.isArray(S.Position)
					) {
						throw new Error("Panel state has invalid Position"),
						;
					}

					const Position = S.Position as Record<string, unknown>;

					if (typeof Position.ViewColumn !== "number") {
						throw new Error("Panel state has invalid ViewColumn"),
						;
					}

					if (typeof Position.PreservedFocus !== "boolean") {
						throw new Error("Panel state has invalid PreservedFocus"),
						;
					}

					// Validate ViewState
					if (
						typeof S.ViewState !== "object" ||
						S.ViewState === null ||
						Array.isArray(S.ViewState)
					) {
						throw new Error("Panel state has invalid ViewState"),
						;
					}

					const ViewState = S.ViewState as Record<string, unknown>;

					if (
						typeof ViewState.Active !== "boolean" ||
						typeof ViewState.Visible !== "boolean" ||
						typeof ViewState.ViewColumn !== "number"
					) {
						throw new Error("Panel state has invalid ViewState"),
						;
					}

					return S as PanelState;
				};

			/**
			 * Create a PanelState object
			 */
			const CreatePanelState = (Params: {
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
			}) => {
				const State: PanelState = {
					Version: STATE_VERSION,
					Handle: Params.Handle,
					ExtensionId: Params.ExtensionId,
					ViewType: Params.ViewType,
					Title: Params.Title,
					Position: Params.Position,
					ViewState: Params.ViewState,
					Options: Params.Options,
					IconPath: Params.IconPath,
					Content: Params.Content,
					Metadata: {
						CreatedAt: Date.now(),
					},
				};

				return State;
			};

			/**
			 * Save panel state to cache and persist to Mountain storage.
			 * The Mountain write is fire-and-forget: panel state must never
			 * block or fail panel creation, and the in-memory copy already
			 * serves same-session reads.
			 */
			const SavePanelState = (
				PanelStateData: PanelState,
			): Promise<void> =>
				async function() {
					StateCache.set(PanelStateData.Handle, PanelStateData;

					void GetMountainClient()
						?.sendRequest("Storage.Set", [
							StorageKey(PanelStateData.Handle),

							PanelStateData,
						])
						.catch(() => undefined;
				};

			/**
			 * Restore panel state - cache first, Mountain storage on miss
			 * (panels created before the last reload only exist there).
			 */
			const RestorePanelState = (
				Handle: string,
			): Promise<PanelState | null> =>
				async function() {
					let State: unknown = StateCache.get(Handle;

					if (!State) {
						try {
							State = (await GetMountainClient()?.sendRequest(
								"Storage.Get",

								[StorageKey(Handle)],
							)) ?? null;
						} catch (_e) {
							State = null;
						}
					}

					if (!State) {
						return null;
					}

					// Validate loaded state
					const ValidatedState = await ValidateState(State;

					StateCache.set(Handle, ValidatedState;

					return ValidatedState;
				};

			/**
			 * Delete panel state from cache and Mountain storage.
			 */
			const DeletePanelState = (
				Handle: string,
			): Promise<void> =>
				async function() {
					StateCache.delete(Handle;

					void GetMountainClient()
						?.sendRequest("Storage.Set", [StorageKey(Handle), null])
						.catch(() => undefined;
				};

			/**
			 * Get all panel states for an extension
			 */
			const GetAllPanelStates = (
				ExtensionId: string,
			): Promise<readonly PanelState[]> =>
				async function() {
					return Array.from(StateCache.values()).filter(
						(State) => State.ExtensionId === ExtensionId,
					;
				};

			/**
			 * Clear all panel states from cache and Mountain storage.
			 */
			const ClearAllPanelStates = (): Promise<void> =>
				async function() {
					const Handles = Array.from(StateCache.keys();

					StateCache.clear(;

					const Client = GetMountainClient(;

					for (const Handle of Handles) {
						void Client?.sendRequest("Storage.Set", [
							StorageKey(Handle),

							null,
						]).catch(() => undefined;
					}
				};

			return {
				SavePanelState,
				RestorePanelState,
				DeletePanelState,
				GetAllPanelStates,
				ClearAllPanelStates,
			};
		}),
	},
) {}
