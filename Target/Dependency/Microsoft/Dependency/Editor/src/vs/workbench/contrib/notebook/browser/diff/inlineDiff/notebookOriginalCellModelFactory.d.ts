import { IReference, ReferenceCollection } from '../../../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ITextModel } from '../../../../../../editor/common/model.js';
import { CellKind } from '../../../common/notebookCommon.js';
import { URI } from '../../../../../../base/common/uri.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
export declare const INotebookOriginalCellModelFactory: import("../../../../../../platform/instantiation/common/instantiation.js").ServiceIdentifier<INotebookOriginalCellModelFactory>;
export interface INotebookOriginalCellModelFactory {
    readonly _serviceBrand: undefined;
    getOrCreate(uri: URI, cellValue: string, language: string, cellKind: CellKind): IReference<ITextModel>;
}
export declare class OriginalNotebookCellModelReferenceCollection extends ReferenceCollection<ITextModel> {
    private readonly modelService;
    private readonly _languageService;
    constructor(modelService: IModelService, _languageService: ILanguageService);
    protected createReferencedObject(_key: string, uri: URI, cellValue: string, language: string, cellKind: CellKind): ITextModel;
    protected destroyReferencedObject(_key: string, model: ITextModel): void;
}
export declare class OriginalNotebookCellModelFactory implements INotebookOriginalCellModelFactory {
    readonly _serviceBrand: undefined;
    private readonly _data;
    constructor(instantiationService: IInstantiationService);
    getOrCreate(uri: URI, cellValue: string, language: string, cellKind: CellKind): IReference<ITextModel>;
}
