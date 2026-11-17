/**
 * @module Effect/Extension
 * @description
 * Atomic extension service for Cocoon Extension Host.
 * Manages extension lifecycle including activation, deactivation, and enumeration.
 */

import { getTelemetry, type TelemetryService } from "./Telemetry.js";

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Hard ceiling (ms) for a single extension `deactivate()` at shutdown.
 * Mirrors the upstream extHostExtensionService 5s guard so a hung
 * `deactivate()` cannot stall host exit.
 */
export const DEACTIVATION_TIMEOUT_MS = 5000;

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
	readonly getAll: () => Promise<ReadonlyArray<ExtensionHost>>;

	/** Get extension by ID */
	readonly getById: (id: string) => Promise<ExtensionHost>;

	/** Activate an extension */
	readonly activate: (id: string) => Promise<ActivateResult>;

	/** Deactivate an extension */
	readonly deactivate: (id: string) => Promise<DeactivateResult>;

	/** Check if extension is active */
	readonly isActive: (id: string) => Promise<boolean>;

	/** Get active extensions count */
	readonly getActiveCount: () => Promise<number>;

	/** Snapshot of current extension states */
	readonly stateChanges: () => Promise<
		Readonly<Record<string, ExtensionState>>
	>;
}

// ============================================================================
// SERVICE TAG (plain object identity for DI)
// ============================================================================

export const ExtensionTag = { _tag: "Cocoon/Extension" } as const;

export const Extension = ExtensionTag;

// ============================================================================
// IMPLEMENTATION
// ============================================================================

