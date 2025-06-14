/**
 * @module Definition (TreeView)
 * @description The live implementation of the TreeView service factory.
 */

import { Effect, Ref } from "effect";
import type { IExtensionDescription, TreeViewOptions } from "vscode";

import * as TypeConverter from "../../TypeConverter.js";
import { Command } from "../Command.js";
import { IPC } from "../IPC.js";
import type { Interface } from "./Service.js";
import { TreeViewImplementation } from "./TreeViewImplementation.js";

export const Definition = Effect.gen(function* () {
	const IPCService = yield* IPC.Tag;
	const CommandService = yield* Command.Tag;
	const ActiveViews = yield* Ref.make(
		new Map<string, TreeViewImplementation<any>>(),
	);

	IPCService.RegisterInvokeHandler("$getChildren", ([ViewID, ParentHandle]) =>
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

	IPCService.RegisterInvokeHandler("$disposeTreeView", ([ViewID]) =>
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

	const ServiceImplementation: Interface = {
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

				const OptionDTO = TypeConverter.TreeView.Option.fromAPI(Option);
				yield* IPCService.SendNotification(
					"$registerTreeDataProvider",
					[ViewID, OptionDTO],
				);

				const ExtHostView = new TreeViewImplementation<T>(
					ViewID,
					Option.treeDataProvider,
					IPCService,
					CommandService,
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
