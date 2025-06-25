import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ITextModel } from '../../../../editor/common/model.js';
import { IEditorWorkerService } from '../../../../editor/common/services/editorWorker.js';
import { Event } from '../../../../base/common/event.js';
import { URI } from '../../../../base/common/uri.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageSelection } from '../../../../editor/common/languages/language.js';
import { Disposable, IDisposable } from '../../../../base/common/lifecycle.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ILogEntry, IOutputContentSource, OutputChannelUpdateMode } from '../../../services/output/common/output.js';
export declare function parseLogEntryAt(model: ITextModel, lineNumber: number): ILogEntry | null;
export interface IOutputChannelModel extends IDisposable {
    readonly onDispose: Event<void>;
    readonly source: IOutputContentSource | ReadonlyArray<IOutputContentSource>;
    getLogEntries(): ReadonlyArray<ILogEntry>;
    append(output: string): void;
    update(mode: OutputChannelUpdateMode, till: number | undefined, immediate: boolean): void;
    updateChannelSources(sources: ReadonlyArray<IOutputContentSource>): void;
    loadModel(): Promise<ITextModel>;
    clear(): void;
    replace(value: string): void;
}
interface IContentProvider {
    readonly onDidAppend: Event<void>;
    readonly onDidReset: Event<void>;
    reset(): void;
    watch(): void;
    unwatch(): void;
    getContent(): Promise<{
        readonly content: string;
        readonly consume: () => void;
    }>;
    getLogEntries(): ReadonlyArray<ILogEntry>;
}
export declare abstract class AbstractFileOutputChannelModel extends Disposable implements IOutputChannelModel {
    private readonly modelUri;
    private readonly language;
    private readonly outputContentProvider;
    protected readonly modelService: IModelService;
    private readonly editorWorkerService;
    private readonly _onDispose;
    readonly onDispose: Event<void>;
    protected loadModelPromise: Promise<ITextModel> | null;
    private readonly modelDisposable;
    protected model: ITextModel | null;
    private modelUpdateInProgress;
    private readonly modelUpdateCancellationSource;
    private readonly appendThrottler;
    private replacePromise;
    abstract readonly source: IOutputContentSource | ReadonlyArray<IOutputContentSource>;
    constructor(modelUri: URI, language: ILanguageSelection, outputContentProvider: IContentProvider, modelService: IModelService, editorWorkerService: IEditorWorkerService);
    loadModel(): Promise<ITextModel>;
    getLogEntries(): readonly ILogEntry[];
    private onDidContentChange;
    protected doUpdate(mode: OutputChannelUpdateMode, immediate: boolean): void;
    private clearContent;
    private appendContent;
    private doAppendContent;
    private replaceContent;
    private getReplaceEdits;
    protected cancelModelUpdate(): void;
    protected isVisible(): boolean;
    dispose(): void;
    append(message: string): void;
    replace(message: string): void;
    abstract clear(): void;
    abstract update(mode: OutputChannelUpdateMode, till: number | undefined, immediate: boolean): void;
    abstract updateChannelSources(files: IOutputContentSource[]): void;
}
export declare class FileOutputChannelModel extends AbstractFileOutputChannelModel implements IOutputChannelModel {
    readonly source: IOutputContentSource;
    private readonly fileOutput;
    constructor(modelUri: URI, language: ILanguageSelection, source: IOutputContentSource, fileService: IFileService, modelService: IModelService, instantiationService: IInstantiationService, logService: ILogService, editorWorkerService: IEditorWorkerService);
    clear(): void;
    update(mode: OutputChannelUpdateMode, till: number | undefined, immediate: boolean): void;
    updateChannelSources(files: IOutputContentSource[]): void;
}
export declare class MultiFileOutputChannelModel extends AbstractFileOutputChannelModel implements IOutputChannelModel {
    readonly source: IOutputContentSource[];
    private readonly multifileOutput;
    constructor(modelUri: URI, language: ILanguageSelection, source: IOutputContentSource[], fileService: IFileService, modelService: IModelService, logService: ILogService, editorWorkerService: IEditorWorkerService, instantiationService: IInstantiationService);
    updateChannelSources(files: IOutputContentSource[]): void;
    clear(): void;
    update(mode: OutputChannelUpdateMode, till: number | undefined, immediate: boolean): void;
}
export declare class DelegatedOutputChannelModel extends Disposable implements IOutputChannelModel {
    private readonly instantiationService;
    private readonly fileService;
    private readonly _onDispose;
    readonly onDispose: Event<void>;
    private readonly outputChannelModel;
    readonly source: IOutputContentSource;
    constructor(id: string, modelUri: URI, language: ILanguageSelection, outputDir: URI, outputDirCreationPromise: Promise<void>, instantiationService: IInstantiationService, fileService: IFileService);
    private createOutputChannelModel;
    getLogEntries(): readonly ILogEntry[];
    append(output: string): void;
    update(mode: OutputChannelUpdateMode, till: number | undefined, immediate: boolean): void;
    loadModel(): Promise<ITextModel>;
    clear(): void;
    replace(value: string): void;
    updateChannelSources(files: IOutputContentSource[]): void;
}
export {};
