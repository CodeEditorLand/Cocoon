/**
 * @module Definition (SecretStorage)
 * @description The live implementation of the SecretStorage service factory.
 */

import { Effect } from "effect";

import { IPC } from "../IPC.js";
import { Log } from "../Log.js";
import { SecretStorageImplementation } from "./SecretStorageImplementation.js";
import type { Interface } from "./Service.js";

export const Definition = Effect.gen(function* (_) {
	const IPCService = yield* _(IPC.Tag);
	const LogService = yield* _(Log.Tag);

	const ServiceImplementation: Interface = {
		CreateStorage: (ExtensionID: string) => {
			LogService.Debug(
				`Created SecretStorage for extension: '${ExtensionID}'`,
			);
			return new SecretStorageImplementation(
				ExtensionID,
				IPCService,
				LogService,
			);
		},
	};

	return ServiceImplementation;
});
