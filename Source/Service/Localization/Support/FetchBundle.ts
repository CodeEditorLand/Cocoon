/**
 * @module FetchBundle (Localization/Support)
 * @description An Effect for fetching an NLS (National Language Support)
 * JSON bundle from the host via IPC.
 */

import { Effect } from "effect";
import type { Uri } from "vscode";

import * as TypeConverter from "../../../TypeConverter.js";
import type { IPC } from "../../IPC.js";

/**
 * Creates an Effect that requests a JSON bundle's contents from the host.
 * @param IPCService The IPC service to make the request.
 * @param BundleURI The URI of the `package.nls.json` (or variant) to fetch.
 * @returns An `Effect` that resolves to the parsed JSON object, or an empty
 *   object if the file doesn't exist, is empty, or fails to parse.
 */
export function FetchBundle(IPCService: IPC.Interface, BundleURI: Uri) {
	return IPCService.SendRequest<string | null>("$fetchBundleContents", [
		TypeConverter.URIConverter.FromAPI(BundleURI),
	]).pipe(
		Effect.map((content) => (content ? JSON.parse(content) : {})),
		// If the bundle doesn't exist or fails to parse, we gracefully treat it as an empty object.
		Effect.catchAll(() => Effect.succeed({})),
	);
}
