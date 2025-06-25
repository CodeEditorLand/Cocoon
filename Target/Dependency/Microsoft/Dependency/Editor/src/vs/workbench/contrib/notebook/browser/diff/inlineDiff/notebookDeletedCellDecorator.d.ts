import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { NotebookTextModel } from '../../../common/model/notebookTextModel.js';
import { CellDiffInfo } from '../notebookDiffViewModel.js';
import { INotebookEditor } from '../../notebookBrowser.js';
import { MenuId } from '../../../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
export interface INotebookDeletedCellDecorator {
    getTop(deletedIndex: number): number | undefined;
}
export declare class NotebookDeletedCellDecorator extends Disposable implements INotebookDeletedCellDecorator {
    private readonly _notebookEditor;
    private readonly toolbar;
    private readonly languageService;
    private readonly instantiationService;
    private readonly zoneRemover;
    private readonly createdViewZones;
    private readonly deletedCellInfos;
    constructor(_notebookEditor: INotebookEditor, toolbar: {
        menuId: MenuId;
        className: string;
        telemetrySource?: string;
        argFactory: (deletedCellIndex: number) => any;
    } | undefined, languageService: ILanguageService, instantiationService: IInstantiationService);
    getTop(deletedIndex: number): number | undefined;
    reveal(deletedIndex: number): void;
    apply(diffInfo: CellDiffInfo[], original: NotebookTextModel): void;
    clear(): void;
    private _createWidget;
    private _createWidgetImpl;
}
export declare class NotebookDeletedCellWidget extends Disposable {
    private readonly _notebookEditor;
    private readonly _toolbarOptions;
    private readonly code;
    private readonly language;
    private readonly _originalIndex;
    private readonly languageService;
    private readonly instantiationService;
    private readonly container;
    constructor(_notebookEditor: INotebookEditor, _toolbarOptions: {
        menuId: MenuId;
        className: string;
        telemetrySource?: string;
        argFactory: (deletedCellIndex: number) => any;
    } | undefined, code: string, language: string, container: HTMLElement, _originalIndex: number, languageService: ILanguageService, instantiationService: IInstantiationService);
    render(): Promise<number>;
}
