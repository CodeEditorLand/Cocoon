/**
 * @module TreeView
 * @description Defines the service for creating and managing `vscode.TreeView` instances.
 * This service acts as a factory, handling the registration of tree data providers
 * with the host and managing the lifecycle of each tree view.
 */

import { Effect, Ref } from "effect";
import type { Event } from "vs/base/common/event.js";
import { generateUuid } from "vs/base/common/uuid.js";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import {
	type TreeCheckboxChangeEvent,
	type TreeDataProvider,
	type TreeItem,
	type TreeView as VSCodeTreeView,
	type TreeViewActiveItemChangeEvent,
	type TreeViewExpansionEvent,
	type TreeViewOptions,
	type TreeViewVisibilityChangeEvent,
} from "vscode";
import { FromAPI as TreeViewOptionToDTO } from "./TypeConverter/TreeView/Option.js";
import { FromAPI as TreeViewItemToDTO } from "./TypeConverter/TreeView/Item.js";
import { CreateEventStream } from "./Utility/CreateEventStream.js";
import { IPC, IPCService } from "./IPC.js";

/**
 * @class TreeViewImplementation
 * @description An internal class that implements the `vscode.TreeView` interface. It
 * manages the state and events for a single tree view instance, proxying requests
 * for data to the user-provided `TreeDataProvider`.
 * @implements {VSCodeTreeView<T>}
 */
class TreeViewImplementation<T> implements VSCodeTreeView<T> {
	private readonly ElementToHandleMap = new Map<T, string>();
	public readonly handleToElementMap = new Map<string, T>();
	private readonly OnDidExpandElementEmitter =
		CreateEventStream<TreeViewExpansionEvent<T>>();
	readonly onDidExpandElement: Event<TreeViewExpansionEvent<T>>;
	private readonly OnDidCollapseElementEmitter =
		CreateEventStream<TreeViewExpansionEvent<T>>();
	readonly onDidCollapseElement: Event<TreeViewExpansionEvent<T>>;
	private readonly OnDidChangeSelectionEmitter = CreateEventStream<any>();
	readonly onDidChangeSelection: Event<any>;
	private readonly OnDidChangeVisibilityEmitter =
		CreateEventStream<TreeViewVisibilityChangeEvent>();
	readonly onDidChangeVisibility: Event<TreeViewVisibilityChangeEvent>;
	private readonly OnDidChangeCheckboxStateEmitter =
		CreateEventStream<TreeCheckboxChangeEvent<T>>();
	readonly onDidChangeCheckboxState: Event<TreeCheckboxChangeEvent<T>>;
	activeItem: T | undefined;
	onDidChangeActiveItem: Event<TreeViewActiveItemChangeEvent<T>>;
	selection: readonly T[] = [];
	visible = true;
	message?: string;
	title?: string;
	description?: string;
	badge?: { value: number; tooltip: string };

	constructor(
		private readonly ViewId: string,
		private readonly DataProvider: TreeDataProvider<T>,
		private readonly IPC: IPC,
		private readonly Extension: IExtensionDescription,
	) {
		this.onDidExpandElement = this.OnDidExpandElementEmitter.event;
		this.onDidCollapseElement = this.OnDidCollapseElementEmitter.event;
		this.onDidChangeSelection = this.OnDidChangeSelectionEmitter.event;
		this.onDidChangeVisibility = this.OnDidChangeVisibilityEmitter.event;
		this.onDidChangeCheckboxState =
			this.OnDidChangeCheckboxStateEmitter.event;

		if (this.DataProvider.onDidChangeTreeData) {
			this.DataProvider.onDidChangeTreeData((Elements) => {
				const HandlesToRefresh = this.GetHandlesToRefresh(Elements);
				Effect.runFork(
					this.IPC.SendNotification(`$refreshTreeView`, [
						this.ViewId,
						HandlesToRefresh,
					]),
				);
			});
		}
	}

	public GetChildren(Element?: T): Effect.Effect<any[], Error> {
		return Effect.tryPromise({
			try: () => this.DataProvider.getChildren(Element) as Promise<T[]>,
			catch: (CaughtError) => CaughtError as Error,
		}).pipe(
			Effect.flatMap((Children) => {
				if (!Children) return Effect.succeed([]);
				const ItemEffects = Children.map((Child) =>
					this.ResolveAndCacheItem(Child, undefined),
				);
				return Effect.all(ItemEffects);
			}),
		);
	}

	private ResolveAndCacheItem(
		Element: T,
		ParentHandle: string | undefined,
	): Effect.Effect<any, Error> {
		return Effect.tryPromise({
			try: () =>
				this.DataProvider.getTreeItem(Element) as Promise<TreeItem>,
			catch: (CaughtError) => CaughtError as Error,
		}).pipe(
			Effect.map((TreeItem) => {
				const Handle = this.GetHandleForElement(Element);
				// This converter would need a live command instance.
				const CommandConverter = new (class {
					ToInternal = (c: any) => c;
				})();
				return TreeViewItemToDTO(
					this.Extension,
					TreeItem,
					Handle,
					ParentHandle,
					CommandConverter as any,
				);
			}),
		);
	}

