/**
 * @module Serializer
 * @description
 * Webview State Serializer - Convert Webview state to/from Mountain DTOs
 *
 * RESPONSIBILITIES:
 * - Serialize Webview panel state to Mountain DTO format
 * - Deserialize Mountain DTOs back to Webview panel state
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
 * Reference: TODOs mention WebviewPanel as HIGH priority for Mountain integration
 */

import { Effect } from "effect";
import type { Uri } from "vscode";

import type { PanelOptions, PanelPosition, PanelState, PanelViewState } from "./State.js";

/**
 * @interface MountainDTO
 * @description DTO format for Webview state in Mountain backend
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
 * @description Contract for Webview state serialization
 */
export interface Serializer {
	readonly SerializeToDTO: (
		State: PanelState,
	) => Effect.Effect<MountainDTO, Error>;
	readonly DeserializeFromDTO: (
		DTO: unknown,
	) => Effect.Effect<PanelState, Error>;
	readonly ValidateDTO: (DTO: unknown) => Effect.Effect<MountainDTO, Error>;
}

/**
 * @constant DTO_VERSION
 * @description Current version of the DTO schema
 */
const DTO_VERSION = 1;

/**
 * @class SerializerService
 * @description Service for serializing Webview state to/from Mountain DTOs
 */
export class SerializerService extends Effect.Service<SerializerService>()("Serializer/WebviewPanel", {
	effect: Effect.gen(function* () {
		/**
		 * Validate a MountainDTO structure
		 */
		const ValidateDTO = (DTO: unknown): Effect.Effect<MountainDTO, Error> =>
			Effect.gen(function* () {
				// Defensive: Check if DTO is an object
				if (
					typeof DTO !== "object" ||
					DTO === null ||
					Array.isArray(DTO)
				) {
					return yield* Effect.fail(
						new Error("Mountain DTO must be an object"),
					);
				}

				const D = DTO as Record<string, unknown>;

				// Check required fields
				if (typeof D.Version !== "number") {
					return yield* Effect.fail(new Error("Mountain DTO missing Version"));
				}

				if (typeof D.Handle !== "string") {
					return yield* Effect.fail(new Error("Mountain DTO missing Handle"));
				}

				if (typeof D.ExtensionId !== "string") {
					return yield* Effect.fail(
						new Error("Mountain DTO missing ExtensionId"),
					);
				}

				if (typeof D.ViewType !== "string") {
					return yield* Effect.fail(
						new Error("Mountain DTO missing ViewType"),
					);
				}

				if (typeof D.Title !== "string") {
					return yield* Effect.fail(new Error("Mountain DTO missing Title"));
				}

				// Validate numeric fields
				if (typeof D.ViewColumn !== "number") {
					return yield* Effect.fail(
						new Error("Mountain DTO has invalid ViewColumn"),
					);
				}

				if (typeof D.PreservedFocus !== "boolean") {
					return yield* Effect.fail(
						new Error("Mountain DTO has invalid PreservedFocus"),
					);
				}

				if (typeof D.IsActive !== "boolean") {
					return yield* Effect.fail(
						new Error("Mountain DTO has invalid IsActive"),
					);
				}

				if (typeof D.IsVisible !== "boolean") {
					return yield* Effect.fail(
						new Error("Mountain DTO has invalid IsVisible"),
					);
				}

				// Validate Options object
				if (
					typeof D.Options !== "object" ||
					D.Options === null ||
					Array.isArray(D.Options)
				) {
					return yield* Effect.fail(
						new Error("Mountain DTO has invalid Options"),
					);
				}

				const Options = D.Options as Record<string, unknown>;
				if (
					typeof Options.EnableScripts !== "undefined" &&
					typeof Options.EnableScripts !== "boolean"
				) {
					return yield* Effect.fail(
						new Error("Mountain DTO has invalid EnableScripts option"),
					);
				}

				return D as MountainDTO;
			});

		/**
		 * Serialize PanelState to MountainDTO
		 */
		const SerializeToDTO = (
			State: PanelState,
		): Effect.Effect<MountainDTO, Error> =>
			Effect.gen(function* () {
				// Create DTO from PanelState
				const DTO: MountainDTO = {
					Version: DTO_VERSION,
					Handle: State.Handle,
					ExtensionId: State.ExtensionId,
					ViewType: State.ViewType,
					Title: State.Title,
					ViewColumn: State.Position.ViewColumn,
					PreservedFocus: State.Position.PreservedFocus,
					IsActive: State.ViewState.Active,
					IsVisible: State.ViewState.Visible,
					Options: {
						EnableScripts: State.Options.EnableScripts,
						RetainContextWhenHidden:
							State.Options.RetainContextWhenHidden,
						EnableFindWidget: State.Options.EnableFindWidget,
						LocalResourceRoots: State.Options.LocalResourceRoots as
							| readonly string[]
							| undefined,
						PortMapping: State.Options.PortMapping,
					},
					IconPath: State.IconPath,
					Content: State.Content,
					Metadata: State.Metadata,
				};

				return DTO;
			});

		/**
		 * Deserialize MountainDTO to PanelState
		 */
		const DeserializeFromDTO = (
			DTO: unknown,
		): Effect.Effect<PanelState, Error> =>
			Effect.gen(function* () {
				// Validate DTO structure
				const ValidatedDTO = yield* ValidateDTO(DTO);

				// Convert DTO to PanelState
				const State: PanelState = {
					Version: ValidatedDTO.Version,
					Handle: ValidatedDTO.Handle,
					ExtensionId: ValidatedDTO.ExtensionId,
					ViewType: ValidatedDTO.ViewType,
					Title: ValidatedDTO.Title,
					Position: {
						ViewColumn: ValidatedDTO.ViewColumn,
						PreservedFocus: ValidatedDTO.PreservedFocus,
					},
					ViewState: {
						Active: ValidatedDTO.IsActive,
						Visible: ValidatedDTO.IsVisible,
						ViewColumn: ValidatedDTO.ViewColumn,
					},
					Options: {
						EnableScripts: ValidatedDTO.Options.EnableScripts,
						RetainContextWhenHidden:
							ValidatedDTO.Options.RetainContextWhenHidden,
						EnableFindWidget: ValidatedDTO.Options.EnableFindWidget,
						LocalResourceRoots: ValidatedDTO.Options
							.LocalResourceRoots as
							| readonly string[]
							| undefined,
						PortMapping: ValidatedDTO.Options.PortMapping,
					},
					IconPath: ValidatedDTO.IconPath,
					Content: ValidatedDTO.Content,
					Metadata: ValidatedDTO.Metadata,
				};

				return State;
			});

		return {
			SerializeToDTO,
			DeserializeFromDTO,
			ValidateDTO,
		};
	}),
}) {}
