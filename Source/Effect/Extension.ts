/**
 * @module Effect/Extension
 * @description
 * Atomic extension service for Cocoon Extension Host using Effect-TS.
 * Manages extension lifecycle including activation, deactivation, and enumeration.
 */

import {
	Context,
	Effect,
	HashMap,
	Layer,
	Option,
	Ref,
	SubscriptionRef,
} from "effect";

import { TelemetryTag } from "./Telemetry.js";

// ============================================================================
// TYPES
// ============================================================================

export interface ExtensionManifest {
	readonly id: string;

	readonly name: string;

	readonly version: string;

	readonly description: string;

	readonly publisher: string;

	readonly entryPoint: string;

	readonly enabled: boolean;

	readonly activationEvents: ReadonlyArray<string>;

	readonly dependencies: ReadonlyArray<string>;

	readonly contributes: Readonly<Record<string, unknown>>;
}

export interface ExtensionHost {
	readonly id: string;

	readonly manifest: ExtensionManifest;

	readonly state: ExtensionState;

	readonly activatedAt: number | undefined;

	readonly activationTime: number | undefined;
}

export type ExtensionState =
	| { readonly _tag: "Idle" }
	| { readonly _tag: "Activating"; readonly startTime: number }
	| { readonly _tag: "Active"; readonly activatedAt: number }
	| { readonly _tag: "Deactivating" }
	| { readonly _tag: "Deactivated" }
	| { readonly _tag: "Error"; readonly error: string };

export interface ActivateResult {
	readonly extensionId: string;

	readonly success: boolean;

	readonly activationTime: number;

	readonly error: string | undefined;
}

export interface DeactivateResult {
	readonly extensionId: string;

	readonly success: boolean;

	readonly error: string | undefined;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class ExtensionNotFoundError extends Error {
	readonly _tag = "ExtensionNotFoundError";

	constructor(readonly extensionId: string) {
		super(`Extension not found: ${extensionId}`);
	}
}

export class ExtensionActivationError extends Error {
	readonly _tag = "ExtensionActivationError";

	constructor(
		readonly extensionId: string,

		override readonly cause: unknown,
	) {
		super(
			`Failed to activate extension '${extensionId}': ${String(cause)}`,
		);
	}
}

export class ExtensionDeactivationError extends Error {
	readonly _tag = "ExtensionDeactivationError";

	constructor(
		readonly extensionId: string,

		override readonly cause: unknown,
	) {
		super(
			`Failed to deactivate extension '${extensionId}': ${String(cause)}`,
		);
	}
}

// ============================================================================
// EXTENSION SERVICE INTERFACE
// ============================================================================

export interface ExtensionService {
	/** Get all extensions */
	readonly getAll: Effect.Effect<ReadonlyArray<ExtensionHost>, never>;

	/** Get extension by ID */
	readonly getById: (
		id: string,
	) => Effect.Effect<ExtensionHost, ExtensionNotFoundError>;

	/** Activate an extension */
	readonly activate: (
		id: string,
	) => Effect.Effect<
		ActivateResult,
		ExtensionActivationError | ExtensionNotFoundError
	>;

	/** Deactivate an extension */
	readonly deactivate: (
		id: string,
	) => Effect.Effect<
		DeactivateResult,
		ExtensionDeactivationError | ExtensionNotFoundError
	>;

	/** Check if extension is active */
	readonly isActive: (id: string) => Effect.Effect<boolean, never>;

	/** Get active extensions count */
	readonly getActiveCount: Effect.Effect<number, never>;

