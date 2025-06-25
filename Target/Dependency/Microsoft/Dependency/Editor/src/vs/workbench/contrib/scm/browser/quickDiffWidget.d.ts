import { Action, IAction } from '../../../../base/common/actions.js';
import { IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { ISelectOptionItem } from '../../../../base/browser/ui/selectBox/selectBox.js';
import { SelectActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ICodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { EditorAction } from '../../../../editor/browser/editorExtensions.js';
import { IInstantiationService, ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { IEditorContribution } from '../../../../editor/common/editorCommon.js';
import { IQuickDiffModelService } from './quickDiffModel.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { QuickDiff } from '../common/quickDiff.js';
export declare const isQuickDiffVisible: RawContextKey<boolean>;
export interface IQuickDiffSelectItem extends ISelectOptionItem {
    providerId: string;
}
export declare class QuickDiffPickerViewItem extends SelectActionViewItem<IQuickDiffSelectItem> {
    private optionsItems;
    constructor(action: IAction, contextViewService: IContextViewService, themeService: IThemeService, configurationService: IConfigurationService);
    setSelection(quickDiffs: QuickDiff[], providerId: string): void;
    protected getActionContext(_: string, index: number): IQuickDiffSelectItem;
    render(container: HTMLElement): void;
}
export declare class QuickDiffPickerBaseAction extends Action {
    private readonly callback;
    static readonly ID = "quickDiff.base.switch";
    static readonly LABEL: string;
    constructor(callback: (event?: IQuickDiffSelectItem) => void);
    run(event?: IQuickDiffSelectItem): Promise<void>;
}
export declare class QuickDiffEditorController extends Disposable implements IEditorContribution {
    private editor;
    private readonly configurationService;
    private readonly quickDiffModelService;
    private readonly instantiationService;
    static readonly ID = "editor.contrib.quickdiff";
    static get(editor: ICodeEditor): QuickDiffEditorController | null;
    private model;
    private widget;
    private readonly isQuickDiffVisible;
    private session;
    private mouseDownInfo;
    private enabled;
    private readonly gutterActionDisposables;
    private stylesheet;
    constructor(editor: ICodeEditor, contextKeyService: IContextKeyService, configurationService: IConfigurationService, quickDiffModelService: IQuickDiffModelService, instantiationService: IInstantiationService);
    private onDidChangeGutterAction;
    canNavigate(): boolean;
    refresh(): void;
    next(lineNumber?: number): void;
    previous(lineNumber?: number): void;
    close(): void;
    private assertWidget;
    private onDidModelChange;
    private onEditorMouseDown;
    private onEditorMouseUp;
    dispose(): void;
}
export declare class ShowPreviousChangeAction extends EditorAction {
    private readonly outerEditor?;
    constructor(outerEditor?: ICodeEditor | undefined);
    run(accessor: ServicesAccessor): void;
}
export declare class ShowNextChangeAction extends EditorAction {
    private readonly outerEditor?;
    constructor(outerEditor?: ICodeEditor | undefined);
    run(accessor: ServicesAccessor): void;
}
export declare class GotoPreviousChangeAction extends EditorAction {
    constructor();
    run(accessor: ServicesAccessor): Promise<void>;
}
export declare class GotoNextChangeAction extends EditorAction {
    constructor();
    run(accessor: ServicesAccessor): Promise<void>;
}
