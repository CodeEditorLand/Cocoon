/**
 * @module Handler/VscodeAPI/TestsNamespace
 * @description
 * Factory for the `vscode.tests` namespace shim. Provides a registry-backed
 * TestController surface so extensions calling `vscode.tests.createTestController(id, label)`
 * receive a real controller whose `items` collection, `createTestItem`,
 * `createRunProfile`, and `createTestRun` mutations persist in-host.
 *
 * Real test execution (Sky-side `ITestService` integration → workbench
 * Testing panel rendering → run-from-gutter) is not yet wired - that
 * requires exposing `ITestService` via `Output/Source/Service/CEL/Expose/Accessor.ts`
 * and forwarding `TestRun.*` lifecycle events from Cocoon → Mountain → Sky.
 * Until that lands, this shim keeps every extension that imports
 * `vscode.tests` working at the API surface (no crashes on
 * `controller.items.add(item)` or `run.passed(item)`); their test runs
 * simply do not render in the Testing panel.
 *
 * ## Architecture
 *
 * Per-controller state lives in `Context.ExtensionRegistry` under the
 * `__testController:<id>` key. Each controller owns:
 *
 *   - `items`        Map<id, TestItem>            (top-level test tree)
 *   - `profiles`     Map<profileId, RunProfile>   (run / debug / coverage)
 *   - `runs`         Set<TestRun>                 (active runs for tracking)
 *
 * Test items are recursive (each has its own `children: TestItemCollection`).
 * Items are mutable - extensions update `label`, `description`, `range`,
 * `busy`, `error`, `tags` via direct property assignment; subscribers are
 * not notified yet (Sky-side observers don't exist).
 *
 * ## Event channel
 *
 * `vscode.tests.onDidChangeTestResults` fires when a TestRun ends. Subscribers
 * attach via `Context.Emitter.on("tests.didChangeTestResults", listener)`.
 * The event payload is the run's accumulated `TestRunResults` (test-item ID →
 * `{ state, duration, message?, output? }`).
 *
 * ## Why a real registry vs the stock empty-stub
 *
 * Extensions like vitest, mocha-explorer, vscode-rust-test-adapter, and
 * rust-analyzer's tests view call `controller.items.add(...)` immediately
 * on activation. The stock stub silently dropped these calls, so the
 * extension's internal test cache was always empty - subsequent
 * `controller.items.get(id)` returned undefined, breaking the extension's
 * own state machine. The registry-backed version keeps that internal state
 * consistent even though the Testing panel UI is still missing.
 */

import type { HandlerContext } from "../../Handler/Context.js";

type TestRunState =
	| "queued"
	| "started"
	| "skipped"
	| "failed"
	| "errored"
	| "passed";

type TestItem = {
	readonly id: string;

	readonly uri: unknown;

	label: string;

	description?: string;

	sortText?: string;

	range?: unknown;

	canResolveChildren: boolean;

	busy: boolean;

	error?: string;

	tags: readonly { id: string }[];

	parent?: TestItem;

	children: TestItemCollection;
};

type TestItemCollection = {
	size: number;

	add(Item: TestItem): void;

	delete(Id: string): void;

	get(Id: string): TestItem | undefined;

	replace(Items: TestItem[]): void;

	forEach(
		Callback: (Item: TestItem, Collection: TestItemCollection) => void,
	): void;
};

type TestRunRequest = {
	include?: readonly TestItem[];

	exclude?: readonly TestItem[];

	profile?: unknown;
};

const NoOp = () => {};

