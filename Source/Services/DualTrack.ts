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

import type { HandlerContext } from "../Services/Handler/HandlerContext.js";
import {
	MountainMethods,
	RouteManifestSummary,
} from "../Generated/RouteManifest.js";

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
if (process.env["LAND_DEV_LOG"]) {
	process.stdout.write(
		`[DEV:DUAL-TRACK] manifest mountain=${RouteManifestSummary.mountain} stockLift=${RouteManifestSummary.stockLift} bespoke=${RouteManifestSummary.bespoke} generated=${RouteManifestSummary.generatedAt}\n`,
	);
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
	// Build-time manifest short-circuit: skip the Mountain gRPC round-
	// trip entirely when the generated manifest says Mountain has no
	// handler for this method. Saves ~3-15 ms per call for every
	// tier-2/3 dispatch. If the manifest is stale (manifest says "no"
	// but Mountain actually gained a handler), the fallback still runs
	// correctly - the only cost is one extra fallback invocation until
	// the next `sh Maintain/Script/GenerateRouteManifest.sh` rebuild.
	if (!MountainMethods.has(Method)) {
		LogDualTrack(Method, "node-fallback");
		try {
			return await NodeFallback(Arguments);
		} catch (NodeErr: unknown) {
			// Distinguish "Cocoon's fallback failed" from "no fallback
			// exists" - the latter is the Tier-4 unavailable case.
			LogDualTrack(Method, "error");
			throw NodeErr;
		}
	}

	try {
		const MountainResult = await Context.MountainClient?.sendRequest(
			Method,
			Arguments,
		);
		LogDualTrack(Method, "mountain");
		return MountainResult as T;
	} catch (Err: unknown) {
		if (IsUnknownMethodError(Err)) {
			// Manifest drift: manifest said Mountain has it, runtime
			// says it doesn't. Fall back anyway and log so the next
			// manifest regeneration picks up the gap.
			LogDualTrack(Method, "node-fallback");
			try {
				return await NodeFallback(Arguments);
			} catch (NodeErr: unknown) {
				LogDualTrack(Method, "error");
				throw NodeErr;
			}
		}
		LogDualTrack(Method, "error");
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
	if (!MountainMethods.has(Method)) {
		LogDualTrack(Method, "node-fallback");
		try {
			return await NodeFallback(Arguments);
		} catch (NodeErr: unknown) {
			LogDualTrack(Method, "error");
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
		LogDualTrack(Method, "mountain");
	} catch (Err: unknown) {
		if (!IsUnknownMethodError(Err)) {
			LogDualTrack(Method, "error");
			throw Err;
		}
		LogDualTrack(Method, "node-fallback");
	}

	// Empty-result guard: Mountain succeeded but the result looks empty.
	// Race the Node fallback and use whichever has more rows. Empty
	// from both is fine - we return Mountain's empty.
	if (MountainSucceeded && MountainResult !== undefined && IsEmpty(MountainResult)) {
		try {
			const NodeResult = await NodeFallback(Arguments);
			const NodeIsEmpty = IsEmpty(NodeResult);
			if (!NodeIsEmpty) {
				if (process.env["LAND_DEV_LOG"]) {
					process.stdout.write(
						`[DEV:DUAL-TRACK] method=${Method} route=node-shadow (mountain returned empty)\n`,
					);
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
		return await NodeFallback(Arguments);
	} catch (NodeErr: unknown) {
		LogDualTrack(Method, "error");
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
	LogDualTrack(Method, "unavailable");
	throw new NotImplementedError(Method);
}

export type DualTrackRoute =
	| "mountain"
	| "node-fallback"
	| "unavailable"
	| "error";

/**
 * Log one dispatch decision. Guarded by `LAND_DEV_LOG` so release runs
 * stay silent. Tag `[DEV:DUAL-TRACK]` is picked up by Mountain's stdout
 * tail under `[DEV:COCOON]` prefix.
 */
export const LogDualTrack = (Method: string, Route: DualTrackRoute): void => {
	if (!process.env["LAND_DEV_LOG"]) return;
	process.stdout.write(
		`[DEV:DUAL-TRACK] method=${Method} route=${Route}\n`,
	);
};
