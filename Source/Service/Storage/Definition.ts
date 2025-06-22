/*
 * File: Cocoon/Source/Service/Storage/Definition.ts
 *
 * This file contains the refactored, high-performance live implementation of the Storage
 * service factory. It fetches all storage data on init, caches it locally, provides
 * a fast in-memory Memento proxy, and batches all writes to the host.
 */

import { Effect, Layer, Ref, Schedule } from "effect";
import { Emitter, type Memento } from "vscode";

import IPCService from "../IPC/Service.js";
import LogService from "../Log/Service.js";
import type Service from "./Service.js";

const DebounceMilliseconds = 1000;

/**
 * A proxy implementation of the `vscode.Memento` interface.
 * It provides a synchronous, in-memory cache for fast reads and debounced,
 * batched writes to the host process for performance.
 */
class MementoProxyImplementation implements Memento {
	private readonly OnDidChangeEmitter = new Emitter<{
		readonly keys: readonly string[];
	}>();
	public readonly onDidChange = this.OnDidChangeEmitter.event;

	constructor(
		private readonly StateRef: Ref.Ref<Record<string, any>>,
		private readonly MarkAsDirty: () => void,
	) {}

	public get<T>(key: string): T | undefined;
	public get<T>(key: string, defaultValue: T): T;
	public get<T>(key: string, defaultValue?: T): T | undefined {
		const State = Ref.unsafeGet(this.StateRef);
		const Value = State[key];
		return Value !== undefined ? Value : defaultValue;
	}

	public keys(): readonly string[] {
		const State = Ref.unsafeGet(this.StateRef);
		return Object.keys(State);
	}

	public update(key: string, value: any): Promise<void> {
		const UpdateEffect = Ref.update(this.StateRef, (CurrentState) => {
			const NewState = { ...CurrentState };
			if (value === undefined) {
				delete NewState[key];
			} else {
				NewState[key] = value;
			}
			return NewState;
		}).pipe(
			Effect.tap(() =>
				Effect.sync(() =>
					this.OnDidChangeEmitter.fire({ keys: [key] }),
				),
			),
			Effect.tap(() => Effect.sync(this.MarkAsDirty)),
			Effect.asVoid,
		);
		return Effect.runPromise(UpdateEffect);
	}

	public get whenReady(): Promise<void> {
		// Memento is always ready due to eager init.
		return Promise.resolve();
	}
}

/**
 * An Effect that builds the live implementation of the Storage service factory.
 */
export default Effect.gen(function* (G) {
	const IPC = yield* G(IPCService);
	const Log = yield* G(LogService);

	// Fetch ALL initial storage data at once during service creation.
	const [InitialGlobalStorage, InitialWorkspaceStorage] = yield* G(
		Effect.all([
			IPC.SendRequest<Record<string, any>>("$storage:getAll", [true]),
			IPC.SendRequest<Record<string, any>>("$storage:getAll", [false]),
		]),
	);

	const GlobalStorageRef = yield* G(Ref.make(InitialGlobalStorage));
	const WorkspaceStorageRef = yield* G(Ref.make(InitialWorkspaceStorage));
	const IsGlobalDirty = yield* G(Ref.make(false));
	const IsWorkspaceDirty = yield* G(Ref.make(false));

	// Define the debounced persistence effect.
	const PersistChangesEffect = Effect.gen(function* (G) {
		const [IsGlobalDirtyValue, IsWorkspaceDirtyValue] = yield* G(
			Effect.all([Ref.get(IsGlobalDirty), Ref.get(IsWorkspaceDirty)]),
		);
		const PersistenceEffects: Effect.Effect<void, any>[] = [];
		if (IsGlobalDirtyValue) {
			const CurrentState = yield* G(Ref.get(GlobalStorageRef));
			PersistenceEffects.push(
				IPC.SendNotification("$storage:setAll", [true, CurrentState]),
			);
			yield* G(Ref.set(IsGlobalDirty, false));
		}
		if (IsWorkspaceDirtyValue) {
			const CurrentState = yield* G(Ref.get(WorkspaceStorageRef));
			PersistenceEffects.push(
				IPC.SendNotification("$storage:setAll", [false, CurrentState]),
			);
			yield* G(Ref.set(IsWorkspaceDirty, false));
		}
		if (PersistenceEffects.length > 0) {
			yield* G(Log.Debug("Persisting Memento state to host..."));
			yield* G(
				Effect.all(PersistenceEffects, {
					discard: true,
					concurrency: "unbounded",
				}),
			);
		}
	}).pipe(
		Effect.catchAll((Error) =>
			Log.Error("Failed to persist Memento state.", Error),
		),
	);

	// Fork the debounced loop as a daemon that runs for the lifetime of the service.
	yield* G(
		Effect.forkDaemon(
			PersistChangesEffect.pipe(
				Effect.repeat(
					Schedule.spaced(`${DebounceMilliseconds} millis`),
				),
			),
		),
	);

	// Define the service implementation (the Memento factory).
	const StorageImplementation: Service["Type"] = {
		CreateMemento: (ExtensionID: string, IsGlobal: boolean): Memento => {
			const RootStateRef = IsGlobal
				? GlobalStorageRef
				: WorkspaceStorageRef;
			const ExtensionState =
				(Ref.unsafeGet(RootStateRef) as any)[ExtensionID] ?? {};
			const ExtensionStateRef = Ref.unsafeMake(ExtensionState);
			const MarkAsDirtyCallback = () => {
				const DirtyFlagRef = IsGlobal
					? IsGlobalDirty
					: IsWorkspaceDirty;
				// Mark scope as dirty.
				Ref.unsafeSet(DirtyFlagRef, true);
				// Immediately update the root cache with the changed extension state.
				Ref.unsafeUpdate(RootStateRef, (CurrentRoot) => ({
					...CurrentRoot,
					[ExtensionID]: Ref.unsafeGet(ExtensionStateRef),
				}));
			};
			return new MementoProxyImplementation(
				ExtensionStateRef,
				MarkAsDirtyCallback,
			);
		},
	};

	return StorageImplementation;
});
