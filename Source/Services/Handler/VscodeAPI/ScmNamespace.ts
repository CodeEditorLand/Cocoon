/**
 * @module Handler/VscodeAPI/ScmNamespace
 * @description
 * Factory for the vscode.scm namespace shim. Each `createSourceControl` call
 * produces a handle-backed SourceControl whose resource groups and input box
 * changes propagate to Mountain via `register_scm_provider` and
 * `update_scm_group` RPCs.
 */

import { NextProviderHandle } from "../../LanguageProviderRegistry.js";
import type { HandlerContext } from "../HandlerContext.js";
import WrapNamespaceWithHeuristics from "./WrapNamespaceWithHeuristics.js";
import WrapScmNamespace from "./WrapScmNamespace.js";

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
	typeof process !== "undefined" &&
	typeof process.env["Trace"] === "string";
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
		// Strip Command.arguments - that's the most common cycle root
		// (extension stuffs the Repository instance there). Title/id
		// pass through; the workbench resolves arguments by command id
		// at execution time anyway.
		Out["command"] = {
			title: C["title"] ?? "",
			command: C["command"] ?? "",
			tooltip: C["tooltip"] ?? "",
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
						value: "",
						placeholder: "",
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
									scmHandle: Handle,
									groupHandle: GroupHandle,
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
				commitTemplate: "",
				acceptInputCommand: undefined,
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

		inputBox: { value: "" },
	});

export default CreateScmNamespace;
