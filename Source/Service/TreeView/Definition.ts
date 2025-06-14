/**
 * @module Definition (TreeView)
 * @description The live implementation of the TreeView service factory.
 */

import { Context, Effect, Ref } from "effect";
import type { IExtensionDescription, TreeViewOptions } from "vscode";

import * as TypeConverter from "../../TypeConverter/TreeView.js";
import CommandService from "../Command/Service.js";
import IPCService from "../IPC/Service.js";
import TreeViewImplementation from "./TreeViewImplementation.js";

export default Effect.gen(function* () {
	const IPC = yield* IPCService;
	const Command = yield* CommandService;
	const ActiveViews = yield* Ref.make(
		new Map<string, TreeViewImplementation<any>>(),
	);

	IPC.RegisterInvokeHandler("$getChildren", ([ViewID, ParentHandle]) =>
		Effect.gen(function* () {
			const view = (yield* Ref.get(ActiveViews)).get(ViewID);
			if (!view) {
				return [];
			}
			const parentElement = ParentHandle
				? view.handleToElementMap.get(ParentHandle)
				: undefined;
			return yield* view.getChildrenEffect(parentElement);
		}),
	);

	IPC.RegisterInvokeHandler("$disposeTreeView", ([ViewID]) =>
		Effect.gen(function* () {
			const view = (yield* Ref.get(ActiveViews)).get(ViewID);
			if (view) {
				view.dispose();
				yield* Ref.update(
					ActiveViews,
					(map) => (map.delete(ViewID), map),
				);
			}
		}),
	);

	const ServiceImplementation: Context.Tag.Service<any> = {
		CreateTreeView: <T>(
			ViewID: string,
			Option: TreeViewOptions<T>,
			Extension: IExtensionDescription,
		) =>
			Effect.gen(function* () {
				if ((yield* Ref.get(ActiveViews)).has(ViewID)) {
					return yield* Effect.fail(
						new Error(`Tree view '${ViewID}' already registered.`),
					);
				}
				if (!Option.treeDataProvider) {
					return yield* Effect.fail(
						new Error(
							"TreeViewOptions must include a TreeDataProvider.",
						),
					);
				}

				const OptionDTO = TypeConverter.Option.FromAPI(Option);
				yield* IPC.SendNotification("$registerTreeDataProvider", [
					ViewID,
					OptionDTO,
				]);

				const ExtHostView = new TreeViewImplementation<T>(
					ViewID,
					Option.treeDataProvider,
					IPC,
					Command,
					Extension,
				);
				yield* Ref.update(ActiveViews, (map) =>
					map.set(ViewID, ExtHostView),
				);

				return ExtHostView;
			}),
	};

	return ServiceImplementation;
});