function makeExtensionService(telemetry: TelemetryService): ExtensionService {

	// Storage for extensions - plain Map replaces SubscriptionRef<HashMap>
	const extensions = new Map<string, ExtensionHost>();

	// Atom: Get all extensions
	const getAll = async (): Promise<ReadonlyArray<ExtensionHost>> => {
		return Array.from(extensions.values());
	};

	// Atom: Get extension by ID
	const getById = async (id: string): Promise<ExtensionHost> => {
		const extension = extensions.get(id);

		if (extension === undefined) {
			throw new ExtensionNotFoundError(id);
		}

		return extension;
	};

	// Atom: Activate an extension
	const activate = async (id: string): Promise<ActivateResult> => {
		const startTime = Date.now();

		const current = extensions.get(id);

		if (current === undefined) {
			throw new ExtensionNotFoundError(id);
		}

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
		extensions.set(id, {
			...current,
			state: { _tag: "Activating", startTime },
		});

		telemetry.log("info", `[Extension] Activating extension: ${id}`);

		try {
			// Simulate activation (in production, this would load the extension module)
			await new Promise<void>((r) => setTimeout(r, 10));

			const activationTime = Date.now() - startTime;

			// Update state to active
			extensions.set(id, {
				...current,
				state: { _tag: "Active", activatedAt: startTime },
				activatedAt: startTime,
				activationTime,
			});

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
		} catch (error) {
			if (error instanceof ExtensionNotFoundError) {
				throw error;
			}

			// Update state to error
			const latest = extensions.get(id) ?? {
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

				state: { _tag: "Idle" } as ExtensionState,

				activatedAt: undefined,

				activationTime: undefined,
			};

			extensions.set(id, {
				...latest,
				state: { _tag: "Error", error: String(error) },
			});

			telemetry.log(
				"error",

				`[Extension] Failed to activate ${id}: ${String(error)}`,
			);

			throw new ExtensionActivationError(id, error);
		}
	};

	// Atom: Deactivate an extension
	const deactivate = async (id: string): Promise<DeactivateResult> => {
		// Defensive: a missing/blank id degrades to a tagged error result rather
		// than throwing (which would surface as an uncaught rejection at shutdown).
		if (typeof id !== "string" || id.length === 0) {
			telemetry.log(
				"warn",

				"[Extension] Deactivate called without a valid extension id",
			);

			return {
				extensionId: typeof id === "string" ? id : "",

				success: false,

				error: "Missing extension id",
			} satisfies DeactivateResult;
		}

		const current = extensions.get(id);

		if (current === undefined) {
			telemetry.log(
				"warn",

				`[Extension] Deactivate called for unknown extension: ${id}`,
			);

			return {
				extensionId: id,

				success: false,

				error: `Extension not found: ${id}`,
			} satisfies DeactivateResult;
		}

		// Idempotent: an already-deactivated (or never-activated) extension needs
		// no work and starts no timer, so shutdown cannot hang on it.
		if (
			current.state._tag === "Deactivated" ||
			current.state._tag === "Idle"
		) {
			telemetry.log(
				"info",

				`[Extension] Extension '${id}' already deactivated; skipping`,
			);

			return {
				extensionId: id,

				success: true,

				error: undefined,
			} satisfies DeactivateResult;
		}

		telemetry.log("info", `[Extension] Deactivating extension: ${id}`);

		let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
		const timedOut = new Promise<"timeout">((resolve) => {
			timeoutHandle = setTimeout(
				() => resolve("timeout"),

				DEACTIVATION_TIMEOUT_MS,
			);
		});

		// Always settle into a DeactivateResult: a synchronous throw inside the
		// async body becomes a rejection, which is caught and returned here.
		const work = (async (): Promise<DeactivateResult> => {
			try {
				// Update state to deactivating
				extensions.set(id, {
					...current,
					state: { _tag: "Deactivating" },
				});

				// Simulate deactivation
				await new Promise<void>((r) => setTimeout(r, 5));

				// Update state to deactivated
				extensions.set(id, {
					...current,
					state: { _tag: "Deactivated" },
				});

				telemetry.log(
					"info",

					`[Extension] Deactivated extension: ${id}`,
				);

				return {
					extensionId: id,

					success: true,

					error: undefined,
				} satisfies DeactivateResult;
			} catch (error) {
				// Preserve the tagged Error state and the existing error typing.
				extensions.set(id, {
					...current,
					state: { _tag: "Error", error: String(error) },
				});

				telemetry.log(
					"error",

					`[Extension] Failed to deactivate ${id}: ${String(error)}`,
				);

				return {
					extensionId: id,

					success: false,

					error: String(error),
				} satisfies DeactivateResult;
			}
		})();

		try {
			const outcome = await Promise.race([work, timedOut]);

			if (outcome === "timeout") {
				const message = `Deactivation of extension '${id}' timed out after ${DEACTIVATION_TIMEOUT_MS}ms`;

				telemetry.log("warn", `[Extension] ${message}`);

				// Mark the tagged Error state so callers can observe the failure.
				extensions.set(id, {
					...current,
					state: { _tag: "Error", error: message },
				});

				return {
					extensionId: id,

					success: false,

					error: message,
				} satisfies DeactivateResult;
			}

			return outcome;
		} finally {
			// Clear the timer on every settled path (success, failure, timeout).
			if (timeoutHandle !== undefined) {
				clearTimeout(timeoutHandle);
			}
		}
	};

	// Atom: Check if extension is active
	const isActive = async (id: string): Promise<boolean> => {
		const extension = extensions.get(id);

		if (extension === undefined) {
			return false;
		}

		return extension.state._tag === "Active";
	};

	// Atom: Get active extensions count
	const getActiveCount = async (): Promise<number> => {
		return Array.from(extensions.values()).filter(
			(ext) => ext.state._tag === "Active",
		).length;
	};

	// Atom: Snapshot of current extension states
	const stateChanges = async (): Promise<
		Readonly<Record<string, ExtensionState>>
	> => {
		const result: Record<string, ExtensionState> = {};

		for (const [id, host] of extensions.entries()) {
			result[id] = host.state;
		}

		return result;
	};

	return {
		getAll,

		getById,

		activate,

		deactivate,

		isActive,

		getActiveCount,

		stateChanges,
	};
}

// Singleton - created once on first import
let _instance: ExtensionService | undefined;

export async function getExtension(): Promise<ExtensionService> {
	if (_instance === undefined) {
		const telemetry = await getTelemetry();

		_instance = makeExtensionService(telemetry);
	}

	return _instance;
}

/** Live singleton layer (call once at bootstrap) */
export const ExtensionLive = {
	_tag: "Cocoon/Extension/Live",

	build: getExtension,
} as const;

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
		getAll: async () => mockExtensions,

		getById: async (id: string) => {
			const ext = mockExtensions.find((e) => e.id === id);

			if (!ext) {
				throw new ExtensionNotFoundError(id);
			}

			return ext;
		},

		activate: async (id: string) => ({
			extensionId: id,
			success: true,
			activationTime: 10,
			error: undefined,
		}),

		deactivate: async (id: string) => ({
			extensionId: id,
			success: true,
			error: undefined,
		}),

		isActive: async (id: string) =>
			mockExtensions.some(
				(e) => e.id === id && e.state._tag === "Active",
			),

		getActiveCount: async () => 0,

		stateChanges: async () => ({}),
	};
};

export const ExtensionMock = {
	_tag: "Cocoon/Extension/Mock",

	build: async () => makeMockExtension(),
} as const;