	private GetHandleForElement(Element: T): string {
		if (this.ElementToHandleMap.has(Element)) {
			return this.ElementToHandleMap.get(Element)!;
		}
		const Handle = generateUuid();
		this.ElementToHandleMap.set(Element, Handle);
		this.handleToElementMap.set(Handle, Element);
		return Handle;
	}

	private GetHandlesToRefresh(
		Elements: void | T | readonly T[] | null | undefined,
	): (string | null)[] | undefined {
		if (Elements === null || Elements === undefined) return undefined;
		if (Array.isArray(Elements)) {
			return Elements.map(
				(Element) => this.ElementToHandleMap.get(Element) || null,
			);
		}
		return [this.ElementToHandleMap.get(Elements as T) || null];
	}

	reveal(
		Element: T,
		Options?: {
			select?: boolean;
			focus?: boolean;
			expand?: boolean | number;
		},
	): Promise<void> {
		return Effect.runPromise(
			this.IPC.SendNotification("$revealTreeViewItem", [
				this.ViewId,
				this.GetHandleForElement(Element),
				Options,
			]),
		);
	}

	dispose() {
		this.OnDidExpandElementEmitter.Shutdown();
		this.OnDidCollapseElementEmitter.Shutdown();
		this.OnDidChangeSelectionEmitter.Shutdown();
		this.OnDidChangeVisibilityEmitter.Shutdown();
		this.OnDidChangeCheckboxStateEmitter.Shutdown();
		this.ElementToHandleMap.clear();
		this.handleToElementMap.clear();
	}
}

/**
 * @interface TreeView
 * @description The contract for the TreeView service factory.
 */
export interface TreeView {
	readonly CreateTreeView: <T>(
		ViewId: string,
		Options: TreeViewOptions<T>,
		Extension: IExtensionDescription,
	) => Effect.Effect<VSCodeTreeView<T>, Error>;
}

/**
 * @class TreeView
 * @description The `Effect.Service` for the TreeView service.
 */
export class TreeViewService extends Effect.Service<TreeViewService>()(
	"Service/TreeView",
	{
		effect: Effect.gen(function* () {
			const IPC = yield* IPCService;
			const ActiveViewsRef = yield* Ref.make(
				new Map<string, TreeViewImplementation<any>>(),
			);

			// --- RPC Handlers ---
			const GetChildren = (ViewId: string, ParentHandle?: string) =>
				Effect.gen(function* () {
					const View = (yield* Ref.get(ActiveViewsRef)).get(ViewId);
					if (!View) return [];
					const ParentElement = ParentHandle
						? View.handleToElementMap.get(ParentHandle)
						: undefined;
					return yield* View.GetChildren(ParentElement);
				});

			const DisposeTreeView = (ViewId: string) =>
				Effect.gen(function* () {
					const View = (yield* Ref.get(ActiveViewsRef)).get(ViewId);
					if (View) {
						View.dispose();
						yield* Ref.update(
							ActiveViewsRef,
							(Map) => (Map.delete(ViewId), Map),
						);
					}
				});

			IPC.RegisterInvokeHandler(
				"$getChildren",
				([ViewId, ParentHandle]) =>
					Effect.runPromise(GetChildren(ViewId, ParentHandle)),
			);
			IPC.RegisterInvokeHandler("$disposeTreeView", ([ViewId]) =>
				Effect.runPromise(DisposeTreeView(ViewId)),
			);

			return {
				CreateTreeView: <T>(
					ViewId: string,
					Options: TreeViewOptions<T>,
					Extension: IExtensionDescription,
				) =>
					Effect.gen(function* () {
						if ((yield* Ref.get(ActiveViewsRef)).has(ViewId)) {
							return yield* Effect.fail(
								new Error(
									`Tree view '${ViewId}' already registered.`,
								),
							);
						}
						if (!Options.treeDataProvider) {
							return yield* Effect.fail(
								new Error(
									"TreeViewOptions must include a TreeDataProvider.",
								),
							);
						}
						const OptionDTO = TreeViewOptionToDTO(Options);
						yield* IPC.SendNotification(
							"$registerTreeDataProvider",
							[ViewId, OptionDTO],
						);
						const ExtHostView = new TreeViewImplementation<T>(
							ViewId,
							Options.treeDataProvider,
							IPC,
							Extension,
						);
						yield* Ref.update(ActiveViewsRef, (Map) =>
							Map.set(ViewId, ExtHostView),
						);
						return ExtHostView;
					}),
			};
		}),
	},
) {}
