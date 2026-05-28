/**
 * @module Handler/VscodeAPI/ScmNamespace
 * @description
 * Factory for the vscode.scm namespace shim. Each `createSourceControl` call
 * produces a handle-backed SourceControl whose resource groups and input box
 * changes propagate to Mountain via `register_scm_provider` and
 * `update_scm_group` RPCs.
 */

import { NextProviderHandle } from "../../../Language/Provider/Registry.js";
import type { HandlerContext } from "../../Handler/Context.js";
import WrapNamespaceWithHeuristics from "../Wrap/Namespace/With/Heuristics.js";
import WrapScmNamespace from "../Wrap/Scm/Namespace.js";

/**
 * Mountain.dev.log diagnostic so SCM-side wiring failures are visible.
 * Without this, when an extension never reaches `createSourceControl`
 * (e.g. git's `findGit()` fails before model construction), the log is
 * silent and the SCM viewlet stays empty with no signal at all. Tag
 * `scm-trace` is short-mode-friendly (not in `SHORT_MODE_MUTED_TAGS`).
 *
 * Gated on `Trace` so production runs (which never set the env)
 * pay zero per-call cost. The Mountain-side `cfg!(debug_assertions)`
 * gate on `dev_log!` already strips logging in release builds; this
 * env check mirrors that for the Cocoon side.
 */
const ScmTraceEnabled =
	typeof process !== "undefined" && typeof process.env["Trace"] === "string";

const ScmTrace = (Message: string): void => {
	if (!ScmTraceEnabled) return;

	try {
		process.stdout.write(`[DEV:SCM-TRACE] ${Message}\n`);
	} catch {}
};

/**
 * Reduce a `SourceControlResourceState` to the wire shape Mountain
 * accepts and downstream Sky listeners render. vscode.git constructs
 * resource-state objects with hidden back-references
 * (`state.command.arguments[0] -> Repository -> Model ->
 * openRepositories -> repository`) that loop on themselves. JSON-
 * stringifying the raw value crashes with `Converting circular
 * structure to JSON`. We project to the upstream-VS-Code wire shape
 * (`{ resourceUri, command?, decorations?, contextValue? }`) and
 * drop everything else. URI-shaped fields are passed through verbatim
 * - workbench-side hydration handles UriComponents either way.
 */
