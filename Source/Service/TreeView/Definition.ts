/**
 * @module Definition (TreeView)
 * @description The live implementation of the TreeView service factory.
 */

import { Effect, Ref } from "effect";

import * as TypeConverter from "../../TypeConverter.js";
import { Command } from "../Command.js";
import { IPC } from "../IPC.js";
import type { Interface } from "./Service.js";
import { TreeViewImplementation } from "./TreeViewImplementation.js";

export const Definition = Effect.gen(function* (_) {
	const IPCService = yield* _(IPC.Tag);
	const CommandService = yield* _(Command.Tag);
	const ActiveViews = yield* _(
		Ref.make(new Map<string, TreeViewImplementation<any>>()),
	);

	// --- RPC Handlers from Mountain ---
	IPCService.RegisterInvokeHandler("$getChildren", ([ViewID, ParentHandle]) =>
		Effect.gen(function* (_) {
			const view = (yield* _(Ref.get(ActiveViews))).get(ViewID);
			if (!view) {
				return [];
			}
			const parentElement = ParentHandle
				? view["handleToElementMap"].get(ParentHandle)
				: undefined;
			return yield* _(view.getChildrenEffect(parentElement));
		}).pipe(Effect.runPromise),
	);

	IPCService.RegisterInvokeHandler("$disposeTreeView", ([ViewID]) =>
		Effect.gen(function* (_) {
			const view = (yield* _(Ref.get(ActiveViews))).get(ViewID);
			if (view) {
				view.dispose();
				yield* _(
					Ref.update(ActiveViews, (map) => (map.delete(ViewID), map)),
				);
			}
		}).pipe(Effect.runPromise),
	);

	const ServiceImplementation: Interface = {
		CreateTreeView: (ViewID, Option, Extension) =>
			Effect.gen(function* (_) {
				if ((yield* _(Ref.get(ActiveViews))).has(ViewID)) {
					return yield* _(
						Effect.fail(
							new Error(
								`Tree view '${ViewID}' already registered.`,
							),
						),
					);
				}
				if (!Option.treeDataProvider) {
					return yield* _(
						Effect.fail(
							new Error(
								"TreeViewOptions must include a TreeDataProvider.",
							),
						),
					);
				}

				const OptionDTO = TypeConverter.TreeView.Option.FromAPI(Option);
				yield* _(
					IPCService.SendNotification("$registerTreeDataProvider", [
						ViewID,
						OptionDTO,
					]),
				);

				const ExtHostView = new TreeViewImplementation(
					ViewID,
					Option.treeDataProvider,
					IPCService,
					CommandService,
					Extension,
				);
				yield* _(
					Ref.update(ActiveViews, (map) =>
						map.set(ViewID, ExtHostView),
					),
				);

				return ExtHostView;
			}),
	};

	return ServiceImplementation;
});
