/**
 * @module Handler/ExtensionHostHandler
 * @description
 * Handles extension host lifecycle methods from Mountain:
 * - InitializeExtensionHost - receives full init payload, builds registry
 * - $deltaExtensions - applies extension list diffs
 * - $activateByEvent - activates extensions matching an event
 * - $startExtensionHost - signals host should begin processing
 *
 * The heavy implementation (vscode shim registration, module hook patching,
 * extension loading) lives in the neighbouring atomic modules:
 * - VscodeModuleHooks.ts - CJS/ESM `require('vscode')` interception
 * - EnsureVscodeAPI.ts  - builds globalThis.__cocoonVscodeAPI shim
 * - ActivateExtension.ts - loads + activates a single extension from disk
 */

import { CocoonDevLog } from "../../../Dev/Log.js";
import type { HandlerContext } from "../../Handler/Context.js";
import ActivateExtension from "./ActivateExtension.js";
import EnsureVscodeAPIRegistered from "./EnsureVscodeAPI.js";

/**
 * Handle InitializeExtensionHost from Mountain.
 * Receives the full IExtensionHostInitData payload (extensions list,
 * workspace, environment, telemetry, paths). Stores init data and
 * returns "initialized" so Mountain unblocks.
 */
const HandleInitializeExtensionHost = async (
	Context: HandlerContext,

	Parameters: any,
): Promise<string> => {
	const Extensions: any[] = Parameters?.extensions ?? [];

	CocoonDevLog(
		"ext-host",

		`[ExtensionHostHandler] InitializeExtensionHost received ${Extensions.length} extensions`,
	);

	// Store init data for later use by extension activation
	Context.ExtensionHostInitData = Parameters;

	// Build extension registry and activation event index
	Context.ExtensionRegistry.clear();

	Context.ActivationEventIndex.clear();

	for (const Extension of Extensions) {
		const Identifier =
			Extension?.identifier?.value ??
			Extension?.identifier?.id ??
			Extension?.identifier ??
			"unknown";

		Context.ExtensionRegistry.set(Identifier, Extension);

		const ActivationEvents: string[] = Extension?.activationEvents ?? [];

		for (const Event of ActivationEvents) {
			const Existing = Context.ActivationEventIndex.get(Event) ?? [];

			Existing.push(Identifier);

			Context.ActivationEventIndex.set(Event, Existing);
		}
	}

	Context.ExtensionHostReady = true;

	CocoonDevLog(
		"ext-host",

		`[ExtensionHostHandler] Extension registry: ${Context.ExtensionRegistry.size} extensions, ${Context.ActivationEventIndex.size} activation events`,
	);

	// Emit event so other Cocoon services can react
	Context.Emitter.emit("extensionHostInitialized", {
		extensionCount: Context.ExtensionRegistry.size,
		autoStart: Parameters?.autoStart ?? false,
	});

	// Mountain's gRPC is now confirmed running (it just called us).
	// Reconnect MountainClientService in the background so Cocoon can
	// send notifications back (provider registrations, extension host
	// messages, etc.). Fire-and-forget - don't block the response.
	Context.ConnectToMountain().catch((Error) => {
		CocoonDevLog(
			"ext-host",

			`[ExtensionHostHandler] Background Mountain reconnect failed: ${Error instanceof globalThis.Error ? Error.message : String(Error)}`,
		);
	});

	return "initialized";
};

/**
 * Handle $deltaExtensions from Mountain.
 * Receives extension list diffs (added/removed) after initial load.
 *
 * Wave 7 instrumentation: every delta logs `+Added -Removed` plus the
 * total registry size and the handler wall-clock duration. A Mountain
 * rebuild sees an observable line per VSIX install/uninstall (K2/K3 →
 * K4) - makes sudden registry growth or deletion visible during
 * regression hunts.
 */
