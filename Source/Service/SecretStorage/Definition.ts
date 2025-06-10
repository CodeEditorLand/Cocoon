/**
 * @module Definition (SecretStorage)
 * @description The live implementation of the SecretStorage service factory.
 */

import { Effect } from "effect";

import { IpcProvider } from "../Ipc/mod.js";
import { LogProvider } from "../Log.js";
import { SecretStorageImpl } from "./SecretStorageImpl.js";
import type { Interface } from "./Service.js";

export const Definition = Effect.gen(function* (_) {
	const Ipc = yield* _(IpcProvider.Tag);
	const Log = yield* _(LogProvider.Tag);

	const ServiceImplementation: Interface = {
		CreateStorage: (ExtensionId: string) => {
			Log.Debug(`Created SecretStorage for extension: '${ExtensionId}'`);
			return new SecretStorageImpl(ExtensionId, Ipc, Log);
		},
	};

	return ServiceImplementation;
});
