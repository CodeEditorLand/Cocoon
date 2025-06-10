/**
 * @module FetchBundle (Localization/Support)
 * @description An Effect for fetching an NLS bundle from the host.
 */

import { Effect } from "effect";
import type { Uri } from "vscode";

import * as TypeConverter from "../../../TypeConverter/mod.js";
import type { Ipc } from "../../Ipc/mod.js";

export const FetchBundleEffect = (IpcService: Ipc.Interface, BundleUri: Uri) =>
	IpcService.SendRequest<string | null>("$fetchBundleContents", [
		TypeConverter.Uri.fromApi(BundleUri),
	]).pipe(
		Effect.map((content) => (content ? JSON.parse(content) : {})),
		// If the bundle doesn't exist or fails to parse, we treat it as an empty object.
		Effect.catchAll(() => Effect.succeed({})),
	);