const SanitizeResourceState = (Raw: unknown): unknown => {
	if (Raw == null || typeof Raw !== "object") return Raw;

	const Source = Raw as Record<string, unknown>;

	const Out: Record<string, unknown> = {};

	if (Source["resourceUri"] !== undefined)
		Out["resourceUri"] = Source["resourceUri"];

	const Command = Source["command"];

	if (Command && typeof Command === "object") {
		const C = Command as Record<string, unknown>;

		// Project `arguments[]` to a JSON-safe shape. The previous version
		// dropped `arguments` outright "because the workbench resolves
		// arguments by command id at execution time" - but for
		// `git.openChange` / `git.openFile` / etc, vscode.git's handler
		// reads `args[0].resourceUri` to know which file to diff. Without
		// the projected resource handle, clicking a file in the SCM list
		// silently opens the wrong thing (or nothing at all).
		//
		// vscode.git stuffs a back-reference to the Repository on
		// `args[0]` which forms a JSON-stringify cycle, so we shallow-
		// copy each argument and project just the safe primitive fields
		// the diff handler actually consults.
		const RawArgs = Array.isArray(C["arguments"])
			? (C["arguments"] as unknown[])
			: undefined;

		const ProjectArg = (Arg: unknown): unknown => {
			if (Arg == null) return Arg;

			if (typeof Arg !== "object") return Arg;

			const Holder = Arg as Record<string, unknown>;

			const Projected: Record<string, unknown> = {};

			// `resourceUri` is the canonical "what file did the user
			// click" field; preserve as-is so vscode.git's handler can
			// reconstruct the diff inputs.
			if (Holder["resourceUri"] !== undefined)
				Projected["resourceUri"] = Holder["resourceUri"];

			// URI POJOs may travel as the arg itself.
			if (typeof Holder["scheme"] === "string") {
				Projected["scheme"] = Holder["scheme"];

				if (Holder["authority"] !== undefined)
					Projected["authority"] = Holder["authority"];

				if (Holder["path"] !== undefined)
					Projected["path"] = Holder["path"];

				if (Holder["query"] !== undefined)
					Projected["query"] = Holder["query"];

				if (Holder["fragment"] !== undefined)
					Projected["fragment"] = Holder["fragment"];
			}

			if (typeof Holder["fsPath"] === "string")
				Projected["fsPath"] = Holder["fsPath"];

			if (typeof Holder["external"] === "string")
				Projected["external"] = Holder["external"];

			// Pass through known-safe scalar metadata so handlers that
			// inspect `type`/`originalUri`/`renameUri` still see them.
			for (const Key of [
				"type",

				"originalUri",

				"renameUri",

				"contextValue",

				"id",
			] as const) {
				if (Holder[Key] !== undefined) Projected[Key] = Holder[Key];
			}

			return Projected;
		};

		Out["command"] = {
			title: C["title"] ?? "",

			command: C["command"] ?? "",

			tooltip: C["tooltip"] ?? "",

			arguments: RawArgs ? RawArgs.map(ProjectArg) : undefined,
		};
	}

	const Decorations = Source["decorations"];

	if (Decorations && typeof Decorations === "object") {
		const D = Decorations as Record<string, unknown>;

		const SafeDecorations: Record<string, unknown> = {};

		for (const Key of [
			"strikeThrough",

			"faded",

			"tooltip",

			"iconPath",

			"light",

			"dark",
		] as const) {
			if (D[Key] !== undefined) SafeDecorations[Key] = D[Key];
		}

		Out["decorations"] = SafeDecorations;
	}

	if (Source["contextValue"] !== undefined)
		Out["contextValue"] = Source["contextValue"];

	return Out;
};

