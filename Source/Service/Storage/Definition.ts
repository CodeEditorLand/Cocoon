/**
 * @module Definition (Storage)
 * @description The live implementation of the Storage service factory.
 */

import { Effect, Ref } from "effect";
import { Memento } from "vscode";

import { IPC } from "../IPC.js";
import { Log } from "../Log.js";
import { MementoImplementation } from "./MementoImplementation.js";
import type { Interface } from "./Service.js";

enum MementoScope {
	GLOBAL = 0,
	WORKSPACE = 1,
}

export const Definition = Effect.gen(function* (_) {
	const IPCService = yield* _(IPC.Tag);
	const LogService = yield* _(Log.Tag);
	const MementoCache = yield* _(
		Ref.make(new Map<string, MementoImplementation>()),
	);

	// Initialize storage from the host
	const [global, workspace] = yield* _(
		IPCService.SendRequest<[object, object]>("$initializeStorage", []),
	);

	// Handler for when storage changes on the host side
	IPCService.RegisterInvokeHandler(
		"$acceptStorageAndMementoData",
		([global, workspace]) => {
			const globalCache = Ref.get(MementoCache).pipe(Effect.runSync);
			for (const [key, memento] of globalCache) {
				if (memento["Scope"] === MementoScope.GLOBAL) {
					memento.acceptValue((global as any)[key]);
				} else {
					memento.acceptValue((workspace as any)[key]);
				}
			}
			return Promise.resolve();
		},
	);

	const ServiceImplementation: Interface = {
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

			LogService.Debug(
				`Created Memento for ExtID='${ExtensionID}', Scope='${ScopeName}'`,
			);

			const memento = new MementoImplementation(
				ExtensionID,
				IsGlobal,
				IPCService,
				LogService,
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
