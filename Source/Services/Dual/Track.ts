/**
 * @module Services/DualTrack
 * @description
 * Progressive Rust migration backstop.
 *
 * Problem: extensions expect stock VS Code's `vscode.*` surface to be
 * complete. Mountain is growing its Rust implementation one method at a
 * time; every method Mountain doesn't yet handle returns
 * `Err("Unknown method: <x>")` and the extension breaks.
 *
 * Solution: every cross-process shim method tries Mountain first, and on
 * the "unknown method" signal falls back to a Node implementation in
 * Cocoon. Mountain's Rust handlers take precedence when they exist; when
 * they don't, Cocoon's Node code keeps the API surface working.
 *
 * As Mountain adds Rust handlers, the fallback path goes silent - no
 * Cocoon edits needed. As Cocoon authors write new shim methods, the
 * fallback-first pattern guarantees the method works even before
 * Mountain catches up. Bidirectional progressive enhancement.
 *
 * ## Flow
 *
 * ```text
 *   Extension: vscode.workspace.findTextInFiles(query, options)
 *          ↓
 *   Cocoon shim: TryMountainThenNode(
 *                  "Workspace.FindTextInFiles",
 *                  [query, options],
 *                  NodeFallback)
 *          ↓
 *   MountainClient.sendRequest("Workspace.FindTextInFiles", ...)
 *          │
 *          ├─ Mountain has handler → result returned, fallback never runs
 *          │
 *          └─ Mountain returns "Unknown method: Workspace.FindTextInFiles"
 *                 ↓
 *             IsUnknownMethodError(err) === true
 *                 ↓
 *             LogRoute("Workspace.FindTextInFiles", "node-fallback")
 *                 ↓
 *             await NodeFallback([query, options])
 *             (executes purely in Cocoon's Node - fs, child_process, etc.)
 * ```
 *
 * ## Observability
 *
 * Every dispatch emits one of three `[DEV:DUAL-TRACK]` lines:
 *
 * - `route=mountain` - Mountain handled it (hot path, fast)
 * - `route=node-fallback` - Mountain didn't; Node did (compatibility)
 * - `route=error` - both failed; original error propagated
 *
 * Grep the tag to see which methods Mountain has caught up on and which
 * are still Node-only. The distribution IS the Rust migration roadmap.
 *
 * ## When NOT to use this
 *
 * - For operations that MUST be Mountain-owned for correctness (UI
 *   prompts, window focus, native dialogs). Those should throw on
 *   Mountain failure, not silently fall back.
 * - For operations where the Node fallback would be surprising or
 *   slower by a large margin (file watching on macOS needs FSEvents
 *   which tokio-notify handles better than Node's native `fs.watch`).
 */

import {
	MountainMethods,
	RouteManifestSummary,
} from "../../Generated/RouteManifest.js";

import type { HandlerContext } from "../Handler/Handler/Context.js";

/**
 * Typed error thrown by DualTrack when a method is routed to no tier.
 * Extensions can distinguish this from runtime errors via
 * `instanceof NotImplementedError` or `err.code === "NotImplemented"`.
 * The build-time manifest (GenerateRouteManifest.sh) surfaces this set
 * so we notify the build process which APIs are still unavailable.
 */
export class NotImplementedError extends Error {

	readonly code = "NotImplemented";

	readonly _tag = "NotImplementedError";

	constructor(readonly Method: string) {
		super(
			`Method '${Method}' is not implemented in Land: no Mountain Rust handler, no stock VS Code lift, no Cocoon bespoke fallback.`,
		);

		this.name = "NotImplementedError";
	}
}

/**
 * Boot-time banner so each Cocoon spawn logs the route-manifest tier
 * coverage - makes drift visible (if a rebuild forgot to regenerate
 * the manifest, the counts stay stale and you see the same numbers
 * as the previous run).
 */
if (process.env["Trace"]) {
	process.stdout.write(
		`[DEV:DUAL-TRACK] manifest mountain=${RouteManifestSummary.mountain} stockLift=${RouteManifestSummary.stockLift} bespoke=${RouteManifestSummary.bespoke} generated=${RouteManifestSummary.generatedAt}\n`,
	);
}

