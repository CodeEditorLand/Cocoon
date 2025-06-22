/*
 * File: Cocoon/Source/Service/Storage/Definition.ts
 * Role: The refactored, high-performance live implementation of the Storage service factory.
 * Responsibilities:
 *   1. Fetches all storage data from the host process upon initialization.
 *   2. Caches all memento data locally in memory using Effect `Ref`s.
 *   3. Provides a `Memento` proxy implementation that operates on the local cache for
 *      instantaneous reads (`get`, `keys`).
 *   4. Batches and debounces all write operations (`update`), persisting the entire
 *      state of a dirty scope to the host in a single IPC call.
 *   5. Manages this persistence in a background fiber for the lifetime of the service.
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
		// This is a synchronous, unsafe (but safe in this context) read from the local cache.
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
		// Since we initialize storage eagerly, the memento is always ready.
		return Promise.resolve();
	}
}

/**
 * An Effect that builds the live implementation of the Storage service factory.
 */
export default Effect.gen(function* (G) {
	const IPC = yield* G(IPCService);
	const Log = yield* G(LogService);

	// Step 1: Fetch ALL initial storage data at once during service creation.
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

	// Step 2: Define the debounced persistence effect.
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

	// Step 3: Fork the debounced loop as a daemon that runs for the lifetime of the service.
	yield* G(
		Effect.forkDaemon(
			PersistChangesEffect.pipe(
				Effect.repeat(
					Schedule.spaced(`${DebounceMilliseconds} millis`),
				),
			),
		),
	);

	// Step 4: Define the service implementation (the Memento factory).
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
				// Mark the entire scope (global/workspace) as dirty.
				Ref.unsafeSet(DirtyFlagRef, true);
				// Immediately update the root cache with the changed extension state,
				// so the next persistence cycle has the latest data.
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
