/**
 * @module Handler/VscodeAPI/StockLift
 * @description
 * Thin adapters that lift **stock VS Code source** (as bundled by
 * Output's `@codeeditorland/output/Target/Microsoft/VSCode/vs/…` export map) and expose it with
 * a signature convenient for Cocoon's shim namespaces.
 *
 * This is the third tier in the fallback hierarchy:
 *
 *   1. Mountain (Rust)                         - fast, progressive
 *   2. Stock VS Code (Node, lifted from Output) - correct, battle-tested, free
 *   3. Cocoon bespoke (Node)                    - last resort, hand-rolled
 *
 * The goal is to write as little tier-3 code as possible. For every
 * `workspace.*`, `window.*`, `debug.*` method, if stock VS Code already
 * implements the logic as a pure function (no `MainContext.$x(…)` proxy
 * calls), import it here and expose it with a Cocoon-friendly wrapper.
 *
 * What's safe to lift today:
 *
 *   - `vs/base/common/resources.ts` URI/path operations
 *   - `vs/base/common/glob.ts`      glob pattern matching
 *   - `vs/base/common/strings.ts`   string helpers
 *   - `vs/base/common/uri.ts`       URI class + parse
 *   - `vs/base/common/buffer.ts`    VSBuffer manipulation
 *   - `vs/workbench/api/common/extHostTypes.ts` Range, Position, Selection, etc.
 *   - `vs/editor/common/core/range.ts` range math
 *
 * What NOT to lift into this module:
 *
 *   - `vs/workbench/api/common/extHost<Namespace>.ts` (e.g.
 *     extHostWorkspace.ts) - those files call `this._proxy.$x(…)` into
 *     `MainContext.MainThread<Namespace>Shape`. Running them standalone
 *     requires an RPCProtocol bootstrap (the full-lift project). When
 *     that lands, this StockLift module becomes redundant for those
 *     namespaces. Until then, each ExtHost call that needs proxy state
 *     belongs in a bespoke tier-3 fallback.
 *
 * Every export here is a pure function or class that takes concrete
 * arguments and returns a concrete value - no hidden DI, no async host
 * calls, no stateful singletons created on import.
 */

import {
	isEmptyPattern as StockGlobIsEmpty,
	match as StockGlobMatch,
	parse as StockGlobParse,
} from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/glob.js";

import {
	basename as StockBasename,
	dirname as StockDirname,
	extname as StockExtname,
	isEqualOrParent as StockIsEqualOrParent,
	joinPath as StockJoinPath,
	relativePath as StockRelativePath,
} from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/resources.js";

import { URI } from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/uri.js";

/**
 * Normalise any URI-shape Cocoon sees (real `Uri` instance, URI-like
 * object, plain string) into a stock VS Code `URI`. Stock functions
 * operate on `URI` instances; extensions pass us whatever they have.
 *
 * Returns `undefined` when the input can't be converted (avoids throwing
 * during a fallback that already has a safe no-op return).
 */
export function ToUri(Input: unknown): URI | undefined {

	if (Input == null) return undefined;

	if (Input instanceof URI) return Input;

	if (typeof Input === "string") {
		// Empty string short-circuits BEFORE any `URI.parse` /
		// `URI.file` call. Stock VS Code's `URI.parse("")` throws
		// `[UriError]: Scheme contains illegal characters. (len:0)` -
		// reported in the log as the activation failure for the Ruby
		// LSP extension, which calls into `vscode.workspace.workspace
		// FoldersChanged` with an empty `uri` field on some shells.
		// Returning `undefined` lets callers fall through to their
		// no-op branch instead of crashing the extension on
		// initialisation.
		if (Input.length === 0) return undefined;

		try {
			if (Input.startsWith("file:") || Input.includes("://")) {
				return URI.parse(Input);
			}

			return URI.file(Input);
		} catch {
			return undefined;
		}
	}

	const WithScheme = Input as {
		scheme?: unknown;

		authority?: unknown;

		path?: unknown;

		query?: unknown;

		fragment?: unknown;
	};

	if (typeof WithScheme.scheme === "string") {
		try {
			return URI.from({
				scheme: WithScheme.scheme,
				authority:
					typeof WithScheme.authority === "string"
						? WithScheme.authority
						: "",
				path:
					typeof WithScheme.path === "string" ? WithScheme.path : "",
				query:
					typeof WithScheme.query === "string"
						? WithScheme.query
						: "",
				fragment:
					typeof WithScheme.fragment === "string"
						? WithScheme.fragment
						: "",
			});
		} catch {
			return undefined;
		}
	}

	return undefined;
}

