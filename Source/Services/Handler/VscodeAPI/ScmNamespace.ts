/**
 * @module Handler/VscodeAPI/ScmNamespace
 * @description
 * Factory for the vscode.scm namespace shim. Each `createSourceControl` call
 * produces a handle-backed SourceControl whose resource groups and input box
 * changes propagate to Mountain via `register_scm_provider` and
 * `update_scm_group` RPCs.
 */

import type { HandlerContext } from "../HandlerContext.js";
import { NextProviderHandle } from "../../LanguageProviderRegistry.js";
import WrapScmNamespace from "./WrapScmNamespace.js";

/**
 * Mountain.dev.log diagnostic so SCM-side wiring failures are visible.
 * Without this, when an extension never reaches `createSourceControl`
 * (e.g. git's `findGit()` fails before model construction), the log is
 * silent and the SCM viewlet stays empty with no signal at all. Tag
 * `scm-trace` is short-mode-friendly (not in `SHORT_MODE_MUTED_TAGS`).
 *
 * Gated on `LAND_DEV_LOG` so production runs (which never set the env)
 * pay zero per-call cost. The Mountain-side `cfg!(debug_assertions)`
 * gate on `dev_log!` already strips logging in release builds; this
 * env check mirrors that for the Cocoon side.
 */
const ScmTraceEnabled =
	typeof process !== "undefined" && typeof process.env["LAND_DEV_LOG"] === "string";
const ScmTrace = (Message:string):void => {
	if (!ScmTraceEnabled) return;
	try {
		process.stdout.write(`[DEV:SCM-TRACE] ${Message}\n`);
	} catch {}
};

const CreateScmNamespace = (Context: HandlerContext) => WrapScmNamespace({
	createSourceControl: (Id: string, Label: string, RootUri?: unknown) => {
		const Handle = NextProviderHandle();
		const RootUriShape =
			RootUri == null
				? "null"
				: typeof RootUri === "string"
					? `string("${RootUri}")`
					: typeof RootUri === "object"
						? `object(scheme=${(RootUri as { scheme?: unknown })?.scheme ?? "<missing>"})`
						: typeof RootUri;
		ScmTrace(
			`createSourceControl id="${Id}" label="${Label}" rootUri=${RootUriShape} handle=${Handle}`,
		);
		Context.SendToMountain("register_scm_provider", {
			handle: Handle,
			id: Id,
			label: Label,
			root_uri: RootUri,
			extension_id: "",
		})
			.then(() => ScmTrace(`register_scm_provider ack id="${Id}" handle=${Handle}`))
			.catch((Error: unknown) => {
				const Message = Error instanceof globalThis.Error ? Error.message : String(Error);
				ScmTrace(`register_scm_provider FAILED id="${Id}" handle=${Handle} error=${Message}`);
			});

		const Groups = new Map<
			string,
			{ label: string; resourceStates: unknown[] }
		>();

		return {
			id: Id,
			label: Label,
			rootUri: RootUri,
			inputBox: {
				value: "",
				placeholder: "",
				enabled: true,
				visible: true,
			},
			createResourceGroup: (GroupId: string, GroupLabel: string) => {
				const GroupHandle = `${Handle}/${GroupId}`;
				Groups.set(GroupId, { label: GroupLabel, resourceStates: [] });
				ScmTrace(
					`createResourceGroup scm="${Id}" handle=${Handle} groupId="${GroupId}" groupLabel="${GroupLabel}"`,
				);
				Context.SendToMountain("register_scm_resource_group", {
					scm_handle: Handle,
					group_handle: GroupHandle,
					group_id: GroupId,
					label: GroupLabel,
				}).catch((Error: unknown) => {
					ScmTrace(
						`register_scm_resource_group FAILED scm=${Handle} group="${GroupId}" error=${
							Error instanceof globalThis.Error ? Error.message : String(Error)
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
						Context.SendToMountain("update_scm_group", {
							scm_handle: Handle,
							group_handle: GroupHandle,
							resource_states: Value,
						}).catch((Error: unknown) => {
							ScmTrace(
								`update_scm_group FAILED scm=${Handle} group="${GroupId}" error=${
									Error instanceof globalThis.Error ? Error.message : String(Error)
								}`,
							);
						});
					},
					dispose: () => {
						Context.SendToMountain(
							"unregister_scm_resource_group",
							{
								scm_handle: Handle,
								group_handle: GroupHandle,
							},
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
				Context.SendToMountain("unregister_scm_provider", {
					handle: Handle,
				}).catch(() => {});
				Groups.clear();
			},
		};
	},

	inputBox: { value: "" },
});

export default CreateScmNamespace;

