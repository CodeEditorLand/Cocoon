import { URI } from '../../../../../../base/common/uri.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { NotebookTextModel } from '../../../../notebook/common/model/notebookTextModel.js';
import { NotebookData, TransientOptions } from '../../../../notebook/common/notebookCommon.js';
type ChatEditingSnapshotNotebookContentQueryData = {
    sessionId: string;
    requestId: string | undefined;
    undoStop: string | undefined;
    viewType: string;
};
export declare const ChatEditingNotebookSnapshotScheme = "chat-editing-notebook-snapshot-model";
export declare function getNotebookSnapshotFileURI(chatSessionId: string, requestId: string | undefined, undoStop: string | undefined, path: string, viewType: string): URI;
export declare function parseNotebookSnapshotFileURI(resource: URI): ChatEditingSnapshotNotebookContentQueryData;
export declare function createSnapshot(notebook: NotebookTextModel, transientOptions: TransientOptions | undefined, outputSizeConfig: IConfigurationService | number): string;
export declare function restoreSnapshot(notebook: NotebookTextModel, snapshot: string): void;
export declare class SnapshotComparer {
    private readonly data;
    private readonly transientOptions;
    constructor(initialCotent: string);
    isEqual(notebook: NotebookData | NotebookTextModel): boolean;
}
export declare function deserializeSnapshot(snapshot: string): {
    transientOptions: TransientOptions | undefined;
    data: NotebookData;
};
export {};
