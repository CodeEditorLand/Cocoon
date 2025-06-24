/*
 * File: Cocoon/Source/Service/Storage/Service.ts
 * Role: Defines the Storage service factory interface and provides its default "live" implementation.
 * Responsibilities:
 *   - Provide a factory for creating `Memento` instances for persistent, scoped key-value storage.
 */

import { Effect, Layer, Ref, Schedule } from "effect";
import { Emitter, type Memento } from "vscode";
import { IPC as IPCService } from "../IPC/Service.js";
import { Logger } from "../Log/Service.js";

// --- Internal Memento Implementation ---
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
			if (value === undefined) delete NewState[key];
			else NewState[key] = value;
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

// --- Service Definition ---
export class Storage extends Effect.Service<Storage>()("Service/Storage", {
	// This service's construction is effectful and scoped due to the background persistence fiber.
	scoped: Effect.gen(function* (Generator) {
		const IPC = yield* Generator(IPCService);
		const LogService = yield* Generator(Logger);
		const DebounceMilliseconds = 1000;

		const [InitialGlobalStorage, InitialWorkspaceStorage] =
			yield* Generator(
				Effect.all([
					IPC.SendRequest<Record<string, any>>("$storage:getAll", [
						true,
					]),
					IPC.SendRequest<Record<string, any>>("$storage:getAll", [
						false,
					]),
				]),
			);

		const GlobalStorageRef = yield* Generator(
			Ref.make(InitialGlobalStorage),
		);
		const WorkspaceStorageRef = yield* Generator(
			Ref.make(InitialWorkspaceStorage),
		);
		const IsGlobalDirty = yield* Generator(Ref.make(false));
		const IsWorkspaceDirty = yield* Generator(Ref.make(false));

		const PersistChangesEffect = Effect.gen(function* (Generator) {
			const [IsGlobalDirtyValue, IsWorkspaceDirtyValue] =
				yield* Generator(
					Effect.all([
						Ref.get(IsGlobalDirty),
						Ref.get(IsWorkspaceDirty),
					]),
				);
			const PersistenceEffects: Effect.Effect<void, any>[] = [];
			if (IsGlobalDirtyValue) {
				const CurrentState = yield* Generator(
					Ref.get(GlobalStorageRef),
				);
				PersistenceEffects.push(
					IPC.SendNotification("$storage:setAll", [
						true,
						CurrentState,
					]),
				);
				yield* Generator(Ref.set(IsGlobalDirty, false));
			}
			if (IsWorkspaceDirtyValue) {
				const CurrentState = yield* Generator(
					Ref.get(WorkspaceStorageRef),
				);
				PersistenceEffects.push(
					IPC.SendNotification("$storage:setAll", [
						false,
						CurrentState,
					]),
				);
				yield* Generator(Ref.set(IsWorkspaceDirty, false));
			}
			if (PersistenceEffects.length > 0) {
				yield* Generator(
					LogService.Debug("Persisting Memento state to host..."),
				);
				yield* Generator(
					Effect.all(PersistenceEffects, {
						discard: true,
						concurrency: "unbounded",
					}),
				);
			}
		}).pipe(
			Effect.catchAll((Error) =>
				LogService.Error("Failed to persist Memento state.", Error),
			),
		);

		yield* Generator(
			Effect.forkDaemon(
				PersistChangesEffect.pipe(
					Effect.repeat(
						Schedule.spaced(`${DebounceMilliseconds} millis`),
					),
				),
			),
		);

		const ServiceImplementation = {
			CreateMemento: (
				ExtensionID: string,
				IsGlobal: boolean,
			): Memento => {
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
					Ref.unsafeSet(DirtyFlagRef, true);
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
		return ServiceImplementation;
	}).pipe(Layer.orDie), // Treat initialization errors as fatal.
}) {}
