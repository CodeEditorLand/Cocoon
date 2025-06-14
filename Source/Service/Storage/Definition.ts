/**
 * @module Definition (Storage)
 * @description The live implementation of the Storage service factory.
 */

import { Context, Effect, Ref } from "effect";

import IPCService from "../IPC/Service.js";
import LogService from "../Log/Service.js";
import MementoImplementation from "./MementoImplementation.js";

enum MementoScope {
	GLOBAL = 0,
	WORKSPACE = 1,
}

export default Effect.gen(function* (_) {
	const IPC = yield* _(IPCService);
	const Log = yield* _(LogService);
	const MementoCache = yield* _(
		Ref.make(new Map<string, MementoImplementation>()),
	);

	// Initialize storage from the host
	const [global, workspace] = yield* _(
		IPC.SendRequest<[object, object]>("$initializeStorage", []),
	);

	// Handler for when storage changes on the host side
	IPC.RegisterInvokeHandler(
		"$acceptStorageAndMementoData",
		([global, workspace]) => {
			const globalCache = Ref.get(MementoCache).pipe(Effect.runSync);
			for (const [key, memento] of globalCache) {
				if ((memento as any)["Scope"] === MementoScope.GLOBAL) {
					memento.acceptValue((global as any)[key]);
				} else {
					memento.acceptValue((workspace as any)[key]);
				}
			}
			return Promise.resolve();
		},
	);

	const ServiceImplementation: Context.Tag.Service<any> = {
		CreateMemento: (ExtensionID: string, IsGlobal: boolean) => {
			const cacheKey = `${IsGlobal ? "global" : "workspace"}:${ExtensionID}`;
			const cached = Ref.get(MementoCache).pipe(
				Effect.map((c) => c.get(cacheKey)),
				Effect.runSync,
			);
			if (cached) {
				return cached;
			}

			const ScopeName = IsGlobal ? "Global" : "WorkSpace";
			const initialValue = IsGlobal
				? (global as any)[ExtensionID]
				: (workspace as any)[ExtensionID];

			Log.Debug(
				`Created Memento for ExtID='${ExtensionID}', Scope='${ScopeName}'`,
			);

			const memento = new MementoImplementation(
				ExtensionID,
				IsGlobal,
				IPC,
				Log,
				initialValue,
			);
			Ref.update(MementoCache, (map) => map.set(cacheKey, memento)).pipe(
				Effect.runSync,
			);
			return memento;
		},
	};

	return ServiceImplementation;
});
