import { ITreeNavigator } from '../../../../../base/browser/ui/tree/tree.js';
import { IDisposable } from '../../../../../base/common/lifecycle.js';
import { RenderableMatch } from '../../browser/searchTreeModel/searchTreeCommon.js';
/**
 * Add stub methods as needed
 */
export declare class MockObjectTree<T, TRef> implements IDisposable {
    private elements;
    get onDidChangeFocus(): import("../../../../workbench.web.main.internal.js").Event<unknown>;
    get onDidChangeSelection(): import("../../../../workbench.web.main.internal.js").Event<unknown>;
    get onDidOpen(): import("../../../../workbench.web.main.internal.js").Event<unknown>;
    get onMouseClick(): import("../../../../workbench.web.main.internal.js").Event<unknown>;
    get onMouseDblClick(): import("../../../../workbench.web.main.internal.js").Event<unknown>;
    get onContextMenu(): import("../../../../workbench.web.main.internal.js").Event<unknown>;
    get onKeyDown(): import("../../../../workbench.web.main.internal.js").Event<unknown>;
    get onKeyUp(): import("../../../../workbench.web.main.internal.js").Event<unknown>;
    get onKeyPress(): import("../../../../workbench.web.main.internal.js").Event<unknown>;
    get onDidFocus(): import("../../../../workbench.web.main.internal.js").Event<unknown>;
    get onDidBlur(): import("../../../../workbench.web.main.internal.js").Event<unknown>;
    get onDidChangeCollapseState(): import("../../../../workbench.web.main.internal.js").Event<unknown>;
    get onDidChangeRenderNodeCount(): import("../../../../workbench.web.main.internal.js").Event<unknown>;
    get onDidDispose(): import("../../../../workbench.web.main.internal.js").Event<unknown>;
    get lastVisibleElement(): any;
    constructor(elements: any[]);
    domFocus(): void;
    collapse(location: TRef, recursive?: boolean): boolean;
    expand(location: TRef, recursive?: boolean): boolean;
    navigate(start?: TRef): ITreeNavigator<T>;
    getParentElement(elem: RenderableMatch): import("../../browser/searchTreeModel/searchTreeCommon.js").ISearchTreeFileMatch | import("../../browser/searchTreeModel/searchTreeCommon.js").ITextSearchHeading | import("../../browser/searchTreeModel/searchTreeCommon.js").ISearchTreeFolderMatch | import("../../browser/searchTreeModel/searchTreeCommon.js").ISearchResult;
    dispose(): void;
}
