/**
 * @module Definition (TreeView)
 * @description The live implementation of the TreeView service factory.
 */

import { Effect, Ref } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { Disposable, type TreeViewOptions } from "vscode";

import * as TypeConverter from "../../TypeConverter/TreeView.js";
import CommandService from "../Command/Service.js";
import IPCService from "../IPC/Service.js";
import type Service from "./Service.js";
import TreeViewImplementation from "./TreeViewImplementation.js";

let HandleCounter = 0;

/**
 * An Effect that builds the live implementation of the TreeView service factory.
 */
export default Effect.gen(function* () {
	const IPC = yield* IPCService;
	const Command = yield* CommandService;
	const ActiveViews = yield* Ref.make(
		new Map<string, TreeViewImplementation<any>>(),
	);

	// --- RPC Handlers ---
	IPC.RegisterInvokeHandler("$getChildren", ([ViewID, ParentHandle]) =>
		Effect.gen(function* () {
			const View = (yield* Ref.get(ActiveViews)).get(ViewID);
			if (!View) {
				return [];
			}
			const ParentElement = ParentHandle
				? View.handleToElementMap.get(ParentHandle)
				: undefined;
			return yield* View.GetChildrenEffect(ParentElement);
		}).pipe(Effect.runPromise),
	);

	IPC.RegisterInvokeHandler("$disposeTreeView", ([ViewID]) =>
		Effect.gen(function* () {
			const View = (yield* Ref.get(ActiveViews)).get(ViewID);
			if (View) {
				View.dispose();
				yield* Ref.update(
					ActiveViews,
					(Map) => (Map.delete(ViewID), Map),
				);
			}
		}).pipe(Effect.runPromise),
	);

	const TreeViewImplementationFactory: Service = {
		CreateTreeView: <T>(
			ViewID: string,
			Options: TreeViewOptions<T>,
			Extension: IExtensionDescription,
		) =>
			Effect.gen(function* () {
				if ((yield* Ref.get(ActiveViews)).has(ViewID)) {
					return yield* Effect.fail(
						new Error(`Tree view '${ViewID}' already registered.`),
					);
				}
				if (!Options.treeDataProvider) {
					return yield* Effect.fail(
						new Error(
							"TreeViewOptions must include a TreeDataProvider.",
						),
					);
				}

				const OptionDTO = TypeConverter.Option.FromAPI(Options);
				yield* IPC.SendNotification("$registerTreeDataProvider", [
					ViewID,
					OptionDTO,
				]);

				const ExtHostView = new TreeViewImplementation<T>(
					ViewID,
					Options.treeDataProvider,
					IPC,
					Command,
					Extension,
				);
				yield* Ref.update(ActiveViews, (Map) =>
					Map.set(ViewID, ExtHostView),
				);

				return ExtHostView;
			}),
	};

	return TreeViewImplementationFactory;
});
