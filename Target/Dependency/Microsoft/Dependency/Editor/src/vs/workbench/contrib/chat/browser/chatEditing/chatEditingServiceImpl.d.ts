import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Disposable, IDisposable } from '../../../../../base/common/lifecycle.js';
import { IObservable } from '../../../../../base/common/observable.js';
import { URI } from '../../../../../base/common/uri.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IDecorationsService } from '../../../../services/decorations/common/decorations.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { ILifecycleService } from '../../../../services/lifecycle/common/lifecycle.js';
import { IMultiDiffSourceResolver, IMultiDiffSourceResolverService, IResolvedMultiDiffSource } from '../../../multiDiffEditor/browser/multiDiffSourceResolverService.js';
import { INotebookService } from '../../../notebook/common/notebookService.js';
import { IChatEditingService, IChatEditingSession, IChatRelatedFile, IChatRelatedFilesProvider } from '../../common/chatEditingService.js';
import { ChatModel } from '../../common/chatModel.js';
import { IChatService } from '../../common/chatService.js';
export declare class ChatEditingService extends Disposable implements IChatEditingService {
    private readonly _instantiationService;
    private readonly _chatService;
    private readonly _editorService;
    private readonly _fileService;
    private readonly lifecycleService;
    private readonly notebookService;
    _serviceBrand: undefined;
    private readonly _sessionsObs;
    readonly editingSessionsObs: IObservable<readonly IChatEditingSession[]>;
    private _restoringEditingSession;
    private _chatRelatedFilesProviders;
    constructor(_instantiationService: IInstantiationService, multiDiffSourceResolverService: IMultiDiffSourceResolverService, textModelService: ITextModelService, contextKeyService: IContextKeyService, _chatService: IChatService, _editorService: IEditorService, decorationsService: IDecorationsService, _fileService: IFileService, lifecycleService: ILifecycleService, storageService: IStorageService, logService: ILogService, extensionService: IExtensionService, productService: IProductService, notebookService: INotebookService);
    dispose(): void;
    startOrContinueGlobalEditingSession(chatModel: ChatModel, waitForRestore?: boolean): Promise<IChatEditingSession>;
    private _lookupEntry;
    getEditingSession(chatSessionId: string): IChatEditingSession | undefined;
    createEditingSession(chatModel: ChatModel, global?: boolean): Promise<IChatEditingSession>;
    private installAutoApplyObserver;
    private observerEditsInResponse;
    hasRelatedFilesProviders(): boolean;
    registerRelatedFilesProvider(handle: number, provider: IChatRelatedFilesProvider): IDisposable;
    getRelatedFiles(chatSessionId: string, prompt: string, files: URI[], token: CancellationToken): Promise<{
        group: string;
        files: IChatRelatedFile[];
    }[] | undefined>;
}
export declare class ChatEditingMultiDiffSourceResolver implements IMultiDiffSourceResolver {
    private readonly _editingSessionsObs;
    private readonly _instantiationService;
    constructor(_editingSessionsObs: IObservable<readonly IChatEditingSession[]>, _instantiationService: IInstantiationService);
    canHandleUri(uri: URI): boolean;
    resolveDiffSource(uri: URI): Promise<IResolvedMultiDiffSource>;
}
