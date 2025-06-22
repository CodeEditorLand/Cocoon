/**
 * @module Definition (TreeView)
 * @description The live implementation of the TreeView service factory.
 */

import { Effect, Ref } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { type TreeViewOptions } from "vscode";

import { TreeView as TreeViewConverter } from "../../TypeConverter/TreeView.js";
import CommandService from "../Command/Service.js";
import IPCService from "../IPC/Service.js";
import type Service from "./Service.js";
import TreeViewImplementation from "./TreeViewImplementation.js";

/**
 * An Effect that builds the live implementation of the TreeView service factory.
 */
export default Effect.gen(function* (G) {
	const IPC = yield* G(IPCService);

	const Command = yield* G(CommandService);

	const ActiveViewsRef = yield* G(
		Ref.make(new Map<string, TreeViewImplementation<any>>()),
	);

	// --- RPC Handler Effects ---
	const GetChildrenEffect = (ViewID: string, ParentHandle?: string) =>
		Effect.gen(function* (G) {
			const View = (yield* G(Ref.get(ActiveViewsRef))).get(ViewID);

			if (!View) {
				return [];
			}

			const ParentElement = ParentHandle
				? View.handleToElementMap.get(ParentHandle)
				: undefined;

			return yield* G(View.GetChildrenEffect(ParentElement));
		});

	const DisposeTreeViewEffect = (ViewID: string) =>
		Effect.gen(function* (G) {
			const View = (yield* G(Ref.get(ActiveViewsRef))).get(ViewID);

			if (View) {
				View.dispose();

				yield* G(
					Ref.update(
						ActiveViewsRef,

						(Map) => (Map.delete(ViewID), Map),
					),
				);
			}
		});

	// --- Register Handlers ---
	yield* G(
		Effect.sync(() => {
			IPC.RegisterInvokeHandler(
				"$getChildren",

				([ViewID, ParentHandle]) =>
					Effect.runPromise(GetChildrenEffect(ViewID, ParentHandle)),
			);

			IPC.RegisterInvokeHandler("$disposeTreeView", ([ViewID]) =>
				Effect.runPromise(DisposeTreeViewEffect(ViewID)),
			);
		}),
	);

	const TreeViewFactory: Service["Type"] = {
		CreateTreeView: <T>(
			ViewID: string,

			Options: TreeViewOptions<T>,

			Extension: IExtensionDescription,
		) =>
			Effect.gen(function* (G) {
				if ((yield* G(Ref.get(ActiveViewsRef))).has(ViewID)) {
					return yield* G(
						Effect.fail(
							new Error(
								`Tree view '${ViewID}' already registered.`,
							),
						),
					);
				}

				if (!Options.treeDataProvider) {
					return yield* G(
						Effect.fail(
							new Error(
								"TreeViewOptions must include a TreeDataProvider.",
							),
						),
					);
				}

				const OptionDTO = TreeViewConverter.Option.FromAPI(Options);

				yield* G(
					IPC.SendNotification("$registerTreeDataProvider", [
						ViewID,

						OptionDTO,
					]),
				);

				const ExtHostView = new TreeViewImplementation<T>(
					ViewID,

					Options.treeDataProvider,

					IPC,

					Command,

					Extension,
				);

				yield* G(
					Ref.update(ActiveViewsRef, (Map) =>
						Map.set(ViewID, ExtHostView),
					),
				);

				return ExtHostView;
			}),
	};

	return TreeViewFactory;
});
