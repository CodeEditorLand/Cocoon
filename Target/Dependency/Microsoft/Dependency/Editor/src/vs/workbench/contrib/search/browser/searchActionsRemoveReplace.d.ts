import { WorkbenchCompressibleAsyncDataTree } from '../../../../platform/list/browser/listService.js';
import { RenderableMatch, ISearchResult } from './searchTreeModel/searchTreeCommon.js';
export interface ISearchActionContext {
    readonly viewer: WorkbenchCompressibleAsyncDataTree<ISearchResult, RenderableMatch>;
    readonly element: RenderableMatch;
}
export interface IFindInFilesArgs {
    query?: string;
    replace?: string;
    preserveCase?: boolean;
    triggerSearch?: boolean;
    filesToInclude?: string;
    filesToExclude?: string;
    isRegex?: boolean;
    isCaseSensitive?: boolean;
    matchWholeWord?: boolean;
    useExcludeSettingsAndIgnoreFiles?: boolean;
    onlyOpenEditors?: boolean;
}
/**
 * Returns element to focus after removing the given element
 */
export declare function getElementToFocusAfterRemoved(viewer: WorkbenchCompressibleAsyncDataTree<ISearchResult, RenderableMatch>, element: RenderableMatch, elementsToRemove: RenderableMatch[]): Promise<RenderableMatch | undefined>;
/***
 * Finds the last element in the tree with the same type as `element`
 */
export declare function getLastNodeFromSameType(viewer: WorkbenchCompressibleAsyncDataTree<ISearchResult, RenderableMatch>, element: RenderableMatch): Promise<RenderableMatch | undefined>;