/**
 * Stock `relativePath(from, to)` - computes the relative path from
 * `from` to `to`, honouring URI semantics (Windows casing, authority
 * comparison, trailing slashes). Returns `undefined` when `to` isn't a
 * descendant of `from`.
 */
export function RelativePath(From: unknown, To: unknown): string | undefined {

	const FromUri = ToUri(From);

	const ToUriValue = ToUri(To);

	if (!FromUri || !ToUriValue) return undefined;

	return StockRelativePath(FromUri, ToUriValue);
}

/**
 * Stock `isEqualOrParent(resource, candidate)` - returns true when
 * `resource` is the same as `candidate` OR a descendant. The correct
 * primitive for "which workspace folder contains this URI?" lookups
 * that Cocoon's hand-rolled `.startsWith()` prefix check was
 * approximating.
 */
export function IsEqualOrParent(
	Resource: unknown,

	Candidate: unknown,
): boolean {

	const R = ToUri(Resource);

	const C = ToUri(Candidate);

	if (!R || !C) return false;

	return StockIsEqualOrParent(R, C);
}

/**
 * Stock URI path helpers, exposed with unknown-input tolerance for
 * Cocoon's shim boundary. All delegate to the stock VS Code
 * implementations.
 */
export function Basename(Resource: unknown): string {

	const U = ToUri(Resource);

	return U ? StockBasename(U) : "";
}

export function Dirname(Resource: unknown): URI | undefined {

	const U = ToUri(Resource);

	return U ? StockDirname(U) : undefined;
}

export function Extname(Resource: unknown): string {

	const U = ToUri(Resource);

	return U ? StockExtname(U) : "";
}

export function JoinPath(
	Resource: unknown,
	...Parts: string[]
): URI | undefined {

	const U = ToUri(Resource);

	return U ? StockJoinPath(U, ...Parts) : undefined;
}

/**
 * Re-export the stock `URI` class so callers can do
 * `new StockLift.Uri.file(...)` without having to chase the import
 * path themselves.
 */
export { URI as Uri };

/**
 * Glob matching lifted from `vs/base/common/glob.js`. Used by
 * `FindFilesLocal`, `FindTextInFilesFallback`, and anywhere else that
 * needs VS Code's specific glob semantics (e.g. `**` only spans path
 * segments when followed by `/`, brace expansion `{a,b}`, negation with
 * `!`). Keeps `FindFilesLocal` behaviour aligned with stock ripgrep's
 * include/exclude evaluation when Mountain eventually serves the
 * search-backend call.
 *
 * `Match(pattern, path)` - one-off test. Returns true if `path` matches
 * the glob `pattern`. Accepts string globs AND `IRelativePattern`
 * `{ base, pattern }` shapes (extension-standard).
 *
 * `ParsePattern(pattern)` - returns a compiled matcher function for
 * hot loops (file-enumeration phases that check thousands of paths).
 * Prefer this over `Match` when the same pattern is tested repeatedly.
 */
export function GlobMatch(
	Pattern: string | { base: string; pattern: string },

	Path: string,
): boolean {

	return StockGlobMatch(Pattern as any, Path);
}

export function GlobParsePattern(
	Pattern: string | { base: string; pattern: string },
): (Path: string) => boolean {

	return StockGlobParse(Pattern as any) as unknown as (
		Path: string,
	) => boolean;
}

export function GlobIsEmpty(
	Pattern: string | { base: string; pattern: string },
): boolean {

	return StockGlobIsEmpty(Pattern as any);
}
