import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IReadonlyVSDataTransfer } from '../../../../base/common/dataTransfer.js';
import { HierarchicalKind } from '../../../../base/common/hierarchicalKind.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IRange } from '../../../../editor/common/core/range.js';
import { DocumentPasteContext, DocumentPasteEditProvider, DocumentPasteEditsSession } from '../../../../editor/common/languages.js';
import { ITextModel } from '../../../../editor/common/model.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IChatWidgetService } from './chat.js';
export declare class PasteImageProvider implements DocumentPasteEditProvider {
    private readonly chatWidgetService;
    private readonly extensionService;
    private readonly fileService;
    private readonly environmentService;
    private readonly logService;
    private readonly imagesFolder;
    readonly kind: HierarchicalKind;
    readonly providedPasteEditKinds: HierarchicalKind[];
    readonly copyMimeTypes: never[];
    readonly pasteMimeTypes: string[];
    constructor(chatWidgetService: IChatWidgetService, extensionService: IExtensionService, fileService: IFileService, environmentService: IEnvironmentService, logService: ILogService);
    provideDocumentPasteEdits(model: ITextModel, ranges: readonly IRange[], dataTransfer: IReadonlyVSDataTransfer, context: DocumentPasteContext, token: CancellationToken): Promise<DocumentPasteEditsSession | undefined>;
}
export declare function imageToHash(data: Uint8Array): Promise<string>;
export declare function isImage(array: Uint8Array): boolean;
export declare class CopyTextProvider implements DocumentPasteEditProvider {
    readonly providedPasteEditKinds: never[];
    readonly copyMimeTypes: string[];
    readonly pasteMimeTypes: never[];
    prepareDocumentPaste(model: ITextModel, ranges: readonly IRange[], dataTransfer: IReadonlyVSDataTransfer, token: CancellationToken): Promise<undefined | IReadonlyVSDataTransfer>;
}
export declare class PasteTextProvider implements DocumentPasteEditProvider {
    private readonly chatWidgetService;
    private readonly modelService;
    readonly kind: HierarchicalKind;
    readonly providedPasteEditKinds: HierarchicalKind[];
    readonly copyMimeTypes: never[];
    readonly pasteMimeTypes: string[];
    constructor(chatWidgetService: IChatWidgetService, modelService: IModelService);
    provideDocumentPasteEdits(model: ITextModel, ranges: readonly IRange[], dataTransfer: IReadonlyVSDataTransfer, _context: DocumentPasteContext, token: CancellationToken): Promise<DocumentPasteEditsSession | undefined>;
}
export declare class ChatPasteProvidersFeature extends Disposable {
    constructor(instaService: IInstantiationService, languageFeaturesService: ILanguageFeaturesService, chatWidgetService: IChatWidgetService, extensionService: IExtensionService, fileService: IFileService, modelService: IModelService, environmentService: IEnvironmentService, logService: ILogService);
}
