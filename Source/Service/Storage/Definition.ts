/**
 * @module Definition (Storage)
 * @description The live implementation of the Storage service factory.
 */

import { Effect } from "effect";

import { IpcProvider } from "../Ipc.js";
import { LogProvider } from "../Log.js";
import { MementoImpl } from "./MementoImpl.js";
import type { Interface } from "./Service.js";

export const Definition = Effect.gen(function* (_) {
	const Ipc = yield* _(IpcProvider.Tag);
	const Log = yield* _(LogProvider.Tag);

	const ServiceImplementation: Interface = {
		CreateMemento: (ExtensionId: string, IsGlobal: boolean) => {
			const ScopeName = IsGlobal ? "Global" : "Workspace";
			Log.Debug(
				`Created Memento for ExtId='${ExtensionId}', Scope='${ScopeName}'`,
			);
			return new MementoImpl(ExtensionId, IsGlobal, Ipc, Log);
		},
	};

	return ServiceImplementation;
});