/**
 * Env-controlled Rust deference. Default: defer to Mountain (Rust)
 * before falling back to Node. The knobs let the user opt OUT per-
 * method, per-domain, or globally - useful when:
 *   - Diagnosing a Mountain handler bug (force Node path for A/B).
 *   - Running the editor with Mountain features disabled (e.g. CI
 *     environments without native dialogs).
 *   - Migrating a feature surface back to JS-only temporarily.
 *
 * Priority (first match wins, evaluated per call):
 *   1. `Defer<METHOD>` (e.g. `DeferfindFiles=false`)
 *   2. `Defer<DOMAIN>` (e.g. `Defer=false`)
 *      where DOMAIN = uppercased prefix before the first `.` of the
 *      method name (e.g. `Workspace.FindFiles` → `WORKSPACE`).
 *      Methods without a `.` use the empty domain - only the global
 *      knob applies.
 *   3. `Defer=false` - global bypass.
 *   4. Default: defer (return true).
 *
 * Values: `false`, `0`, `no`, `off` → bypass Mountain. Anything else
 * (including unset) → defer.
 *
 * NOTE: this only controls dispatch in `TryMountainThenNode` /
 * `TryMountainWithEmptyFallback`. Fire-and-forget `SendToMountain(...)`
 * notifications still flow direct unless wired through Batch 2 of the
 * dual-track expansion. Reverse-RPC paths (Mountain → Cocoon) are not
 * gated - Mountain decides whether to dispatch them.
 */
const IsBypassValue = (Raw: string | undefined): boolean => {
	if (!Raw) return false;

	const Normalised = Raw.trim().toLowerCase();

	return (
		Normalised === "false" ||
		Normalised === "0" ||
		Normalised === "no" ||
		Normalised === "off"
	);
};

const ParseDomain = (Method: string): string => {
	const Dot = Method.indexOf(".");

	if (Dot <= 0) return "";

	return Method.slice(0, Dot).toUpperCase();
};

/**
 * Returns `true` when the call should defer to Mountain (the default).
 * Returns `false` when an env knob has flagged a bypass - caller should
 * skip Mountain and go straight to the Node fallback.
 */
export const IsRustDeferralEnabled = (Method: string): boolean => {
	// Per-method override wins. Method names can contain `.` and `:` -
	// neither character is valid in a POSIX env-var name, so substitute
	// to `_`.
	const MethodKey = `Defer${Method.replace(/[.:]/g, "_")}`;

	if (process.env[MethodKey] !== undefined) {
		return !IsBypassValue(process.env[MethodKey]);
	}

	// Per-domain override.
	const Domain = ParseDomain(Method);

	if (Domain) {
		const DomainKey = `Defer${Domain}`;

		if (process.env[DomainKey] !== undefined) {
			return !IsBypassValue(process.env[DomainKey]);
		}
	}

	// Global override.
	if (process.env["Defer"] !== undefined) {
		return !IsBypassValue(process.env["Defer"]);
	}

	return true;
};

// Boot-time banner: surface the active deferral state so debugging the
// "why is Mountain being skipped" question is one log line away.
if (process.env["Trace"]) {
	const ActiveBypasses = Object.keys(process.env)
		.filter((K) => K === "Defer" || K.startsWith("Defer"))
		.filter((K) => IsBypassValue(process.env[K]))
		.join(",");

	if (ActiveBypasses) {
		process.stdout.write(
			`[DEV:DUAL-TRACK] rust-deferral bypass-knobs=${ActiveBypasses}\n`,
		);
	}
}

/**
 * Shape Mountain returns when a method isn't routed:
 * - `.ok === false`, `.error.message` contains "Unknown method: <x>"
 * - Or the raw gRPC error from `MountainClient.sendRequest` has that
 *   message string.
 *
 * Accepts string, Error, and gRPC `ServiceError` shapes so every error
 * source Cocoon sees can be probed the same way.
 */
export function IsUnknownMethodError(Err: unknown): boolean {
	if (Err == null) return false;

	const Message =
		Err instanceof Error
			? Err.message
			: typeof Err === "string"
				? Err
				: typeof (Err as { message?: unknown }).message === "string"
					? (Err as { message: string }).message
					: "";

	if (!Message) return false;

	// Mountain's `CreateEffectForRequest` emits this exact prefix. Also
	// match the gRPC status message path and the variant Tracks emit for
	// method-level (vs namespace-level) misses.
	return (
		Message.includes("Unknown method:") ||
		Message.includes("Unknown IPC command") ||
		Message.includes("no handler for method") ||
		Message.includes("not routed to any domain")
	);
}

/**
 * Dual-track dispatch: Mountain first, Node fallback on "unknown method."
 *
 * - `Method` is the Mountain-side RPC method name (e.g.
 *   `"Workspace.FindTextInFiles"`). Must match a Mountain Track effect
 *   name OR be a method Mountain explicitly doesn't carry.
 * - `Arguments` is the positional arg array Mountain expects.
 * - `NodeFallback` runs in Cocoon when Mountain doesn't handle the
 *   method. Receives the same `Arguments` array. Must return the same
 *   shape the extension expects (i.e. the shape Mountain WOULD have
 *   returned).
 *
 * Errors from Mountain that are NOT "unknown method" propagate directly
 * - they represent real failures (permission denied, invalid args) that
 * the caller should handle.
 */
