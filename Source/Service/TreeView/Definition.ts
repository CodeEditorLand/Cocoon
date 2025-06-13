/**
 * @module Definition (TreeView)
 * @description The live implementation of the TreeView service factory.
 */

import { Effect, Ref } from "effect";

import * as TypeConverter from "../../TypeConverter.js";
import { Command } from "../Command.js";
import { IPCProvider } from "../IPC.js";
import type { Interface } from "./Service.js";
import { TreeViewImpl } from "./TreeViewImpl.js";

export const Definition = Effect.gen(function* (_) {
	const IPC = yield* _(IPCProvider.Tag);
	const CommandService = yield* _(Command.Tag);
	const ActiveViews = yield* _(
		Ref.make(new Map<string, TreeViewImpl<any>>()),
	);

	// Register RPC handler for when Mountain needs children
	IPC.RegisterInvokeHandler("$getChildren", ([ViewId, ParentHandle]) => {
		return Effect.gen(function* (_) {
			const view = (yield* _(Ref.get(ActiveViews))).get(ViewId);
			if (!view) return [];

			const parentElement = ParentHandle
				? view["HandleCache"].get(ParentHandle)
				: undefined;
			return yield* _(view.GetChildrenEffect(parentElement));
		}).pipe(Effect.runPromise);
	});

	const ServiceImplementation: Interface = {
		CreateTreeView: (ViewId, Option, Extension) =>
			Effect.gen(function* (_) {
				if (!Option.treeDataProvider) {
					return yield* _(
						Effect.fail(
							new Error(
								"TreeViewOption must include a TreeDataProvider.",
							),
						),
					);
				}

				const OptionDTO =
					TypeConverter.TreeView.Option.fromAPI(Option);
				yield* _(
					IPC.SendNotification("$registerTreeDataProvider", [
						ViewId,
						OptionDTO,
					]),
				);

				const ExtHostView = new TreeViewImpl(
					ViewId,
					Option.treeDataProvider,
					IPC,
					(CommandService as any).converter,
					Extension,
				);
				yield* _(
					Ref.update(ActiveViews, (map) =>
						map.set(ViewId, ExtHostView),
					),
				);

				return ExtHostView;
			}),
	};

	return ServiceImplementation;
});
