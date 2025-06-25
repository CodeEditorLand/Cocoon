import * as DOM from '../../../../../base/browser/dom.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Event } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IEditorOptions } from '../../../../../platform/editor/common/editor.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { EditorPane } from '../../../../browser/parts/editor/editorPane.js';
import { IWorkbenchContribution } from '../../../../common/contributions.js';
import { IEditorOpenContext } from '../../../../common/editor.js';
import { IEditorGroup } from '../../../../services/editor/common/editorGroupsService.js';
import { IEditorResolverService } from '../../../../services/editor/common/editorResolverService.js';
import { INotebookService } from '../../common/notebookService.js';
import { CellEditState, IBaseCellEditorOptions, ICellOutputViewModel, ICommonCellInfo, IGenericCellViewModel, INotebookEditorCreationOptions } from '../notebookBrowser.js';
import { INotebookDelegateForWebview } from '../view/renderers/backLayerWebView.js';
import { NotebookOutputEditorInput } from './notebookOutputEditorInput.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IEditorOptions as ICodeEditorOptions } from '../../../../../editor/common/config/editorOptions.js';
export declare class NoopCellEditorOptions extends Disposable implements IBaseCellEditorOptions {
    private static fixedEditorOptions;
    private readonly _onDidChange;
    readonly onDidChange: Event<void>;
    private _value;
    get value(): Readonly<ICodeEditorOptions>;
    constructor();
}
export declare class NotebookOutputEditor extends EditorPane implements INotebookDelegateForWebview {
    private readonly instantiationService;
    private readonly configurationService;
    private readonly notebookService;
    static readonly ID: string;
    creationOptions: INotebookEditorCreationOptions;
    private _rootElement;
    private _outputWebview;
    private _fontInfo;
    private _notebookOptions;
    private _notebookViewModel;
    private _isDisposed;
    get isDisposed(): boolean;
    constructor(group: IEditorGroup, instantiationService: IInstantiationService, themeService: IThemeService, telemetryService: ITelemetryService, storageService: IStorageService, configurationService: IConfigurationService, notebookService: INotebookService);
    protected createEditor(parent: HTMLElement): void;
    private get fontInfo();
    private createFontInfo;
    private _createOriginalWebview;
    private _generateFontFamily;
    getTitle(): string;
    setInput(input: NotebookOutputEditorInput, options: IEditorOptions | undefined, context: IEditorOpenContext, token: CancellationToken): Promise<void>;
    private _renderMissingRenderer;
    private _renderMessage;
    private _renderSearchForMimetype;
    scheduleOutputHeightAck(cellInfo: ICommonCellInfo, outputId: string, height: number): void;
    focusNotebookCell(cell: IGenericCellViewModel, focus: 'output' | 'editor' | 'container'): Promise<void>;
    focusNextNotebookCell(cell: IGenericCellViewModel, focus: 'output' | 'editor' | 'container'): Promise<void>;
    toggleNotebookCellSelection(cell: IGenericCellViewModel): void;
    getCellById(cellId: string): IGenericCellViewModel | undefined;
    getCellByInfo(cellInfo: ICommonCellInfo): IGenericCellViewModel;
    layout(dimension: DOM.Dimension, position: DOM.IDomPosition): void;
    setScrollTop(scrollTop: number): void;
    triggerScroll(event: any): void;
    getOutputRenderer(): any;
    updateOutputHeight(cellInfo: ICommonCellInfo, output: ICellOutputViewModel, height: number, isInit: boolean, source?: string): void;
    updateMarkupCellHeight(cellId: string, height: number, isInit: boolean): void;
    setMarkupCellEditState(cellId: string, editState: CellEditState): void;
    didResizeOutput(cellId: string): void;
    didStartDragMarkupCell(cellId: string, event: {
        dragOffsetY: number;
    }): void;
    didDragMarkupCell(cellId: string, event: {
        dragOffsetY: number;
    }): void;
    didDropMarkupCell(cellId: string, event: {
        dragOffsetY: number;
        ctrlKey: boolean;
        altKey: boolean;
    }): void;
    didEndDragMarkupCell(cellId: string): void;
    updatePerformanceMetadata(cellId: string, executionId: string, duration: number, rendererId: string): void;
    didFocusOutputInputChange(inputFocused: boolean): void;
    dispose(): void;
}
export declare class NotebookOutputEditorContribution implements IWorkbenchContribution {
    private readonly instantiationService;
    private readonly uriIdentityService;
    static readonly ID = "workbench.contribution.notebookOutputEditorContribution";
    constructor(editorResolverService: IEditorResolverService, instantiationService: IInstantiationService, uriIdentityService: IUriIdentityService);
}
