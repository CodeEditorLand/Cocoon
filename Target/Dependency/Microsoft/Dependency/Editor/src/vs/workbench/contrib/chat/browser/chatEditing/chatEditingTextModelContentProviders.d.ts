import { URI } from '../../../../../base/common/uri.js';
import { ITextModel } from '../../../../../editor/common/model.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ITextModelContentProvider } from '../../../../../editor/common/services/resolverService.js';
import { IChatEditingService } from '../../common/chatEditingService.js';
export declare class ChatEditingTextModelContentProvider implements ITextModelContentProvider {
    private readonly _chatEditingService;
    private readonly _modelService;
    static readonly scheme = "chat-editing-text-model";
    static getFileURI(chatSessionId: string, documentId: string, path: string): URI;
    constructor(_chatEditingService: IChatEditingService, _modelService: IModelService);
    provideTextContent(resource: URI): Promise<ITextModel | null>;
}
export declare class ChatEditingSnapshotTextModelContentProvider implements ITextModelContentProvider {
    private readonly _chatEditingService;
    private readonly _modelService;
    static getSnapshotFileURI(chatSessionId: string, requestId: string | undefined, undoStop: string | undefined, path: string): URI;
    constructor(_chatEditingService: IChatEditingService, _modelService: IModelService);
    provideTextContent(resource: URI): Promise<ITextModel | null>;
}
