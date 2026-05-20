/**
 * @module Handler/VscodeAPI/Languages/UriKey
 *
 * Serialise a URI value (real VS Code URI instance, POJO, or string) to a
 * stable string key suitable for use in diagnostic collection Maps.
 *
 * Without this, POJO URIs collapse to `"[object Object]"` under `String(uri)`
 * and every diagnostic collection entry collides, silently merging errors
 * across files.
 */

import { ToUri as StockToUri } from "../Stock/Lift.js";

/**
 * Derive a stable string key from any URI-shaped value.
 * Priority: real URI → scheme+path → fsPath → String().
 */
export const UriKey = (Value: unknown): string => {
	if (Value == null) return "";
	if (typeof Value === "string") return Value;

	const Hydrated = StockToUri(Value);
	if (Hydrated) return Hydrated.toString();

	const Rendered = String(Value);
	if (Rendered && Rendered !== "[object Object]") return Rendered;

	const WithParts = Value as {
		scheme?: unknown;
		path?: unknown;
		fsPath?: unknown;
	};

	if (
		typeof WithParts.scheme === "string" &&
		typeof WithParts.path === "string"
	) {
		return `${WithParts.scheme}://${WithParts.path}`;
	}

	if (typeof WithParts.fsPath === "string")
		return `file://${WithParts.fsPath}`;

	return Rendered;
};
