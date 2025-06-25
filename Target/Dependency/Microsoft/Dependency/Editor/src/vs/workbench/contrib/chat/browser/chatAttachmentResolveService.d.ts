import { VSBuffer } from '../../../../base/common/buffer.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IDraggedResourceEditorInput, MarkerTransferData, DocumentSymbolTransferData, NotebookCellOutputTransferData } from '../../../../platform/dnd/browser/dnd.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IChatRequestVariableEntry, OmittedState, IDiagnosticVariableEntry, ISymbolVariableEntry } from '../common/chatVariableEntries.js';
export declare const IChatAttachmentResolveService: import("../../../../platform/instantiation/common/instantiation.js").ServiceIdentifier<IChatAttachmentResolveService>;
export interface IChatAttachmentResolveService {
    _serviceBrand: undefined;
    resolveEditorAttachContext(editor: EditorInput | IDraggedResourceEditorInput): Promise<IChatRequestVariableEntry | undefined>;
    resolveUntitledEditorAttachContext(editor: IDraggedResourceEditorInput): Promise<IChatRequestVariableEntry | undefined>;
    resolveResourceAttachContext(resource: URI, isDirectory: boolean): Promise<IChatRequestVariableEntry | undefined>;
    resolveImageEditorAttachContext(resource: URI, data?: VSBuffer, mimeType?: string): Promise<IChatRequestVariableEntry | undefined>;
    resolveImageAttachContext(images: ImageTransferData[]): Promise<IChatRequestVariableEntry[]>;
    resolveMarkerAttachContext(markers: MarkerTransferData[]): IDiagnosticVariableEntry[];
    resolveSymbolsAttachContext(symbols: DocumentSymbolTransferData[]): ISymbolVariableEntry[];
    resolveNotebookOutputAttachContext(data: NotebookCellOutputTransferData): IChatRequestVariableEntry[];
}
export declare class ChatAttachmentResolveService implements IChatAttachmentResolveService {
    private fileService;
    private editorService;
    private textModelService;
    private extensionService;
    private dialogService;
    _serviceBrand: undefined;
    constructor(fileService: IFileService, editorService: IEditorService, textModelService: ITextModelService, extensionService: IExtensionService, dialogService: IDialogService);
    resolveEditorAttachContext(editor: EditorInput | IDraggedResourceEditorInput): Promise<IChatRequestVariableEntry | undefined>;
    resolveUntitledEditorAttachContext(editor: IDraggedResourceEditorInput): Promise<IChatRequestVariableEntry | undefined>;
    resolveResourceAttachContext(resource: URI, isDirectory: boolean): Promise<IChatRequestVariableEntry | undefined>;
    resolveImageEditorAttachContext(resource: URI, data?: VSBuffer, mimeType?: string): Promise<IChatRequestVariableEntry | undefined>;
    resolveImageAttachContext(images: ImageTransferData[]): Promise<IChatRequestVariableEntry[]>;
    resolveMarkerAttachContext(markers: MarkerTransferData[]): IDiagnosticVariableEntry[];
    resolveSymbolsAttachContext(symbols: DocumentSymbolTransferData[]): ISymbolVariableEntry[];
    resolveNotebookOutputAttachContext(data: NotebookCellOutputTransferData): IChatRequestVariableEntry[];
}
export type ImageTransferData = {
    data: Uint8Array;
    name: string;
    icon?: ThemeIcon;
    resource?: URI;
    id?: string;
    mimeType?: string;
    omittedState?: OmittedState;
};
