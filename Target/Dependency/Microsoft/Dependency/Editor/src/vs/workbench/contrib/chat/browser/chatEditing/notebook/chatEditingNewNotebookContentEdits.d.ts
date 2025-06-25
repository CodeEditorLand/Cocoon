import { TextEdit } from '../../../../../../editor/common/languages.js';
import { NotebookTextModel } from '../../../../notebook/common/model/notebookTextModel.js';
import { ICellEditOperation } from '../../../../notebook/common/notebookCommon.js';
import { INotebookService } from '../../../../notebook/common/notebookService.js';
/**
 * When asking LLM to generate a new notebook, LLM might end up generating the notebook
 * using the raw file format.
 * E.g. assume we ask LLM to generate a new Github Issues notebook, LLM might end up
 * genrating the notebook using the JSON format of github issues file.
 * Such a format is not known to copilot extension and those are sent over as regular
 * text edits for the Notebook URI.
 *
 * In such cases we should accumulate all of the edits, generate the content and deserialize the content
 * into a notebook, then generate notebooke edits to insert these cells.
 */
export declare class ChatEditingNewNotebookContentEdits {
    private readonly notebook;
    private readonly _notebookService;
    private readonly textEdits;
    constructor(notebook: NotebookTextModel, _notebookService: INotebookService);
    acceptTextEdits(edits: TextEdit[]): void;
    generateEdits(): Promise<ICellEditOperation[]>;
    private generateContent;
}
