/**
 * @module Definition (SecretStorage)
 * @description The live implementation of the SecretStorage service factory.
 */

import { Context, Effect } from "effect";

import IPCService from "../IPC/Service.js";
import LogService from "../Log/Service.js";
import SecretStorageImplementation from "./SecretStorageImplementation.js";

export default Effect.gen(function* (_) {
	const IPC = yield* _(IPCService);
	const Log = yield* _(LogService);

	const ServiceImplementation: Context.Tag.Service<any> = {
		CreateStorage: (ExtensionID: string) => {
			Log.Debug(`Created SecretStorage for extension: '${ExtensionID}'`);
			return new SecretStorageImplementation(ExtensionID, IPC, Log);
		},
	};

	return ServiceImplementation;
});