const CreateScmNamespace = (Context: HandlerContext) =>
	WrapScmNamespace({
		createSourceControl: (Id: string, Label: string, RootUri?: unknown) => {
			const Handle = NextProviderHandle();

			const RootUriDescription =
				RootUri == null
					? "null"
					: typeof RootUri === "string"
						? `string("${RootUri}")`
						: typeof RootUri === "object"
							? `object(scheme=${(RootUri as { scheme?: unknown })?.scheme ?? "<missing>"})`
							: typeof RootUri;

			ScmTrace(
				`createSourceControl id="${Id}" label="${Label}" rootUri=${RootUriDescription} handle=${Handle}`,
			);

			// vscode.git's `Uri.file()` returns a Uri instance whose getters
			// (`fsPath`, `path`) and prototype methods don't serialise cleanly
			// across the gRPC wire. Project to the upstream UriComponents shape
			// so Mountain's `RegisterScmProvider.rs` reads the same plain
			// `{scheme, authority, path, query, fragment}` data it expects from
			// stock VS Code, and so JSON.stringify doesn't traverse any hidden
			// back-references via the Repository → Model → openRepositories
			// chain that vscode.git's Uri instances carry.
			const RootUriShape =
				RootUri && typeof RootUri === "object"
					? {
							scheme:
								(RootUri as { scheme?: unknown })?.scheme ?? "",
							authority:
								(RootUri as { authority?: unknown })
									?.authority ?? "",
							path: (RootUri as { path?: unknown })?.path ?? "",
							query:
								(RootUri as { query?: unknown })?.query ?? "",
							fragment:
								(RootUri as { fragment?: unknown })?.fragment ??
								"",
						}
					: RootUri;

			// vscode.git fires `createResourceGroup(...)` and the
			// `resourceStates` setter synchronously after `createSourceControl`
			// returns. Each of those goes through `Context.SendToMountain(...)`
			// fire-and-forget, racing the still-in-flight `register_scm_provider`
			// notification. Mountain has been observed to receive the group
			// register/update notifications BEFORE the provider register
			// notification, which causes the workbench's
			// `SourceControlManagementProvider` to log
			// `Received group update for unknown provider handle: <H>` and
			// drop the update. Chain every subsequent SCM notification for
			// this provider behind `ProviderReady` so the wire order matches
			// the code-call order regardless of any per-method async overhead
			// in `SendToMountain` (DualTrack import, payload serialisation,
			// gRPC writer scheduling).
			const ProviderReady = Context.SendToMountain(
				"register_scm_provider",

				{
					handle: Handle,
					id: Id,
					label: Label,
					rootUri: RootUriShape,
					extensionId: "",
				},
			)
				.then(() =>
					ScmTrace(
						`register_scm_provider ack id="${Id}" handle=${Handle}`,
					),
				)
				.catch((Error: unknown) => {
					const Message =
						Error instanceof globalThis.Error
							? Error.message
							: String(Error);

					ScmTrace(
						`register_scm_provider FAILED id="${Id}" handle=${Handle} error=${Message}`,
					);
				});

			const Groups = new Map<
				string,
				{ label: string; resourceStates: unknown[] }
			>();

			// vscode.git's `Repository` ctor reads several methods/events on
			// the returned SourceControl that aren't in our concrete shape:
			// `onDidDisposeParent`, `acceptInputCommandHistoryNavigationDirection`,
			// `secondaryQuickDiffProvider` (setter), `historyProvider` (setter),
			// `artifactProvider` (setter), `inputBox.validateInput` (setter),
			// `inputBox.showValidationMessage`, etc. Without a Proxy fallback
			// every read of a not-yet-shimmed property throws TypeError and
			// the Repository never finishes constructing - the SCM viewlet
			// stays empty even though `createSourceControl` returned cleanly.
			// Wrap the concrete object with the same heuristic Proxy used at
			// the namespace level (`WrapNamespaceWithHeuristics`): unknown
			// `onDid*`/`onWill*` returns disposable, unknown setters are
			// ignored, etc. Reads of defined properties pass through
			// unchanged.
			const ConcreteSourceControl = {
				id: Id,
				label: Label,
				rootUri: RootUri,
				inputBox: WrapNamespaceWithHeuristics(
					`scm.sourceControl[${Id}].inputBox`,

					{
						get value() {
							return (this as any).__value ?? "";
						},
						set value(V: string) {
							(this as any).__value = V;

							// Update Mountain's SCM state so the workbench commit
							// input box reflects the extension-set value.
							Context.MountainClient?.sendRequest(
								"$scm:updateSourceControl",

								[Handle, { inputBoxValue: V }],
							).catch(() => {});
						},
						get placeholder() {
							return (this as any).__placeholder ?? "";
						},
						set placeholder(V: string) {
							(this as any).__placeholder = V;

							Context.MountainClient?.sendRequest(
								"$scm:updateSourceControl",

								[Handle, { inputBoxPlaceholder: V }],
							).catch(() => {});
						},
						enabled: true,
						visible: true,
					},
				),
				createResourceGroup: (GroupId: string, GroupLabel: string) => {
					const GroupHandle = `${Handle}/${GroupId}`;

					Groups.set(GroupId, {
						label: GroupLabel,
						resourceStates: [],
					});

					ScmTrace(
						`createResourceGroup scm="${Id}" handle=${Handle} groupId="${GroupId}" groupLabel="${GroupLabel}"`,
					);

					const GroupReady = ProviderReady.then(() =>
						Context.SendToMountain("register_scm_resource_group", {
							scmHandle: Handle,
							groupHandle: GroupHandle,
							groupId: GroupId,
							label: GroupLabel,
						}),
					).catch((Error: unknown) => {
						ScmTrace(
							`register_scm_resource_group FAILED scm=${Handle} group="${GroupId}" error=${
								Error instanceof globalThis.Error
									? Error.message
									: String(Error)
							}`,
						);
					});

					const State = { resourceStates: [] as unknown[] };

					return {
						id: GroupId,

						label: GroupLabel,

						get resourceStates() {
							return State.resourceStates;
						},

						set resourceStates(Value: unknown[]) {
							State.resourceStates = Value;

							ScmTrace(
								`update_scm_group scm=${Handle} group="${GroupId}" resourceCount=${
									Array.isArray(Value) ? Value.length : 0
								}`,
							);

							// Strip vscode.git's back-references before
							// serialising. Each `SourceControlResourceState`
							// has hidden links via `Repository.repositoryResolver
							// → Model → openRepositories → repository`, forming
							// a cycle that crashes `JSON.stringify` with
							// "Converting circular structure to JSON". Mountain
							// only needs the wire-shape that upstream VS Code
							// consumes: `{ resourceUri, command?, decorations?,
							// contextValue? }`. Anything else gets dropped.
							const SanitizedStates = Array.isArray(Value)
								? Value.map((Raw) => SanitizeResourceState(Raw))
								: [];

							// Chain after `GroupReady` so the workbench cannot
							// receive an `update_scm_group` for a group whose
							// `register_scm_resource_group` notification hasn't
							// reached Mountain yet (same race as the provider
							// register/update ordering - vscode.git sets
							// `resourceStates` synchronously after
							// `createResourceGroup`).
							GroupReady.then(() =>
								Context.SendToMountain("update_scm_group", {
									// Proto UpdateScmGroupRequest field names:
									// providerId (string scm id) + groupId (string).
									// `scmHandle` and `groupHandle` are included so
									// multi-repo workspaces (all sharing scmId="git")
									// route updates to the correct provider -
									// without them Mountain logs `scm_handle=None`
									// and Sky's `ResolveScmShim` falls back to a
									// non-unique scmId lookup, dropping updates
									// against the wrong workbench provider.
									scmHandle: Handle,
									providerId: Id,
									groupHandle: GroupHandle,
									groupId: GroupId,
									resourceStates: SanitizedStates,
								}),
							).catch((Error: unknown) => {
								ScmTrace(
									`update_scm_group FAILED scm=${Handle} group="${GroupId}" error=${
										Error instanceof globalThis.Error
											? Error.message
											: String(Error)
									}`,
								);
							});
						},
						dispose: () => {
							GroupReady.then(() =>
								Context.SendToMountain(
									"unregister_scm_resource_group",

									{
										scmHandle: Handle,
										groupHandle: GroupHandle,
									},
								),
							).catch(() => {});

							Groups.delete(GroupId);
						},
					};
				},
				statusBarCommands: [] as unknown[],
				count: 0,
				get commitTemplate() {
					return (
						(ConcreteSourceControl as any).__commitTemplate ?? ""
					);
				},
				set commitTemplate(V: string) {
					(ConcreteSourceControl as any).__commitTemplate = V;

					Context.MountainClient?.sendRequest(
						"$scm:updateSourceControl",

						[Handle, { commitTemplate: V }],
					).catch(() => {});
				},
				get acceptInputCommand() {
					return (ConcreteSourceControl as any).__acceptInputCommand;
				},
				set acceptInputCommand(V: unknown) {
					(ConcreteSourceControl as any).__acceptInputCommand = V;

					Context.MountainClient?.sendRequest(
						"$scm:updateSourceControl",

						[Handle, { acceptInputCommand: V }],
					).catch(() => {});
				},
				quickDiffProvider: undefined,
				dispose: () => {
					ProviderReady.then(() =>
						Context.SendToMountain("unregister_scm_provider", {
							handle: Handle,
						}),
					).catch(() => {});

					Groups.clear();
				},
			};

			return WrapNamespaceWithHeuristics(
				`scm.sourceControl[${Id}]`,

				ConcreteSourceControl,
			);
		},

		// vscode.scm.inputBox - global input box reference; proxies the active
		// SourceControl's inputBox so GitLens and other SCM extensions that write
		// to the global can still set the commit message.
		get inputBox() {
			const Providers = (Context as any).__scmProviders ?? [];

			const Active = Providers[0];

			return (
				Active?.inputBox ?? {
					value: "",
					placeholder: "",
					enabled: true,
					visible: true,
				}
			);
		},
	});

export default CreateScmNamespace;
