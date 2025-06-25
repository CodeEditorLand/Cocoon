import { IReference, ReferenceCollection } from '../../../../../../base/common/lifecycle.js';
import { IModifiedFileEntry } from '../../../../chat/common/chatEditingService.js';
import { INotebookService } from '../../../common/notebookService.js';
import { NotebookTextModel } from '../../../common/model/notebookTextModel.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ITextModelService } from '../../../../../../editor/common/services/resolverService.js';
export declare const INotebookOriginalModelReferenceFactory: import("../../../../../../platform/instantiation/common/instantiation.js").ServiceIdentifier<INotebookOriginalModelReferenceFactory>;
export interface INotebookOriginalModelReferenceFactory {
    readonly _serviceBrand: undefined;
    getOrCreate(fileEntry: IModifiedFileEntry, viewType: string): Promise<IReference<NotebookTextModel>>;
}
export declare class OriginalNotebookModelReferenceCollection extends ReferenceCollection<Promise<NotebookTextModel>> {
    private readonly notebookService;
    private readonly modelService;
    private readonly modelsToDispose;
    constructor(notebookService: INotebookService, modelService: ITextModelService);
    protected createReferencedObject(key: string, fileEntry: IModifiedFileEntry, viewType: string): Promise<NotebookTextModel>;
    protected destroyReferencedObject(key: string, modelPromise: Promise<NotebookTextModel>): void;
}
export declare class NotebookOriginalModelReferenceFactory implements INotebookOriginalModelReferenceFactory {
    private readonly instantiationService;
    readonly _serviceBrand: undefined;
    private _resourceModelCollection;
    private get resourceModelCollection();
    private _asyncModelCollection;
    private get asyncModelCollection();
    constructor(instantiationService: IInstantiationService);
    getOrCreate(fileEntry: IModifiedFileEntry, viewType: string): Promise<IReference<NotebookTextModel>>;
}
