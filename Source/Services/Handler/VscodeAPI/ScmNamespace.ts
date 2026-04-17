/**
 * @module Handler/VscodeAPI/ScmNamespace
 * @description
 * Factory for the vscode.scm namespace shim. Each `createSourceControl` call
 * produces a handle-backed SourceControl whose resource groups and input box
 * changes propagate to Mountain via `register_scm_provider` and
 * `update_scm_group` RPCs.
 */

import type { HandlerContext } from "../HandlerContext.js";

let ScmCounter = 0;

const CreateScmNamespace = (Context: HandlerContext) => ({
	createSourceControl: (
		Id: string,
		Label: string,
		RootUri?: unknown,
	) => {
		const Handle = `scm:${++ScmCounter}`;
		Context.SendToMountain("register_scm_provider", {
			handle: Handle,
			id: Id,
			label: Label,
			root_uri: RootUri,
			extension_id: "",
		}).catch(() => {});

		const Groups = new Map<string, { label: string; resourceStates: unknown[] }>();

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
				Context.SendToMountain("register_scm_resource_group", {
					scm_handle: Handle,
					group_handle: GroupHandle,
					group_id: GroupId,
					label: GroupLabel,
				}).catch(() => {});
				const State = { resourceStates: [] as unknown[] };
				return {
					id: GroupId,
					label: GroupLabel,
					get resourceStates() {
						return State.resourceStates;
					},
					set resourceStates(Value: unknown[]) {
						State.resourceStates = Value;
						Context.SendToMountain("update_scm_group", {
							scm_handle: Handle,
							group_handle: GroupHandle,
							resource_states: Value,
						}).catch(() => {});
					},
					dispose: () => {
						Context.SendToMountain("unregister_scm_resource_group", {
							scm_handle: Handle,
							group_handle: GroupHandle,
						}).catch(() => {});
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
