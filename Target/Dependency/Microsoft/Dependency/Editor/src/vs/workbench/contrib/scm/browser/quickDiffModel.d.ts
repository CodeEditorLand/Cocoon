import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IResolvedTextFileEditorModel, ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { Disposable, IReference } from '../../../../base/common/lifecycle.js';
import { DiffAlgorithmName, IEditorWorkerService } from '../../../../editor/common/services/editorWorker.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { URI } from '../../../../base/common/uri.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { ITextModel } from '../../../../editor/common/model.js';
import { IQuickDiffService, QuickDiff, QuickDiffChange, QuickDiffResult } from '../common/quickDiff.js';
import { ISCMService } from '../common/scm.js';
import { ISplice } from '../../../../base/common/sequence.js';
import { IDiffEditorModel } from '../../../../editor/common/editorCommon.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IChatEditingService } from '../../chat/common/chatEditingService.js';
import { Event } from '../../../../base/common/event.js';
export declare const IQuickDiffModelService: import("../../../../platform/instantiation/common/instantiation.js").ServiceIdentifier<IQuickDiffModelService>;
export interface QuickDiffModelOptions {
    readonly algorithm: DiffAlgorithmName;
    readonly maxComputationTimeMs?: number;
}
export interface IQuickDiffModelService {
    _serviceBrand: undefined;
    /**
     * Returns `undefined` if the editor model is not resolved.
     * Model refrence has to be disposed once not needed anymore.
     * @param resource
     * @param options
     */
    createQuickDiffModelReference(resource: URI, options?: QuickDiffModelOptions): IReference<QuickDiffModel> | undefined;
}
export declare class QuickDiffModelService implements IQuickDiffModelService {
    private readonly instantiationService;
    private readonly textFileService;
    private readonly uriIdentityService;
    _serviceBrand: undefined;
    private readonly _references;
    constructor(instantiationService: IInstantiationService, textFileService: ITextFileService, uriIdentityService: IUriIdentityService);
    createQuickDiffModelReference(resource: URI, options?: QuickDiffModelOptions): IReference<QuickDiffModel> | undefined;
}
export declare class QuickDiffModel extends Disposable {
    private readonly options;
    private readonly scmService;
    private readonly quickDiffService;
    private readonly editorWorkerService;
    private readonly configurationService;
    private readonly textModelResolverService;
    private readonly _chatEditingService;
    private readonly progressService;
    private readonly _model;
    private readonly _originalEditorModels;
    private readonly _originalEditorModelsDisposables;
    get originalTextModels(): Iterable<ITextModel>;
    private _disposed;
    private _quickDiffs;
    private _quickDiffsPromise?;
    private _diffDelayer;
    private readonly _onDidChange;
    readonly onDidChange: Event<{
        changes: QuickDiffChange[];
        diff: ISplice<QuickDiffChange>[];
    }>;
    private _allChanges;
    get allChanges(): QuickDiffChange[];
    private _changes;
    get changes(): QuickDiffChange[];
    /**
     * Map of quick diff name to the index of the change in `this.changes`
     */
    private _quickDiffChanges;
    get quickDiffChanges(): Map<string, number[]>;
    private readonly _repositoryDisposables;
    constructor(textFileModel: IResolvedTextFileEditorModel, options: QuickDiffModelOptions, scmService: ISCMService, quickDiffService: IQuickDiffService, editorWorkerService: IEditorWorkerService, configurationService: IConfigurationService, textModelResolverService: ITextModelService, _chatEditingService: IChatEditingService, progressService: IProgressService);
    get quickDiffs(): readonly QuickDiff[];
    getQuickDiffResults(): QuickDiffResult[];
    getDiffEditorModel(originalUri: URI): IDiffEditorModel | undefined;
    private onDidAddRepository;
    private triggerDiff;
    private setChanges;
    private diff;
    private _diff;
    private getQuickDiffsPromise;
    private getOriginalResource;
    findNextClosestChange(lineNumber: number, inclusive?: boolean, providerId?: string): number;
    findPreviousClosestChange(lineNumber: number, inclusive?: boolean, providerId?: string): number;
    dispose(): void;
}
