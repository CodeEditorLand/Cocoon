import { INotebookOutputVariableEntry } from '../../../../chat/common/chatVariableEntries.js';
import { ICellOutputViewModel, INotebookEditor } from '../../notebookBrowser.js';
export declare const NOTEBOOK_CELL_OUTPUT_MIME_TYPE_LIST_FOR_CHAT_CONST: string[];
export declare function createNotebookOutputVariableEntry(outputViewModel: ICellOutputViewModel, mimeType: string, notebookEditor: INotebookEditor): INotebookOutputVariableEntry | undefined;