const HandleDeltaExtensions = async (
	Context: HandlerContext,

	Parameters: any,
): Promise<any> => {
	const DeltaStart = performance.now();

	const Added: any[] = Parameters?.toAdd ?? [];

	const Removed: any[] = Parameters?.toRemove ?? [];

	const IdentifierOf = (Extension: any): string =>
		Extension?.identifier?.value ??
		Extension?.identifier?.id ??
		Extension?.identifier ??
		"unknown";

	let AddedActivationEvents = 0;

	// Add new extensions to registry
	for (const Extension of Added) {
		const Identifier = IdentifierOf(Extension);

		Context.ExtensionRegistry.set(Identifier, Extension);

		const ActivationEvents: string[] = Extension?.activationEvents ?? [];

		for (const Event of ActivationEvents) {
			const Existing = Context.ActivationEventIndex.get(Event) ?? [];

			if (!Existing.includes(Identifier)) {
				Existing.push(Identifier);

				Context.ActivationEventIndex.set(Event, Existing);

				AddedActivationEvents++;
			}
		}
	}

	// Remove extensions from registry
	for (const Extension of Removed) {
		const Identifier = IdentifierOf(Extension);

		Context.ExtensionRegistry.delete(Identifier);
	}

	const DurationMs = Math.round(performance.now() - DeltaStart);

	CocoonDevLog(
		"ext-host",

		`[ExtensionHostHandler] $deltaExtensions: +${Added.length} -${Removed.length} | registry=${Context.ExtensionRegistry.size} | activationEvents+=${AddedActivationEvents} | ${DurationMs}ms`,
	);

	Context.Emitter.emit("deltaExtensions", {
		added: Added.length,
		removed: Removed.length,
		registrySize: Context.ExtensionRegistry.size,
		durationMs: DurationMs,
	});

	return {
		success: true,

		registrySize: Context.ExtensionRegistry.size,

		durationMs: DurationMs,
	};
};

/**
 * Handle $activateByEvent from Mountain.
 * Activates all extensions that declare the given activation event.
 */
