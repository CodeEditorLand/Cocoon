/*
 * File: Cocoon/Source/Service/Localization/Support/FetchBundle.ts
 *
 * This file contains an Effect for fetching an NLS (National Language Support)
 * JSON bundle from the host via IPC.
 */

import { Effect } from "effect";
import type { Uri } from "vscode";

import URIConverter from "../../../TypeConverter/Main/URI.js";
import type IPCService from "../../IPC/Service.js";

/**
 * Creates an Effect that requests a JSON bundle's contents from the host.
 * @param IPC The IPC service to make the request.
 * @param BundleURI The URI of the `package.nls.json` (or variant) to fetch.
 * @returns An `Effect` that resolves to the parsed JSON object, or an empty
 *   object if the file doesn't exist, is empty, or fails to parse.
 */
export default (IPC: IPCService, BundleURI: Uri) =>
	IPC.SendRequest<string | null>("$fetchBundleContents", [
		URIConverter.FromAPI(BundleURI),
	]).pipe(
		Effect.map((content) => (content ? JSON.parse(content) : {})),
		// If the bundle doesn't exist or fails to parse, we gracefully treat it as an empty object.
		Effect.catchAll(() => Effect.succeed({})),
	);
