/*
 * File: Cocoon/Source/Service/Storage/Definition.ts
 * Responsibility: 
 * Modified: 2025-06-16 14:00:34 UTC
 * Dependency: ../IPC/Service.js, ../Log/Service.js, ./MementoImplementation.js, ./Service.js, effect, vscode
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
export default Effect.gen(function* () {
	const IPC = yield* IPCService;
	const Log = yield* LogService;
	const MementoCache = yield* Ref.make(
		new Map<string, MementoImplementation>(),
	);

	// Initialize storage from the host
	const [Global, WorkSpace] = yield* IPC.SendRequest<[object, object]>(
		"$initializeStorage",
		[],
	);

	// Handler for when storage changes on the host side
	yield* Effect.sync(() =>
		IPC.RegisterInvokeHandler(
			"$acceptStorageAndMementoData",
			([GlobalData, WorkSpaceData]) => {
				const UpdateEffect = Effect.gen(function* () {
					const GlobalCache = yield* Ref.get(MementoCache);
					for (const [Key, Memento] of GlobalCache) {
						if ((Memento )["Scope"] === MementoScope.GLOBAL) {
							Memento.acceptValue((GlobalData )[Key]);
						} else {
							Memento.acceptValue((WorkSpaceData )[Key]);
						}
					}
				});
				return Effect.runPromise(UpdateEffect);
			},
		),
	);

	const StorageImplementation: Service["Type"] = {
		CreateMemento: (ExtensionID: string, IsGlobal: boolean): Memento => {
			const CacheKey = `${IsGlobal ? "global" : "workspace"}:${ExtensionID}`;
			const Cached = Effect.runSync(
				Ref.get(MementoCache).pipe(
					Effect.map((Cache) => Cache.get(CacheKey)),
				),
			);
			if (Cached) {
				return Cached;
			}

			const ScopeName = IsGlobal ? "Global" : "WorkSpace";
			const InitialValue = IsGlobal
				? (Global )[ExtensionID]
				: (WorkSpace )[ExtensionID];

			Effect.runSync(
				Log.Debug(
					`Created Memento for ExtID='${ExtensionID}', Scope='${ScopeName}'`,
				),
			);

			const Memento = new MementoImplementation(
				ExtensionID,
				IsGlobal,
				InitialValue,
			);
			Effect.runSync(
				Ref.update(MementoCache, (Map) => Map.set(CacheKey, Memento)),
			);
			return Memento;
		},
	};

	return StorageImplementation;
});