const HandleActivateByEvent = async (
	Context: HandlerContext,

	Parameters: any,
): Promise<any> => {
	// Ensure the vscode API shim is available before any extension loads
	await EnsureVscodeAPIRegistered(Context);

	const ActivationEvent =
		typeof Parameters === "string"
			? Parameters
			: (Parameters?.activationEvent ?? Parameters?.event ?? "*");

	// For "*" we activate all extensions that have any activation event.
	// For a specific event we activate matching ones AND "*" ones.
	let MatchingExtensions: string[];

	if (ActivationEvent === "*") {
		// Collect all extensions across every event bucket (deduplicated)
		const All = new Set<string>();

		for (const Ids of Context.ActivationEventIndex.values()) {
			for (const Id of Ids) All.add(Id);
		}

		MatchingExtensions = [...All];
	} else {
		const Specific =
			Context.ActivationEventIndex.get(ActivationEvent) ?? [];

		const Star = Context.ActivationEventIndex.get("*") ?? [];

		MatchingExtensions = [...new Set([...Specific, ...Star])];
	}

	CocoonDevLog(
		"ext-host",

		`[ExtensionHostHandler] $activateByEvent: ${ActivationEvent} → ${MatchingExtensions.length} extensions`,
	);

	if (MatchingExtensions.length > 0) {
		CocoonDevLog(
			"ext-activate",

			`[ExtensionHostHandler] Activating: ${MatchingExtensions.slice(0, 5).join(", ")}${MatchingExtensions.length > 5 ? ` (+${MatchingExtensions.length - 5} more)` : ""}`,
		);
	} else {
		CocoonDevLog(
			"ext-activate",

			`[ExtensionHostHandler] Available events: ${[...Context.ActivationEventIndex.keys()].slice(0, 10).join(", ")}${Context.ActivationEventIndex.size > 10 ? ` (+${Context.ActivationEventIndex.size - 10} more)` : ""}`,
		);
	}

	// Dependency-ordered activation (T2.5). Before activating each
	// extension, activate its declared `extensionDependencies` first.
	// A Set tracks in-progress activations to break circular dep cycles.
	const InProgress = new Set<string>();

	const ActivateWithDeps = async (
		ExtId: string,

		Event: string,

		Depth = 0,
	): Promise<void> => {
		// Already activated or currently being activated (cycle guard).
		if (Context.ActivatedExtensions.has(ExtId) || InProgress.has(ExtId))
			return;

		// Depth guard: max 20 levels of transitive deps before bail-out.
		if (Depth > 20) {
			CocoonDevLog(
				"ext-activate",

				`[ExtensionHostHandler] Max dep depth reached at ${ExtId}; skipping`,
			);

			return;
		}

		InProgress.add(ExtId);

		const Extension = Context.ExtensionRegistry.get(ExtId);

		const Deps: string[] = (Extension as any)?.extensionDependencies ?? [];

		// Activate each declared dependency first (sequentially so we
		// honour transitive ordering without races).
		for (const DepId of Deps) {
			if (
				!Context.ActivatedExtensions.has(DepId) &&
				!InProgress.has(DepId)
			) {
				await ActivateWithDeps(DepId, Event, Depth + 1).catch(
					(Err: unknown) => {
						CocoonDevLog(
							"ext-activate",

							`[ExtensionHostHandler] Dep activation failed ${DepId} (required by ${ExtId}): ${Err instanceof Error ? Err.message : String(Err)}`,
						);
					},
				);
			}
		}

		// Now activate the extension itself.
		await ActivateExtension(Context, ExtId, Event).catch((Err: unknown) => {
			const Msg = Err instanceof Error ? Err.message : String(Err);

			CocoonDevLog(
				"ext-activate",

				`[ExtensionHostHandler] Activation failed for ${ExtId}: ${Msg}`,
			);

			if (Err instanceof Error && Err.stack) {
				const Stack = Err.stack
					.split("\n")
					.slice(0, 10)
					.join("\n");

				CocoonDevLog(
					"ext-activate",

					`[ExtensionHostHandler] Stack for ${ExtId}:\n${Stack}`,
				);
			}
		});

		InProgress.delete(ExtId);
	};

	const ToActivate = MatchingExtensions.filter(
		(Id) => !Context.ActivatedExtensions.has(Id),
	);

	CocoonDevLog(
		"ext-activate",

		`[ExtensionHostHandler] $activateByEvent: ${ToActivate.length} new activations (${MatchingExtensions.length - ToActivate.length} already active)`,
	);

	// Await all top-level activations so the $activateByEvent response
	// is sent only after extensions have actually activated. Returning
	// early (fire-and-forget) means Mountain may dispatch language
	// provider requests before extensions are ready, causing races.
	await Promise.allSettled(
		ToActivate.map((ExtId) => ActivateWithDeps(ExtId, ActivationEvent)),
	);

	// Keep legacy event for any listeners
	Context.Emitter.emit("activateByEvent", {
		event: ActivationEvent,
		extensions: MatchingExtensions,
	});

	return {
		success: true,

		activated: ToActivate.length,
	};
};

/**
 * Handle $startExtensionHost from Mountain.
 * Signals that the extension host should begin processing.
 */
const HandleStartExtensionHost = async (
	Context: HandlerContext,

	_Parameters: any,
): Promise<any> => {
	CocoonDevLog(
		"ext-host",

		`[ExtensionHostHandler] $startExtensionHost received (registry: ${Context.ExtensionRegistry.size} extensions)`,
	);

	Context.Emitter.emit("startExtensionHost", {
		extensionCount: Context.ExtensionRegistry.size,
		ready: Context.ExtensionHostReady,
	});

	return {
		success: true,

		ready: Context.ExtensionHostReady,

		extensionCount: Context.ExtensionRegistry.size,
	};
};

export default {
	HandleInitializeExtensionHost,

	HandleDeltaExtensions,

	HandleActivateByEvent,

	HandleStartExtensionHost,
};
