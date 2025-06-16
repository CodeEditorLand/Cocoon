/**
 * @module TreeViewImplementation
 * @description The controller class that manages a single tree view and its data provider.
 * This class acts as the extension host's proxy for a tree view in the main UI.
 */

import { Effect } from "effect";
import { Emitter } from "vs/base/common/event.js";
import { generateUuid } from "vs/base/common/uuid.js";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type {
	Event,
	TreeDataProvider,
	TreeItem,
	TreeView,
	TreeViewActiveItemChangeEvent,
	TreeViewExpansionEvent,
	TreeViewSelectionChangeEvent,
	TreeViewVisibilityChangeEvent,
} from "vscode";

import { Definition as CommandConverterDefinition } from "../../TypeConverter/Command.js";
import { TreeView as TreeViewConverter } from "../../TypeConverter/TreeView.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import type CommandService from "../Command/Service.js";
import type IPCService from "../IPC/Service.js";

export default class<T> implements TreeView<T> {
	private readonly ElementToHandleMap = new Map<T, string>();
	public readonly handleToElementMap = new Map<string, T>();

	private readonly OnDidExpandElementEmitter =
		CreateEventStream<TreeViewExpansionEvent<T>>();
	readonly onDidExpandElement: Event<TreeViewExpansionEvent<T>>;

	private readonly OnDidCollapseElementEmitter =
		CreateEventStream<TreeViewExpansionEvent<T>>();
	readonly onDidCollapseElement: Event<TreeViewExpansionEvent<T>>;

	private readonly OnDidChangeSelectionEmitter =
		CreateEventStream<TreeViewSelectionChangeEvent<T>>();
	readonly onDidChangeSelection: Event<TreeViewSelectionChangeEvent<T>>;

	private readonly OnDidChangeVisibilityEmitter =
		CreateEventStream<TreeViewVisibilityChangeEvent>();
	readonly onDidChangeVisibility: Event<TreeViewVisibilityChangeEvent>;

	constructor(
		private readonly ViewID: string,
		private readonly DataProvider: TreeDataProvider<T>,
		private readonly IPC: IPCService["Type"],
		private readonly Command: CommandService["Type"],
		private readonly Extension: IExtensionDescription,
	) {
		this.onDidExpandElement = this.OnDidExpandElementEmitter.event;
		this.onDidCollapseElement = this.OnDidCollapseElementEmitter.event;
		this.onDidChangeSelection = this.OnDidChangeSelectionEmitter.event;
		this.onDidChangeVisibility = this.OnDidChangeVisibilityEmitter.event;

		if (this.DataProvider.onDidChangeTreeData) {
			this.DataProvider.onDidChangeTreeData((Elements) => {
				const HandlesToRefresh = this.GetHandlesToRefresh(Elements);
				Effect.runFork(
					this.IPC.SendNotification(`$refreshTreeView`, [
						this.ViewID,
						HandlesToRefresh,
					]),
				);
			});
		}
	}

	public GetChildrenEffect(Element?: T): Effect.Effect<any[], Error> {
		return Effect.tryPromise({
			try: () => this.DataProvider.getChildren(Element) as Promise<T[]>,
			catch: (CaughtError) => CaughtError,
		}).pipe(
			Effect.flatMap((Children) => {
				if (!Children) {
					return Effect.succeed([]);
				}
				const ItemEffects = Children.map((Child) =>
					this.ResolveAndCacheItem(Child),
				);
				return Effect.all(ItemEffects);
			}),
		);
	}

	private ResolveAndCacheItem(Element: T): Effect.Effect<any, Error> {
		return Effect.tryPromise({
			try: () =>
				this.DataProvider.getTreeItem(Element) as Promise<TreeItem>,
			catch: (CaughtError) => CaughtError,
		}).pipe(
			Effect.map((TreeItem) => {
				const Handle = this.GetHandleForElement(Element);
				// A real CommandConverter would be injected.
				const CommandConverter = new CommandConverterDefinition(
					() => undefined, // LookupAPICommand placeholder
				);
				return TreeViewConverter.Item.FromAPI(
					this.Extension,
					TreeItem,
					Handle,
					undefined,
					CommandConverter,
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
		if (
			Elements === null ||
			Elements === undefined ||
			Elements === void 0
		) {
			return undefined;
		}
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
				this.ViewID,
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
		this.ElementToHandleMap.clear();
		this.handleToElementMap.clear();
	}

	selection: readonly T[] = [];
	visible = true;
	message?: string;
	title?: string;
	description?: string;
	badge?: { value: number; tooltip: string };
	activeItem: T | undefined;
	onDidChangeActiveItem: Event<TreeViewActiveItemChangeEvent<T>> =
		new Emitter<TreeViewActiveItemChangeEvent<T>>().event;
	onDidChangeCheckboxState: Event<any> = new Emitter<any>().event;
}
