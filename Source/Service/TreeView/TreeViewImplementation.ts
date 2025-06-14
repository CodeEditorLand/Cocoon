/**
 * @module TreeViewImplementation
 * @description The controller class that manages a single tree view and its data provider.
 * This class acts as the extension host's proxy for a tree view in the main UI.
 */

import { Effect, Stream } from "effect";
import { generateUuid } from "vs/base/common/uuid.js";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type {
	Event,
	TreeDataProvider,
	TreeItem,
	TreeView,
	TreeViewExpansionEvent,
	TreeViewSelectionChangeEvent,
	TreeViewVisibilityChangeEvent,
} from "vscode";

import * as CommandConverter from "../../TypeConverter/Command/Definition.js";
import * as TreeViewConverter from "../../TypeConverter/TreeView.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import type CommandService from "../Command/Service.js";
import type IPCService from "../IPC/Service.js";

export default class<T> implements TreeView<T> {
	private readonly elementToHandleMap = new Map<T, string>();
	public readonly handleToElementMap = new Map<string, T>();

	private readonly onDidExpandElementEmitter =
		CreateEventStream<TreeViewExpansionEvent<T>>();
	readonly onDidExpandElement: Event<TreeViewExpansionEvent<T>>;

	private readonly onDidCollapseElementEmitter =
		CreateEventStream<TreeViewExpansionEvent<T>>();
	readonly onDidCollapseElement: Event<TreeViewExpansionEvent<T>>;

	private readonly onDidChangeSelectionEmitter =
		CreateEventStream<TreeViewSelectionChangeEvent<T>>();
	readonly onDidChangeSelection: Event<TreeViewSelectionChangeEvent<T>>;

	private readonly onDidChangeVisibilityEmitter =
		CreateEventStream<TreeViewVisibilityChangeEvent>();
	readonly onDidChangeVisibility: Event<TreeViewVisibilityChangeEvent>;

	constructor(
		private readonly viewID: string,
		private readonly dataProvider: TreeDataProvider<T>,
		private readonly ipc: IPCService,
		private readonly commandService: CommandService,
		private readonly extension: IExtensionDescription,
	) {
		this.onDidExpandElement = this.onDidExpandElementEmitter.event;
		this.onDidCollapseElement = this.onDidCollapseElementEmitter.event;
		this.onDidChangeSelection = this.onDidChangeSelectionEmitter.event;
		this.onDidChangeVisibility = this.onDidChangeVisibilityEmitter.event;

		if (this.dataProvider.onDidChangeTreeData) {
			this.dataProvider.onDidChangeTreeData((elements) => {
				const handlesToRefresh = this.getHandlesToRefresh(elements);
				this.ipc.SendNotification(`$refreshTreeView`, [
					this.viewID,
					handlesToRefresh,
				]);
			});
		}
	}

	public getChildrenEffect(element?: T): Effect.Effect<any[]> {
		return Effect.tryPromise({
			try: () => this.dataProvider.getChildren(element),
			catch: (e) => e as Error,
		}).pipe(
			Effect.flatMap((children) => {
				if (!children) {
					return Effect.succeed([]);
				}
				const itemEffects = children.map((child) =>
					this.resolveAndCacheItem(child),
				);
				return Effect.all(itemEffects);
			}),
		);
	}

	private resolveAndCacheItem(element: T) {
		return Effect.tryPromise({
			try: () => this.dataProvider.getTreeItem(element),
			catch: (e) => e as Error,
		}).pipe(
			Effect.map((treeItem) => {
				const handle = this.getHandleForElement(element);
				const commandConverter = new CommandConverter(
					this.commandService,
					() => undefined,
				);
				return TreeViewConverter.Item.FromAPI(
					this.extension,
					treeItem,
					handle,
					undefined,
					commandConverter,
				);
			}),
		);
	}

	private getHandleForElement(element: T): string {
		if (this.elementToHandleMap.has(element)) {
			return this.elementToHandleMap.get(element)!;
		}
		const handle = generateUuid();
		this.elementToHandleMap.set(element, handle);
		this.handleToElementMap.set(handle, element);
		return handle;
	}

	private getHandlesToRefresh(
		elements: T | T[] | undefined | null,
	): (string | null)[] | undefined {
		if (elements === null || elements === undefined) {
			return undefined;
		}
		if (Array.isArray(elements)) {
			return elements.map((e) => this.elementToHandleMap.get(e) || null);
		}
		return [this.elementToHandleMap.get(elements) || null];
	}

	reveal(
		element: T,
		options?: {
			select?: boolean;
			focus?: boolean;
			expand?: boolean | number;
		},
	): Promise<void> {
		return Effect.runPromise(
			this.ipc.SendNotification("$revealTreeViewItem", [
				this.viewID,
				this.getHandleForElement(element),
				options,
			]),
		);
	}

	dispose() {
		this.onDidExpandElementEmitter.Shutdown();
		this.onDidCollapseElementEmitter.Shutdown();
		this.onDidChangeSelectionEmitter.Shutdown();
		this.onDidChangeVisibilityEmitter.Shutdown();
		this.elementToHandleMap.clear();
		this.handleToElementMap.clear();
	}

	selection: readonly T[] = [];
	visible = true;
	message?: string;
	title?: string;
	description?: string;
	badge?: { value: number; tooltip: string };
}
