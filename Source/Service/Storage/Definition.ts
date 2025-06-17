/*
 * File: Cocoon/Source/Service/Storage/Definition.ts
 * Responsibility: The live implementation of the Storage service factory.
 * Modified: 2025-06-17 10:52:54 UTC
 */

/**
 * @module Definition (Storage)
 * @description The live implementation of the Storage service factory.
 */

import { Effect, Ref } from "effect";
import type { Memento } from "vscode";

import IPCService from "../IPC/Service.js";
import LogService from "../Log/Service.js";
import MementoImplementation from "./MementoImplementation.js";
import type Service from "./Service.js";

enum MementoScope {
	GLOBAL = 0,
	WORKSPACE = 1,
}

/**
 * An Effect that builds the live implementation of the Storage service factory.
 */
export default Effect.gen(function* (G) {
	const IPC = yield* G(IPCService);
	const Log = yield* G(LogService);
	const MementoCacheRef = yield* G(
		Ref.make(new Map<string, MementoImplementation>()),
	);

	// Initialize storage from the host
	const [GlobalStorage, WorkSpaceStorage] = yield* G(
		IPC.SendRequest<[object, object]>("$initializeStorage", []),
	);

	// Handler for when storage changes on the host side
	yield* G(
		Effect.sync(() =>
			IPC.RegisterInvokeHandler(
				"$acceptStorageAndMementoData",
				([GlobalData, WorkSpaceData]) =>
					Effect.runPromise(
						Effect.gen(function* (G) {
							const GlobalCache = yield* G(
								Ref.get(MementoCacheRef),
							);
							for (const [Key, Memento] of GlobalCache) {
								if (Memento.Scope === MementoScope.GLOBAL) {
									Memento.acceptValue(
										(GlobalData as any)?.[Key],
									);
								} else {
									Memento.acceptValue(
										(WorkSpaceData as any)?.[Key],
									);
								}
							}
						}),
					),
			),
		),
	);

	const StorageImplementation: Service["Type"] = {
		CreateMemento: (ExtensionID: string, IsGlobal: boolean): Memento => {
			const CacheKey = `${IsGlobal ? "global" : "workspace"}:${ExtensionID}`;
			const Cached = Effect.runSync(
				Ref.get(MementoCacheRef).pipe(
					Effect.map((Cache) => Cache.get(CacheKey)),
				),
			);
			if (Cached) {
				return Cached;
			}

			const ScopeName = IsGlobal ? "Global" : "WorkSpace";
			const InitialValue = IsGlobal
				? (GlobalStorage as any)?.[ExtensionID]
				: (WorkSpaceStorage as any)?.[ExtensionID];

			Effect.runSync(
				Log.Debug(
					`Created Memento for ExtID='${ExtensionID}', Scope='${ScopeName}'`,
				),
			);

			const Memento = new MementoImplementation(
				ExtensionID,
				IsGlobal,
				InitialValue,
				IPC,
				Log,
			);
			Effect.runSync(
				Ref.update(MementoCacheRef, (Map) =>
					Map.set(CacheKey, Memento),
				),
			);
			return Memento;
		},
	};

	return StorageImplementation;
});