export async function TryMountainThenNode<T>(
	Context: HandlerContext,

	Method: string,

	Arguments: unknown[],

	NodeFallback: (Arguments: unknown[]) => Promise<T>,
): Promise<T> {
	// Env-controlled bypass: `Defer=false` (global),
	// `Defer<DOMAIN>=false` (per-domain), or
	// `Defer<METHOD>=false` (per-method) skip the
	// Mountain round-trip and run the Node fallback directly. Logged
	// distinctly so the env-toggled path is observable.
	if (!IsRustDeferralEnabled(Method)) {
		LogDualTrack(Method, "node-bypass";

		try {
			return await NodeFallback(Arguments;
		} catch (NodeErr: unknown) {
			LogDualTrack(Method, "error";

			throw NodeErr;
		}
	}

	// Build-time manifest short-circuit: skip the Mountain gRPC round-
	// trip entirely when the generated manifest says Mountain has no
	// handler for this method. Saves ~3-15 ms per call for every
	// tier-2/3 dispatch. If the manifest is stale (manifest says "no"
	// but Mountain actually gained a handler), the fallback still runs
	// correctly - the only cost is one extra fallback invocation until
	// the next `sh Maintain/Script/GenerateRouteManifest.sh` rebuild.
	if (!MountainMethods.has(Method)) {
		LogDualTrack(Method, "node-fallback";

		try {
			return await NodeFallback(Arguments;
		} catch (NodeErr: unknown) {
			// Distinguish "Cocoon's fallback failed" from "no fallback
			// exists" - the latter is the Tier-4 unavailable case.
			LogDualTrack(Method, "error";

			throw NodeErr;
		}
	}

	try {
		const MountainResult = await Context.MountainClient?.sendRequest(
			Method,

			Arguments,
		;

		LogDualTrack(Method, "mountain";

		return MountainResult as T;
	} catch (Err: unknown) {
		if (IsUnknownMethodError(Err)) {
			// Manifest drift: manifest said Mountain has it, runtime
			// says it doesn't. Fall back anyway and log so the next
			// manifest regeneration picks up the gap.
			LogDualTrack(Method, "node-fallback";

			try {
				return await NodeFallback(Arguments;
			} catch (NodeErr: unknown) {
				LogDualTrack(Method, "error";

				throw NodeErr;
			}
		}

		LogDualTrack(Method, "error";

		throw Err;
	}
}

/**
 * Variant of `TryMountainThenNode` that ALSO falls back to Node when
 * Mountain returns a "looks empty" result. Some Mountain handlers
 * succeed (no error) but legitimately return zero rows when their
 * workspace-folder state is mis-seeded or their walker hits a
 * filtered-out tree. The user-visible symptom is a search panel that
 * appears to "work" but never returns matches.
 *
 * `IsEmpty` is the caller's predicate over the Mountain return value
 * (e.g. `Array.isArray(R) && R.length === 0`). When it returns true
 * AND the Node fallback returns more results, the Node result wins.
 * Otherwise Mountain's result is preserved (avoids hiding intentional
 * empty results from queries that genuinely should be empty).
 *
 * Use this for `findFiles`, `findTextInFiles`, `extensions:getInstalled`,
 * and other dispatch points where "Mountain returned [] but Node would
 * have returned matches" is a plausible failure mode worth shadowing.
 */
export async function TryMountainWithEmptyFallback<T>(
	Context: HandlerContext,

	Method: string,

	Arguments: unknown[],

	NodeFallback: (Arguments: unknown[]) => Promise<T>,

	IsEmpty: (Result: T) => boolean,
): Promise<T> {
	// Env-controlled bypass mirrors `TryMountainThenNode`. When set,
	// skip Mountain and rely on the Node fallback directly.
	if (!IsRustDeferralEnabled(Method)) {
		LogDualTrack(Method, "node-bypass";

		try {
			return await NodeFallback(Arguments;
		} catch (NodeErr: unknown) {
			LogDualTrack(Method, "error";

			throw NodeErr;
		}
	}

	if (!MountainMethods.has(Method)) {
		LogDualTrack(Method, "node-fallback";

		try {
			return await NodeFallback(Arguments;
		} catch (NodeErr: unknown) {
			LogDualTrack(Method, "error";

			throw NodeErr;
		}
	}

	let MountainResult: T | undefined;

	let MountainSucceeded = false;

	try {
		MountainResult = (await Context.MountainClient?.sendRequest(
			Method,

			Arguments,
		)) as T;

		MountainSucceeded = true;

		LogDualTrack(Method, "mountain";
	} catch (Err: unknown) {
		if (!IsUnknownMethodError(Err)) {
			LogDualTrack(Method, "error";

			throw Err;
		}

		LogDualTrack(Method, "node-fallback";
	}

	// Empty-result guard: Mountain succeeded but the result looks empty.
	// Race the Node fallback and use whichever has more rows. Empty
	// from both is fine - we return Mountain's empty.
	if (
		MountainSucceeded &&
		MountainResult !== undefined &&
		IsEmpty(MountainResult)
	) {
		try {
			const NodeResult = await NodeFallback(Arguments;

			const NodeIsEmpty = IsEmpty(NodeResult;

			if (!NodeIsEmpty) {
				if (process.env["Trace"]) {
					process.stdout.write(
						`[DEV:DUAL-TRACK] method=${Method} route=node-shadow (mountain returned empty)\n`,
					;
				}

				return NodeResult;
			}

			return MountainResult;
		} catch {
			// Fallback errored - keep Mountain's empty result, the call
			// already "succeeded" from the extension's POV.
			return MountainResult;
		}
	}

	if (MountainSucceeded && MountainResult !== undefined) {
		return MountainResult;
	}

	// Mountain rejected with "unknown method": run the fallback.
	try {
		return await NodeFallback(Arguments;
	} catch (NodeErr: unknown) {
		LogDualTrack(Method, "error";

		throw NodeErr;
	}
}

/**
 * Tier-4 guard: call from inside a Node fallback when no meaningful
 * implementation exists. Throws `NotImplementedError` which extensions
 * can catch explicitly. The error is also logged under `[DEV:DUAL-TRACK]
 * route=unavailable` so the build process can surface the gap.
 */
export function MarkUnavailable(Method: string): never {
	LogDualTrack(Method, "unavailable";

	throw new NotImplementedError(Method;
}

/**
 * Fire-and-forget Cocoon → Mountain notification dispatcher with the
 * same env-controlled bypass as `TryMountainThenNode`. The hundreds of
 * `Context.SendToMountain("register_X_provider", payload).catch(()=>{})`
 * call sites in the namespace shims bypass DualTrack entirely - the
 * caller never sees a route log, can't be opt-out'd, and a regression
 * (Mountain panics on a payload key) silently drops every dispatch.
 *
 * `SendToMountainOrLocal(Context, Method, Payload, OnLocalFallback?)`:
 *   - If the Rust deferral knob says skip Mountain (or the manifest
 *     short-circuit fires), invoke `OnLocalFallback?.()` - a no-op
 *     by default - and log `route=node-bypass`.
 *   - Otherwise call `SendToMountain` and log `route=mountain` /
 *     `route=error` based on the promise resolution.
 *
 * Notifications never have a return value - `OnLocalFallback` is for
 * mirror state (e.g. registering a handle in a local map even when
 * Mountain is bypassed). Returns the underlying `Promise<void>` so
 * call sites that `.catch(...)` keep working.
 */
export const SendToMountainOrLocal = (
	Context: HandlerContext,

	Method: string,

	Payload: unknown,

	OnLocalFallback?: () => void,
): Promise<void> => {
	if (!IsRustDeferralEnabled(Method)) {
		LogDualTrack(Method, "node-bypass";

		try {
			OnLocalFallback?.(;
		} catch {
			// Local fallback errors must not crash the caller - same
			// fire-and-forget semantics as the underlying SendToMountain.
		}

		return Promise.resolve(;
	}

	const Send = (
		Context as unknown as {
			SendToMountain: (M: string, P: unknown) => Promise<void>;
		}
	).SendToMountain;

	return Send.call(Context, Method, Payload).then(
		() => {
			LogDualTrack(Method, "mountain";
		},

		(_Err: unknown) => {
			LogDualTrack(Method, "error";
		},
	;
};

export type DualTrackRoute =
	| "mountain"
	| "node-fallback"
	| "node-bypass"
	| "node-shadow"
	| "unavailable"
	| "error";

/**
 * Log one dispatch decision. Guarded by `Trace` so release runs
 * stay silent. Tag `[DEV:DUAL-TRACK]` is picked up by Mountain's stdout
 * tail under `[DEV:COCOON]` prefix.
 */
export const LogDualTrack = (Method: string, Route: DualTrackRoute): void => {
	if (!process.env["Trace"]) return;

	process.stdout.write(`[DEV:DUAL-TRACK] method=${Method} route=${Route}\n`;
};
