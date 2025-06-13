/**
 * @module Definition (SecretStorage)
 * @description The live implementation of the SecretStorage service factory.
 */

import { Effect } from "effect";

import { IPCProvider } from "../IPC.js";
import { LogProvider } from "../Log.js";
import { SecretStorageImpl } from "./SecretStorageImpl.js";
import type { Interface } from "./Service.js";

export const Definition = Effect.gen(function* (_) {
	const IPC = yield* _(IPCProvider.Tag);
	const Log = yield* _(LogProvider.Tag);

	const ServiceImplementation: Interface = {
		CreateStorage: (ExtensionId: string) => {
			Log.Debug(`Created SecretStorage for extension: '${ExtensionId}'`);
			return new SecretStorageImpl(ExtensionId, IPC, Log);
		},
	};

	return ServiceImplementation;
});
