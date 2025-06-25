import '../media/chatEditorController.css';
import { IObservable } from '../../../../../base/common/observable.js';
import { ICodeEditor } from '../../../../../editor/browser/editorBrowser.js';
import { IDocumentDiff } from '../../../../../editor/common/diff/documentDiffProvider.js';
import { DetailedLineRangeMapping } from '../../../../../editor/common/diff/rangeMapping.js';
import { ITextModel } from '../../../../../editor/common/model.js';
import { IAccessibilitySignalService } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IChatAgentService } from '../../common/chatAgents.js';
import { IModifiedFileEntry, IModifiedFileEntryChangeHunk, IModifiedFileEntryEditorIntegration } from '../../common/chatEditingService.js';
export interface IDocumentDiff2 extends IDocumentDiff {
    originalModel: ITextModel;
    modifiedModel: ITextModel;
    keep(changes: DetailedLineRangeMapping): Promise<boolean>;
    undo(changes: DetailedLineRangeMapping): Promise<boolean>;
}
export declare class ChatEditingCodeEditorIntegration implements IModifiedFileEntryEditorIntegration {
    private readonly _entry;
    private readonly _editor;
    private readonly _chatAgentService;
    private readonly _editorService;
    private readonly _accessibilitySignalsService;
    private static readonly _diffLineDecorationData;
    private readonly _currentIndex;
    readonly currentIndex: IObservable<number>;
    private readonly _store;
    private readonly _diffLineDecorations;
    private readonly _diffVisualDecorations;
    private readonly _diffHunksRenderStore;
    private readonly _diffHunkWidgets;
    private _viewZones;
    private readonly _accessibleDiffViewVisible;
    constructor(_entry: IModifiedFileEntry, _editor: ICodeEditor, documentDiffInfo: IObservable<IDocumentDiff2>, renderDiffImmediately: boolean, _chatAgentService: IChatAgentService, _editorService: IEditorService, _accessibilitySignalsService: IAccessibilitySignalService, instantiationService: IInstantiationService);
    dispose(): void;
    private _clear;
    private _clearDiffRendering;
    private _updateDiffRendering;
    enableAccessibleDiffView(): void;
    reveal(firstOrLast: boolean, preserveFocus?: boolean): void;
    next(wrap: boolean): boolean;
    previous(wrap: boolean): boolean;
    private _reveal;
    private _findClosestWidget;
    rejectNearestChange(closestWidget?: IModifiedFileEntryChangeHunk): Promise<void>;
    acceptNearestChange(closestWidget?: IModifiedFileEntryChangeHunk): Promise<void>;
    toggleDiff(widget: IModifiedFileEntryChangeHunk | undefined, show?: boolean): Promise<void>;
}
