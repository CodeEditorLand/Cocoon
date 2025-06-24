/*
 * File: Cocoon/Source/Service/SecretStorage/Definition.ts
 *
 * This file contains the live implementation of the SecretStorage service factory.
 */

import { Effect } from "effect";

import IPCService from "../IPC/Service.js";
import LogService from "../Log/Service.js";
import SecretStorageImplementation from "./SecretStorageImplementation.js";
import type Service from "./Service.js";

/**
 * An Effect that builds the live implementation of the SecretStorage service factory.
 */
export default Effect.gen(function* (G) {
	const IPC = yield* G(IPCService);
	const Log = yield* G(LogService);

	const SecretStorageFactoryImplementation: Service = {
		CreateStorage: (ExtensionID: string) => {
			Effect.runSync(
				Log.Debug(
					`Created SecretStorage for extension: '${ExtensionID}'`,
				),
			);
			return new SecretStorageImplementation(ExtensionID, IPC, Log);
		},
	};

	return SecretStorageFactoryImplementation;
});
