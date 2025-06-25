import './media/suggest.css';
import * as dom from '../../../../base/browser/dom.js';
import { List } from '../../../../base/browser/ui/list/listWidget.js';
import { ResizableHTMLElement } from '../../../../base/browser/ui/resizable/resizable.js';
import { SimpleCompletionItem } from './simpleCompletionItem.js';
import { LineContext, SimpleCompletionModel } from './simpleCompletionModel.js';
import { type ISimpleSuggestWidgetFontInfo } from './simpleSuggestWidgetRenderer.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
export interface ISimpleSelectedSuggestion<T extends SimpleCompletionItem> {
    item: T;
    index: number;
    model: SimpleCompletionModel<T>;
}
interface IPersistedWidgetSizeDelegate {
    restore(): dom.Dimension | undefined;
    store(size: dom.Dimension): void;
    reset(): void;
}
export declare const SimpleSuggestContext: {
    HasFocusedSuggestion: RawContextKey<boolean>;
    HasNavigated: RawContextKey<boolean>;
    FirstSuggestionFocused: RawContextKey<boolean>;
};
export interface IWorkbenchSuggestWidgetOptions {
    /**
     * The {@link MenuId} to use for the status bar. Items on the menu must use the groups `'left'`
     * and `'right'`.
     */
    statusBarMenuId?: MenuId;
    /**
     * The setting for showing the status bar.
     */
    showStatusBarSettingId?: string;
    /**
     * The setting for selection mode.
     */
    selectionModeSettingId?: string;
}
/**
 * Controls how suggest selection works
*/
export declare const enum SuggestSelectionMode {
    /**
     * Default. Will show a border and only accept via Tab until navigation has occurred. After that, it will show selection and accept via Enter or Tab.
     */
    Partial = "partial",
    /**
     * Always select, what enter does depends on runOnEnter.
     */
    Always = "always",
    /**
     * User needs to press down to select.
     */
    Never = "never"
}
export declare class SimpleSuggestWidget<TModel extends SimpleCompletionModel<TItem>, TItem extends SimpleCompletionItem> extends Disposable {
    private readonly _container;
    private readonly _persistedSize;
    private readonly _options;
    private readonly _getFontInfo;
    private readonly _onDidFontConfigurationChange;
    private readonly _getAdvancedExplainModeDetails;
    private readonly _instantiationService;
    private readonly _configurationService;
    private readonly _storageService;
    private static LOADING_MESSAGE;
    private static NO_SUGGESTIONS_MESSAGE;
    private _state;
    private _explicitlyInvoked;
    private _loadingTimeout?;
    private _completionModel?;
    private _cappedHeight?;
    private _forceRenderingAbove;
    private _explainMode;
    private _preference?;
    private readonly _pendingShowDetails;
    private readonly _pendingLayout;
    private _currentSuggestionDetails?;
    private _focusedItem?;
    private _ignoreFocusEvents;
    readonly element: ResizableHTMLElement;
    private readonly _messageElement;
    private readonly _listElement;
    private readonly _list;
    private _status?;
    private readonly _details;
    private readonly _showTimeout;
    private readonly _onDidSelect;
    readonly onDidSelect: Event<ISimpleSelectedSuggestion<TItem>>;
    private readonly _onDidHide;
    readonly onDidHide: Event<this>;
    private readonly _onDidShow;
    readonly onDidShow: Event<this>;
    private readonly _onDidFocus;
    readonly onDidFocus: Event<ISimpleSelectedSuggestion<TItem>>;
    private readonly _onDidBlurDetails;
    readonly onDidBlurDetails: Event<FocusEvent>;
    get list(): List<TItem>;
    private readonly _ctxSuggestWidgetHasFocusedSuggestion;
    private readonly _ctxSuggestWidgetHasBeenNavigated;
    private readonly _ctxFirstSuggestionFocused;
    constructor(_container: HTMLElement, _persistedSize: IPersistedWidgetSizeDelegate, _options: IWorkbenchSuggestWidgetOptions, _getFontInfo: () => ISimpleSuggestWidgetFontInfo, _onDidFontConfigurationChange: Event<void>, _getAdvancedExplainModeDetails: () => string | undefined, _instantiationService: IInstantiationService, _configurationService: IConfigurationService, _storageService: IStorageService, _contextKeyService: IContextKeyService);
    private _onListFocus;
    private _clearAriaActiveDescendant;
    private _cursorPosition?;
    setCompletionModel(completionModel: TModel): void;
    hasCompletions(): boolean;
    resetWidgetSize(): void;
    showTriggered(explicitlyInvoked: boolean, cursorPosition: {
        top: number;
        left: number;
        height: number;
    }): void;
    showSuggestions(selectionIndex: number, isFrozen: boolean, isAuto: boolean, cursorPosition: {
        top: number;
        left: number;
        height: number;
    }): void;
    private _updateListStyles;
    setLineContext(lineContext: LineContext): void;
    private _setState;
    private _showListAndStatus;
    private _show;
    toggleDetailsFocus(): void;
    toggleDetails(focused?: boolean): void;
    private _showDetails;
    toggleExplainMode(): void;
    hide(): void;
    private _layout;
    _afterRender(): void;
    private _resize;
    private _positionDetails;
    private _getLayoutInfo;
    private _onListMouseDownOrTap;
    private _onListSelection;
    private _select;
    selectNext(): boolean;
    selectNextPage(): boolean;
    selectPrevious(): boolean;
    selectPreviousPage(): boolean;
    getFocusedItem(): ISimpleSelectedSuggestion<TItem> | undefined;
    private _isDetailsVisible;
    private _setDetailsVisible;
    forceRenderingAbove(): void;
    stopForceRenderingAbove(): void;
}
export {};
