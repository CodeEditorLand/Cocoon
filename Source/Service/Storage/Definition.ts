/**
 * @module Definition (Storage)
 * @description The live implementation of the Storage service factory.
 */

import { Effect } from "effect";

import { IPCProvider } from "../IPC.js";
import { LogProvider } from "../Log.js";
import { MementoImpl } from "./MementoImpl.js";
import type { Interface } from "./Service.js";

export const Definition = Effect.gen(function* (_) {
	const IPC = yield* _(IPCProvider.Tag);
	const Log = yield* _(LogProvider.Tag);

	const ServiceImplementation: Interface = {
		CreateMemento: (ExtensionId: string, IsGlobal: boolean) => {
			const ScopeName = IsGlobal ? "Global" : "WorkSpace";
			Log.Debug(
				`Created Memento for ExtId='${ExtensionId}', Scope='${ScopeName}'`,
			);
			return new MementoImpl(ExtensionId, IsGlobal, IPC, Log);
		},
	};

	return ServiceImplementation;
});
