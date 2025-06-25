import { IDisposable } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { EditorInputCapabilities } from '../../../../common/editor.js';
import { EditorInput } from '../../../../common/editor/editorInput.js';
import { IResolvedNotebookEditorModel } from '../../common/notebookCommon.js';
import { INotebookEditorModelResolverService } from '../../common/notebookEditorModelResolverService.js';
import { NotebookCellTextModel } from '../../common/model/notebookCellTextModel.js';
declare class ResolvedNotebookOutputEditorInputModel implements IDisposable {
    readonly resolvedNotebookEditorModel: IResolvedNotebookEditorModel;
    readonly notebookUri: URI;
    readonly cell: NotebookCellTextModel;
    readonly outputId: string;
    constructor(resolvedNotebookEditorModel: IResolvedNotebookEditorModel, notebookUri: URI, cell: NotebookCellTextModel, outputId: string);
    dispose(): void;
}
export declare class NotebookOutputEditorInput extends EditorInput {
    private readonly notebookEditorModelResolverService;
    static readonly ID: string;
    private _notebookRef;
    private readonly _notebookUri;
    readonly cellIndex: number;
    cellUri: URI | undefined;
    readonly outputIndex: number;
    private outputId;
    constructor(notebookUri: URI, cellIndex: number, outputId: string | undefined, outputIndex: number, notebookEditorModelResolverService: INotebookEditorModelResolverService);
    get typeId(): string;
    resolve(): Promise<ResolvedNotebookOutputEditorInputModel>;
    getSerializedData(): {
        notebookUri: URI;
        cellIndex: number;
        outputIndex: number;
    } | undefined;
    getName(): string;
    get editorId(): string;
    get resource(): URI | undefined;
    get capabilities(): EditorInputCapabilities;
    dispose(): void;
}
export {};