	/** Stream of extension state changes */
	readonly stateChanges: Effect.Effect<
		Readonly<Record<string, ExtensionState>>,
		never
	>;
}

// ============================================================================
// SERVICE TAG
// ============================================================================

export class ExtensionTag extends Context.Tag("Cocoon/Extension")<
	ExtensionTag,
	ExtensionService
>() {}

export const Extension = ExtensionTag;

// ============================================================================
// IMPLEMENTATION
// ============================================================================

export const ExtensionLive = Layer.effect(
	Extension,

	Effect.gen(function* () {
		const telemetry = yield* TelemetryTag;

		// Storage for extensions
		const extensionsRef = yield* SubscriptionRef.make<
			HashMap.HashMap<string, ExtensionHost>
		>(HashMap.empty());

		// Atom: Get all extensions
		const getAll = Effect.gen(function* () {
			const extensions = yield* extensionsRef.get;
			return Array.from(HashMap.values(extensions));
		});

		// Atom: Get extension by ID
		const getById = (id: string) =>
			Effect.gen(function* () {
				const extensions = yield* extensionsRef.get;
				const extension = HashMap.get(extensions, id);

				if (extension._tag === "None") {
					return yield* Effect.fail(new ExtensionNotFoundError(id));
				}

				return extension.value;
			});

		// Atom: Activate an extension
		const activate = (id: string) =>
			Effect.gen(function* () {
				const startTime = Date.now();
				const extensions = yield* extensionsRef.get;
				const extension = HashMap.get(extensions, id);

				if (extension._tag === "None") {
					return yield* Effect.fail(new ExtensionNotFoundError(id));
				}

				const current = extension.value;

				// Check if already active
				if (current.state._tag === "Active") {
					return {
						extensionId: id,
						success: true,
						activationTime: 0,
						error: undefined,
					} satisfies ActivateResult;
				}

				// Update state to activating
				yield* Ref.set(
					extensionsRef,

					HashMap.set(extensions, id, {
						...current,
						state: { _tag: "Activating", startTime },
					}),
				);

				telemetry.log(
					"info",

					`[Extension] Activating extension: ${id}`,
				);

				// Simulate activation (in production, this would load the extension module)
				yield* Effect.sleep("10 millis");

				const activationTime = Date.now() - startTime;

				// Update state to active
				const updatedExtensions = yield* extensionsRef.get;
				yield* Ref.set(
					extensionsRef,

					HashMap.set(updatedExtensions, id, {
						...current,
						state: { _tag: "Active", activatedAt: startTime },
						activatedAt: startTime,
						activationTime,
					}),
				);

				telemetry.log(
					"info",

					`[Extension] Activated extension: ${id} (${activationTime}ms)`,
				);

				return {
					extensionId: id,
					success: true,
					activationTime,
					error: undefined,
				} satisfies ActivateResult;
			}).pipe(
				Effect.catchAll((error) =>
					Effect.gen(function* () {
						if (error instanceof ExtensionNotFoundError) {
							return yield* Effect.fail(error);
						}

						// Update state to error
						const extensions = yield* extensionsRef.get;
						yield* Ref.set(
							extensionsRef,

							HashMap.set(extensions, id, {
								...HashMap.get(extensions, id).pipe(
									Option.getOrElse(() => ({
										id,
										manifest: {
											id,
											name: "Unknown",
											version: "0.0.0",
											description: "",
											publisher: "",
											entryPoint: "",
											enabled: true,
											activationEvents: [],
											dependencies: [],
											contributes: {},
										},
										state: { _tag: "Idle" },
										activatedAt: undefined,
										activationTime: undefined,
									})),
								),
								state: { _tag: "Error", error: String(error) },
							}),
						);

						telemetry.log(
							"error",

							`[Extension] Failed to activate ${id}: ${String(error)}`,
						);

						return yield* Effect.fail(
							new ExtensionActivationError(id, error),
						);
					}),
				),
			) as any;

		// Atom: Deactivate an extension
		const deactivate = (id: string) =>
			Effect.gen(function* () {
				const extensions = yield* extensionsRef.get;
				const extension = HashMap.get(extensions, id);

				if (extension._tag === "None") {
					return yield* Effect.fail(new ExtensionNotFoundError(id));
				}

				const current = extension.value;

				// Check if already deactivated
				if (
					current.state._tag === "Deactivated" ||
					current.state._tag === "Idle"
				) {
					return {
						extensionId: id,
						success: true,
						error: undefined,
					} satisfies DeactivateResult;
				}

				telemetry.log(
					"info",

					`[Extension] Deactivating extension: ${id}`,
				);

				// Update state to deactivating
				yield* Ref.set(
					extensionsRef,

					HashMap.set(extensions, id, {
						...current,
						state: { _tag: "Deactivating" },
					}),
				);

				// Simulate deactivation
				yield* Effect.sleep("5 millis");

				// Update state to deactivated
				const updatedExtensions = yield* extensionsRef.get;
				yield* Ref.set(
					extensionsRef,

					HashMap.set(updatedExtensions, id, {
						...current,
						state: { _tag: "Deactivated" },
					}),
				);

				telemetry.log(
					"info",

					`[Extension] Deactivated extension: ${id}`,
				);

				return {
					extensionId: id,
					success: true,
					error: undefined,
				} satisfies DeactivateResult;
			}).pipe(
				Effect.catchAll((error) =>
					Effect.gen(function* () {
						if (error instanceof ExtensionNotFoundError) {
							return yield* Effect.fail(error);
						}

						telemetry.log(
							"error",

							`[Extension] Failed to deactivate ${id}: ${String(error)}`,
						);

						return yield* Effect.fail(
							new ExtensionDeactivationError(id, error),
						);
					}),
				),
			) as any;

		// Atom: Check if extension is active
		const isActive = (id: string) =>
			Effect.gen(function* () {
				const extensions = yield* extensionsRef.get;
				const extension = HashMap.get(extensions, id);

				if (extension._tag === "None") {
					return false;
				}

				return extension.value.state._tag === "Active";
			});

		// Atom: Get active extensions count
		const getActiveCount = Effect.gen(function* () {
			const extensions = yield* extensionsRef.get;
			const values = Array.from(HashMap.values(extensions));
			return values.filter((ext) => ext.state._tag === "Active").length;
		});

		// Atom: Get state changes
		const stateChanges = Effect.map(extensionsRef.get, (extensions) => {
			const result: Record<string, ExtensionState> = {};
			for (const [id, host] of HashMap.entries(extensions)) {
				result[id] = host.state;
			}
			return result;
		});

		return {
			getAll,
			getById,
			activate,
			deactivate,
			isActive,
			getActiveCount,
			stateChanges,
		} satisfies ExtensionService;
	}),
);

// ============================================================================
// MOCK FOR TESTING
// ============================================================================

export const makeMockExtension = (
	extensions: Array<ExtensionManifest> = [],
): ExtensionService => {
	const mockExtensions = extensions.map((manifest) => ({
		id: manifest.id,
		manifest,
		state: { _tag: "Idle" } as ExtensionState,
		activatedAt: undefined,
		activationTime: undefined,
	}));

	return {
		getAll: Effect.succeed(mockExtensions),

		getById: (id: string) =>
			Effect.gen(function* () {
				const ext = mockExtensions.find((e) => e.id === id);
				if (!ext) {
					return yield* Effect.fail(new ExtensionNotFoundError(id));
				}
				return ext;
			}),

		activate: (id: string) =>
			Effect.succeed({
				extensionId: id,
				success: true,
				activationTime: 10,
				error: undefined,
			}),

		deactivate: (id: string) =>
			Effect.succeed({
				extensionId: id,
				success: true,
				error: undefined,
			}),

		isActive: (id: string) =>
			Effect.succeed(
				mockExtensions.some(
					(e) => e.id === id && e.state._tag === "Active",
				),
			),

		getActiveCount: Effect.succeed(0),

		stateChanges: Effect.succeed({}),
	};
};

export const ExtensionMock = Layer.effect(
	Extension,

	Effect.succeed(makeMockExtension()),
);
