/**
 * @module Handler/VscodeAPI/WorkspaceNamespace/FileSystemRoute
 * @description
 * Tier-gated routing decision for `vscode.workspace.fs.*` operations.
 *
 * Stock VS Code splits filesystem calls between `DiskFileSystemProvider`
 * (in-process, native `fs.promises`) and `MainThreadFileSystemShape`
 * (MessagePort → main process). Cocoon is a Node subprocess that OWNS
 * an fs.promises backend, so for plain `file://` URIs with no custom
 * provider we can skip Mountain entirely.
 *
 * The decision is controlled by `Tier.FileSystem` (from `.env.Land`,
 * mirrored into esbuild via `__LandTier_FileSystem__`) so operators can
 * flip the whole policy without code changes:
 *
 * | Tier.FileSystem | Backend preference | When to use                     |
 * |-----------------|--------------------|---------------------------------|
 * | `Layer2`        | always Mountain    | debug-mountain-only profile;    |
 * |                 |                    | forces every op through the gRPC|
 * |                 |                    | effect even for plain `file://` |
 * | `Layer3`        | auto (default)     | scheme + custom-provider aware; |
 * |                 |                    | native for `file://` w/o claim, |
 * |                 |                    | Mountain for everything else    |
 * | `Layer4`        | always native      | Cocoon-local-first; aggressive  |
 * |                 |                    | for `file://` + custom-claim    |
 * |                 |                    | still Mountain (can't bypass    |
 * |                 |                    | an extension-registered provider)|
 *
 * Pure function, no side effects beyond reading `Tier.FileSystem` +
 * `ClaimedFileSystemSchemes` (mutated when extensions register custom
 * FS providers in `Providers.ts`).
 *
 * Tier B (local + notify) is the business of individual operations
 * (`applyEdit`, `saveAll`) - not a routing decision here.
 */

import Tier from "../../../../../../../Utility/Tier.js";
import { ClaimedFileSystemSchemes } from "../../Providers.js";

export type FileSystemRoute = "native" | "mountain";

/**
 * Extract the scheme from any URI-shape Cocoon sees at the shim boundary.
 *
 * - Real `vscode.Uri` instance: `.scheme`
 * - URI-like object: `.scheme` property
 * - Plain string like `"file:///<home>/foo"`: parse up to the first `:`
 * - Plain filesystem path (`/<home>/foo`): implicit `"file"`
 */
export function ExtractScheme(Uri: unknown): string {
	if (Uri && typeof Uri === "object") {
		const WithScheme = Uri as { scheme?: unknown };

		if (
			typeof WithScheme.scheme === "string" &&
			WithScheme.scheme.length > 0
		) {
			return WithScheme.scheme;
		}
	}

	if (typeof Uri === "string") {
		const Colon = Uri.indexOf(":";

		if (Colon > 0 && Colon < 32) {
			const Scheme = Uri.slice(0, Colon;

			// Accept only ASCII identifier-like schemes; anything else is
			// a bare path with a colon (Windows drive letters).
			if (/^[a-zA-Z][a-zA-Z0-9+\-.]*$/.test(Scheme)) {
				return Scheme.toLowerCase(;
			}
		}

		return "file";
	}

	return "file";
}

/**
 * Extract a filesystem-native path from the URI, ready to hand to
 * `fs.promises.*`. Returns `undefined` when the URI can't be resolved to
 * an in-process path (non-`file` scheme, missing `.fsPath`, or a custom
 * scheme Mountain has to resolve). Callers must check this BEFORE
 * assuming tier A - a missing `fsPath` on a `file` URI still forces
 * Mountain routing.
 */
export function ExtractFsPath(Uri: unknown): string | undefined {
	if (Uri && typeof Uri === "object") {
		const WithPath = Uri as { fsPath?: unknown; path?: unknown };

		if (typeof WithPath.fsPath === "string" && WithPath.fsPath.length > 0) {
			return WithPath.fsPath;
		}

		if (typeof WithPath.path === "string" && WithPath.path.length > 0) {
			return WithPath.path;
		}
	}

	if (typeof Uri === "string") {
		if (Uri.startsWith("file://")) {
			// Strip `file://` and decode any percent-encoded chars.
			try {
				return decodeURIComponent(Uri.slice("file://".length);
			} catch {
				return Uri.slice("file://".length;
			}
		}

		if (Uri.startsWith("/")) return Uri;
	}

	return undefined;
}

/**
 * Pick the backend tier for a filesystem operation.
 *
 * The decision consults `Tier.FileSystem` before the scheme/provider
 * heuristics:
 *
 *   - `Layer2` short-circuits to `"mountain"` unconditionally; used by
 *     the `debug-mountain-only` profile where Cocoon local fs is
 *     intentionally out of scope.
 *   - `Layer4` prefers `"native"` wherever safely resolvable, including
 *     file URIs without an fsPath (synthesised from `.path`). Still
 *     yields to Mountain when an extension has claimed the scheme -
 *     bypassing a custom provider would silently break the extension.
 *   - `Layer3` (default) runs the scheme/provider decision tree:
 *     `file://` with no claim → native, everything else → mountain.
 *
 * Decision is entirely local (no Mountain call). The custom-scheme set
 * is a `Set<string>` mutated by register/unregister; membership lookup
 * is O(1).
 */
export function Route(Uri: unknown): FileSystemRoute {
	const Scheme = ExtractScheme(Uri;

	// Tier override: Layer2 = always Mountain, Layer4 = always native
	// when possible. Custom-provider claims on `file` OUTRANK Layer4
	// because skipping a registered provider is a correctness bug, not
	// a performance choice.
	if (Tier.FileSystem === "Layer2") return "mountain";

	// Mountain-owned schemes: `vscode-userdata`, `vscode-remote`,
	// `vscode-managed-remote`, `vscode-file` (the renderer's own path),
	// plus any scheme an extension claimed via
	// `workspace.registerFileSystemProvider`.
	if (Scheme !== "file") return "mountain";

	if (ClaimedFileSystemSchemes.has("file")) return "mountain";

	if (Tier.FileSystem === "Layer4") {
		// Prefer native even if fsPath extraction would normally fail;
		// ExtractFsPath also accepts `.path` as a synthesised filesystem
		// path. Last-resort fallback to Mountain if even that is empty.
		return ExtractFsPath(Uri) !== undefined ? "native" : "mountain";
	}

	// Layer3 (default): native fs.promises is safe only when we can
	// resolve the URI to a real path. A `file://` URI without a usable
	// fsPath is treated as Mountain's problem so we don't synthesise a
	// wrong path.
	return ExtractFsPath(Uri) !== undefined ? "native" : "mountain";
}
