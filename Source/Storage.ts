/**
 * @module Storage
 * @description Defines the service for providing persistent, scoped key-value
 * storage (`Memento`) for extensions. It fetches all storage data on init,
 * caches it locally, provides a fast in-memory proxy, and batches writes to the host.
 */

import { Emitter } from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/event.js";
import { Effect, Ref, Schedule } from "effect";
import type { Memento } from "vscode";

import { IPCService } from "./IPC.js";
import { LoggerService } from "./Logger.js";

const DebounceMilliseconds = 1000;

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
		// FIX: Must run the Effect to get the state synchronously.
		const State = Effect.runSync(Ref.get(this.StateRef));
		const Value = State[key];
		return Value !== undefined ? Value : defaultValue;
	}

	public keys(): readonly string[] {
		// FIX: Must run the Effect to get the state synchronously.
		const State = Effect.runSync(Ref.get(this.StateRef));
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
		return Promise.resolve();
	}
}

/**
 * @interface Storage
 * @description The contract for the Storage factory service.
 */
export interface Storage {
	readonly CreateMemento: (ExtensionId: string, IsGlobal: boolean) => Memento;
}

/**
 * @class StorageService
 * @description The `Effect.Service` for the Storage service factory.
 */
export class StorageService extends Effect.Service<StorageService>()(
	"Service/Storage",
	{
		scoped: Effect.gen(function* () {
			const IPC = yield* IPCService;
			const Logger = yield* LoggerService;

			const [InitialGlobalStorage, InitialWorkspaceStorage] =
				yield* Effect.all([
					IPC.SendRequest<Record<string, any>>("$storage:getAll", [
						true,
					]),
					IPC.SendRequest<Record<string, any>>("$storage:getAll", [
						false,
					]),
				]);

			const GlobalStorageRef = yield* Ref.make(InitialGlobalStorage);
			const WorkspaceStorageRef = yield* Ref.make(
				InitialWorkspaceStorage,
			);
			const IsGlobalDirty = yield* Ref.make(false);
			const IsWorkspaceDirty = yield* Ref.make(false);

			const PersistChanges = Effect.gen(function* () {
				const [IsGlobalDirtyValue, IsWorkspaceDirtyValue] =
					yield* Effect.all([
						Ref.get(IsGlobalDirty),
						Ref.get(IsWorkspaceDirty),
					]);
				const PersistenceEffects: Effect.Effect<void, any>[] = [];
				if (IsGlobalDirtyValue) {
					const CurrentState = yield* Ref.get(GlobalStorageRef);
					PersistenceEffects.push(
						IPC.SendNotification("$storage:setAll", [
							true,
							CurrentState,
						]),
					);
					yield* Ref.set(IsGlobalDirty, false);
				}
				if (IsWorkspaceDirtyValue) {
					const CurrentState = yield* Ref.get(WorkspaceStorageRef);
					PersistenceEffects.push(
						IPC.SendNotification("$storage:setAll", [
							false,
							CurrentState,
						]),
					);
					yield* Ref.set(IsWorkspaceDirty, false);
				}
				if (PersistenceEffects.length > 0) {
					yield* Logger.Debug("Persisting Memento state to host...");
					yield* Effect.all(PersistenceEffects, {
						discard: true,
						concurrency: "unbounded",
					});
				}
			}).pipe(
				Effect.catchAll((Error) =>
					Logger.Error("Failed to persist Memento state.", Error),
				),
			);

			yield* Effect.forkDaemon(
				PersistChanges.pipe(
					Effect.repeat(
						Schedule.spaced(`${DebounceMilliseconds} millis`),
					),
				),
			);

			const CreateMemento = (
				ExtensionId: string,
				IsGlobal: boolean,
			): Memento => {
				const RootStateRef = IsGlobal
					? GlobalStorageRef
					: WorkspaceStorageRef;
				// FIX: Synchronously get state and create the extension-specific Ref
				const RootState = Effect.runSync(Ref.get(RootStateRef));
				const ExtensionState = (RootState as any)[ExtensionId] ?? {};
				const ExtensionStateRef = Effect.runSync(
					Ref.make(ExtensionState),
				);
				const MarkAsDirtyCallback = () => {
					// FIX: Compose and run the update logic as a single Effect
					const UpdateEffect = Effect.gen(function* () {
						const DirtyFlagRef = IsGlobal
							? IsGlobalDirty
							: IsWorkspaceDirty;
						yield* Ref.set(DirtyFlagRef, true);
						const extensionStateValue =
							yield* Ref.get(ExtensionStateRef);
						yield* Ref.update(RootStateRef, (CurrentRoot) => ({
							...CurrentRoot,
							[ExtensionId]: extensionStateValue,
						}));
					});
					Effect.runFork(UpdateEffect);
				};
				return new MementoProxyImplementation(
					ExtensionStateRef,
					MarkAsDirtyCallback,
				);
			};

			return { CreateMemento };
		}).pipe(Effect.orDie),
	},
) {}
