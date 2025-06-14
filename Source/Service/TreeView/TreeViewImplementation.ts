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

import { TreeView as TreeViewConverter } from "../../TypeConverter.js";
import { Definition as CommandConverterDefinition } from "../../TypeConverter/Command.js";
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
		private readonly IPC: IPCService,
		private readonly CommandService: CommandService,
		private readonly Extension: IExtensionDescription,
	) {
		this.onDidExpandElement = this.OnDidExpandElementEmitter.event;
		this.onDidCollapseElement = this.OnDidCollapseElementEmitter.event;
		this.onDidChangeSelection = this.OnDidChangeSelectionEmitter.event;
		this.onDidChangeVisibility = this.OnDidChangeVisibilityEmitter.event;

		if (this.DataProvider.onDidChangeTreeData) {
			this.DataProvider.onDidChangeTreeData((Elements) => {
				const HandlesToRefresh = this.GetHandlesToRefresh(Elements);
				this.IPC.SendNotification(`$refreshTreeView`, [
					this.ViewID,
					HandlesToRefresh,
				]);
			});
		}
	}

	public GetChildrenEffect(Element?: T): Effect.Effect<any[]> {
		return Effect.tryPromise({
			try: () => this.DataProvider.getChildren(Element),
			catch: (CaughtError) => CaughtError as Error,
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

	private ResolveAndCacheItem(Element: T) {
		return Effect.tryPromise({
			try: () => this.DataProvider.getTreeItem(Element),
			catch: (CaughtError) => CaughtError as Error,
		}).pipe(
			Effect.map((TreeItem) => {
				const Handle = this.GetHandleForElement(Element);
				// This is a temporary fix. A real implementation should inject the converter.
				const CommandConverter = new CommandConverterDefinition(
					this.CommandService,
					() => undefined,
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
		Elements: T | readonly T[] | undefined | null,
	): (string | null)[] | undefined {
		if (Elements === null || Elements === undefined) {
			return undefined;
		}
		if (Array.isArray(Elements)) {
			return Elements.map(
				(Element) => this.ElementToHandleMap.get(Element) || null,
			);
		}
		return [this.ElementToHandleMap.get(Elements) || null];
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
}
