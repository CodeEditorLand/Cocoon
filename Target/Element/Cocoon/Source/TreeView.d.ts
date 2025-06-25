/**
 * @module TreeView
 * @description Defines the service for creating and managing `vscode.TreeView` instances.
 * This service acts as a factory, handling the registration of tree data providers
 * with the host and managing the lifecycle of each tree view.
 */
import { Effect } from "effect";
import type { Event } from "vs/base/common/event.js";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type { TreeCheckboxChangeEvent, TreeDataProvider, TreeViewExpansionEvent, TreeViewOptions, TreeViewVisibilityChangeEvent, TreeView as VSCodeTreeView } from "vscode";
import { type IPC, IPCService } from "./IPC.js";
/**
 * @class TreeViewImplementation
 * @description An internal class that implements the `vscode.TreeView` interface. It
 * manages the state and events for a single tree view instance, proxying requests
 * for data to the user-provided `TreeDataProvider`.
 * @implements {VSCodeTreeView<T>}
 */
declare class TreeViewImplementation<T> implements VSCodeTreeView<T> {
    private readonly ViewId;
    private readonly DataProvider;
    private readonly IPC;
    private readonly Extension;
    private readonly ElementToHandleMap;
    readonly handleToElementMap: Map<string, T>;
    private readonly OnDidExpandElementEmitter;
    readonly onDidExpandElement: Event<TreeViewExpansionEvent<T>>;
    private readonly OnDidCollapseElementEmitter;
    readonly onDidCollapseElement: Event<TreeViewExpansionEvent<T>>;
    private readonly OnDidChangeSelectionEmitter;
    readonly onDidChangeSelection: Event<any>;
    private readonly OnDidChangeVisibilityEmitter;
    readonly onDidChangeVisibility: Event<TreeViewVisibilityChangeEvent>;
    private readonly OnDidChangeCheckboxStateEmitter;
    readonly onDidChangeCheckboxState: Event<TreeCheckboxChangeEvent<T>>;
    private readonly OnDidChangeActiveItemEmitter;
    readonly onDidChangeActiveItem: Event<T>;
    activeItem: T | undefined;
    selection: readonly T[];
    visible: boolean;
    message?: string;
    title?: string;
    description?: string;
    badge?: {
        value: number;
        tooltip: string;
    };
    constructor(ViewId: string, DataProvider: TreeDataProvider<T>, IPC: IPC, Extension: IExtensionDescription);
    GetChildren(Element?: T): Effect.Effect<any[], Error>;
    private ResolveAndCacheItem;
    private GetHandleForElement;
    private GetHandlesToRefresh;
    reveal(Element: T, Options?: {
        select?: boolean;
        focus?: boolean;
        expand?: boolean | number;
    }): Promise<void>;
    dispose(): void;
}
/**
 * @interface TreeView
 * @description The contract for the TreeView service factory.
 */
export interface TreeView {
    readonly CreateTreeView: <T>(ViewId: string, Options: TreeViewOptions<T>, Extension: IExtensionDescription) => Effect.Effect<VSCodeTreeView<T>, Error>;
}
declare const TreeViewService_base: Effect.Service.Class<TreeViewService, "Service/TreeView", {
    readonly effect: Effect.Effect<{
        CreateTreeView: <T>(ViewId: string, Options: TreeViewOptions<T>, Extension: IExtensionDescription) => Effect.Effect<TreeViewImplementation<T>, Error, never>;
    }, never, IPCService>;
}>;
/**
 * @class TreeView
 * @description The `Effect.Service` for the TreeView service.
 */
export declare class TreeViewService extends TreeViewService_base {
}
export {};