const MakeTestItemCollection = (Owner: TestItem | null): TestItemCollection => {
	const Items = new Map<string, TestItem>(;

	const Collection: TestItemCollection = {
		get size() {
			return Items.size;
		},

		add(Item) {
			if (!Item?.id) return;

			(Item as { parent?: TestItem }).parent = Owner ?? undefined;

			Items.set(Item.id, Item;
		},

		delete(Id) {
			Items.delete(Id;
		},

		get(Id) {
			return Items.get(Id;
		},

		replace(Next) {
			Items.clear(;

			for (const Item of Next) {
				if (Item?.id) {
					(Item as { parent?: TestItem }).parent = Owner ?? undefined;

					Items.set(Item.id, Item;
				}
			}
		},

		forEach(Cb) {
			for (const Item of Items.values()) {
				try {
					Cb(Item, Collection;
				} catch {
					/* per-item callback failure must not break iteration */
				}
			}
		},
	};

	return Collection;
};

const MakeTestItem = (Id: string, Label: string, Uri: unknown): TestItem => {
	const Item: TestItem = {
		id: Id,

		uri: Uri,

		label: Label,

		canResolveChildren: false,

		busy: false,

		tags: [],

		children: undefined as unknown as TestItemCollection,
	};

	(Item as { children: TestItemCollection }).children =
		MakeTestItemCollection(Item;

	return Item;
};

type RunResult = {
	state: TestRunState;

	duration?: number;

	message?: unknown;

	output?: string;
};

const MakeTestRun = (
	Context: HandlerContext,

	ControllerId: string,

	Name: string,

	Request: TestRunRequest,

	Persist: boolean,
) => {
	const Results = new Map<string, RunResult>(;

	const OutputBuffer: string[] = [];

	let Ended = false;

	const SetState =
		(State: TestRunState) =>
		(Item: TestItem, MaybeMessage?: unknown, MaybeDuration?: number) => {
			if (Ended || !Item?.id) return;

			Results.set(Item.id, {
				state: State,
				duration:
					typeof MaybeDuration === "number"
						? MaybeDuration
						: undefined,
				message:
					MaybeMessage && State !== "passed" && State !== "skipped"
						? MaybeMessage
						: undefined,
			};
		};

	const Run = {
		name: Name,

		isPersisted: Persist,

		token: {
			isCancellationRequested: false,

			onCancellationRequested: () => ({ dispose: NoOp }),
		},

		enqueued: SetState("queued"),

		started: SetState("started"),

		skipped: SetState("skipped"),

		failed: SetState("failed"),

		errored: SetState("errored"),

		passed: SetState("passed"),

		appendOutput: (
			Output: string,

			_Location?: unknown,

			_Test?: TestItem,
		) => {
			if (Ended) return;

			if (typeof Output === "string" && Output.length > 0) {
				OutputBuffer.push(Output;
			}
		},

		end: () => {
			if (Ended) return;

			Ended = true;

			try {
				Context.Emitter.emit("tests.didChangeTestResults", {
					controllerId: ControllerId,
					runName: Name,
					results: Object.fromEntries(Results),
					output: OutputBuffer.join(""),
				};
			} catch {
				/* listener threw */
			}
		},
	};

	return Run;
};

const CreateTestsNamespace = (Context: HandlerContext) => {
	const EventSubscriber =
		(EventName: string) => (Listener: (...Arguments: any[]) => any) => {
			Context.Emitter.on(EventName, Listener;

			return {
				dispose: () => {
					Context.Emitter.off(EventName, Listener;
				},
			};
		};

	return {
		createTestController: (Id: string, Label: string) => {
			const ControllerKey = `__testController:${Id}`;

			// Stable surface - re-registering a controller with the same
			// id returns the existing one (matches stock VS Code, which
			// throws on duplicate id; we soften to idempotent registration
			// because extensions in dev-reload occasionally call twice).
			const Existing = Context.ExtensionRegistry.get(ControllerKey;

			if (Existing) {
				return Existing;
			}

			const Items = MakeTestItemCollection(null;

			const Profiles = new Map<number, unknown>(;

			let ProfileSeq = 0;

			const Controller: any = {
				id: Id,

				label: Label,

				items: Items,

				createRunProfile: (
					ProfileLabel: string,

					Kind: number,

					RunHandler: (...A: unknown[]) => unknown,

					IsDefault?: boolean,

					Tag?: { id: string },

					SupportsContinuousRun?: boolean,
				) => {
					const ProfileId = ++ProfileSeq;

					const Profile = {
						label: ProfileLabel,

						kind: Kind,

						isDefault: Boolean(IsDefault),

						tag: Tag,

						supportsContinuousRun: Boolean(SupportsContinuousRun),

						runHandler: RunHandler,

						configureHandler: undefined,

						dispose: () => {
							Profiles.delete(ProfileId;
						},
					};

					Profiles.set(ProfileId, Profile;

					return Profile;
				},

				resolveHandler: undefined,

				refreshHandler: undefined,

				invalidateTestResults: (_Item?: TestItem) => {
					/* Stock VS Code clears prior results from the Testing
					 * panel; no panel yet → no-op. */
				},

				createTestItem: (
					ItemId: string,

					ItemLabel: string,

					Uri?: unknown,
				) => MakeTestItem(ItemId, ItemLabel, Uri),

				createTestRun: (
					Request: TestRunRequest,

					Name?: string,

					Persist?: boolean,
				) =>
					MakeTestRun(
						Context,

						Id,

						typeof Name === "string" ? Name : "",

						Request ?? {},

						Persist !== false,
					),

				dispose: () => {
					Context.ExtensionRegistry.delete(ControllerKey;

					Profiles.clear(;
				},
			};

			Context.ExtensionRegistry.set(ControllerKey, Controller;

			return Controller;
		},

		// `onDidChangeTestResults` - fires when any TestRun.end() lands.
		// Payload: `{ controllerId, runName, results, output }`.
		onDidChangeTestResults: EventSubscriber("tests.didChangeTestResults"),
	};
};

export default CreateTestsNamespace;
