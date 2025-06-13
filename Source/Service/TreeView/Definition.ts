/**
 * @module Definition (TreeView)
 * @description The live implementation of the TreeView service factory.
 */

import { Effect, Ref } from "effect";

import * as TypeConverter from "../../TypeConverter.js";
import { Commands } from "../Command.js";
import { IpcProvider } from "../Ipc.js";
import type { Interface } from "./Service.js";
import { TreeViewImpl } from "./TreeViewImpl.js";

export const Definition = Effect.gen(function* (_) {
	const Ipc = yield* _(IpcProvider.Tag);
	const CommandsService = yield* _(Commands.Tag);
	const ActiveViews = yield* _(
		Ref.make(new Map<string, TreeViewImpl<any>>()),
	);

	// Register RPC handler for when Mountain needs children
	Ipc.RegisterInvokeHandler("$getChildren", ([ViewId, ParentHandle]) => {
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
		CreateTreeView: (ViewId, Options, Extension) =>
			Effect.gen(function* (_) {
				if (!Options.treeDataProvider) {
					return yield* _(
						Effect.fail(
							new Error(
								"TreeViewOptions must include a TreeDataProvider.",
							),
						),
					);
				}

				const OptionsDto =
					TypeConverter.TreeView.Options.fromApi(Options);
				yield* _(
					Ipc.SendNotification("$registerTreeDataProvider", [
						ViewId,
						OptionsDto,
					]),
				);

				const ExtHostView = new TreeViewImpl(
					ViewId,
					Options.treeDataProvider,
					Ipc,
					(CommandsService as any).converter,
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
