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

import * as TypeConverter from "../../TypeConverter.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import type { Command as CommandService } from "../Command.js";
import type { IPC } from "../IPC.js";

export class TreeViewImplementation<T> implements TreeView<T> {
	// A map from the extension's data element to its handle.
	private readonly elementToHandleMap = new Map<T, string>();
	private readonly handleToElementMap = new Map<string, T>();

	// --- Public Event Emitters ---
	private readonly onDidExpandElementEmitter =
		CreateEventStream<TreeViewExpansionEvent<T>>();
	readonly onDidExpandElement: Event<TreeViewExpansionEvent<T>> =
		this.onDidExpandElementEmitter.Stream.pipe(Stream.toEvent);

	private readonly onDidCollapseElementEmitter =
		CreateEventStream<TreeViewExpansionEvent<T>>();
	readonly onDidCollapseElement: Event<TreeViewExpansionEvent<T>> =
		this.onDidCollapseElementEmitter.Stream.pipe(Stream.toEvent);

	private readonly onDidChangeSelectionEmitter =
		CreateEventStream<TreeViewSelectionChangeEvent<T>>();
	readonly onDidChangeSelection: Event<TreeViewSelectionChangeEvent<T>> =
		this.onDidChangeSelectionEmitter.Stream.pipe(Stream.toEvent);

	private readonly onDidChangeVisibilityEmitter =
		CreateEventStream<TreeViewVisibilityChangeEvent>();
	readonly onDidChangeVisibility: Event<TreeViewVisibilityChangeEvent> =
		this.onDidChangeVisibilityEmitter.Stream.pipe(Stream.toEvent);

	constructor(
		private readonly viewID: string,
		private readonly dataProvider: TreeDataProvider<T>,
		private readonly ipc: IPC.Interface,
		private readonly commandService: CommandService.Interface,
		private readonly extension: IExtensionDescription,
	) {
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

	public getChildrenEffect(element?: T) {
		return Effect.tryPromise(() =>
			this.dataProvider.getChildren(element),
		).pipe(
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
		return Effect.tryPromise(() =>
			this.dataProvider.getTreeItem(element),
		).pipe(
			Effect.map((treeItem) => {
				const handle = this.getHandleForElement(element);
				const commandConverter = new TypeConverter.Command.Definition(
					this.commandService,
					() => undefined,
				);
				return TypeConverter.TreeView.Item.FromAPI(
					this.extension,
					treeItem,
					handle,
					undefined, // Parent handle is managed by the host
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
			return undefined; // Full refresh
		}
		if (Array.isArray(elements)) {
			return elements.map((e) => this.elementToHandleMap.get(e) || null);
		}
		return [this.elementToHandleMap.get(elements) || null];
	}

	// --- Public API Methods ---
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
		// Clean up emitters and maps
		this.onDidExpandElementEmitter.Shutdown();
		this.onDidCollapseElementEmitter.Shutdown();
		this.onDidChangeSelectionEmitter.Shutdown();
		this.onDidChangeVisibilityEmitter.Shutdown();
		this.elementToHandleMap.clear();
		this.handleToElementMap.clear();
	}

	// --- Stubs for writable properties ---
	selection: readonly T[] = [];
	visible: boolean = true;
	message?: string;
	title?: string;
	description?: string;
	badge?: { value: number; tooltip: string };
}
