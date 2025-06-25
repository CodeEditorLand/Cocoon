import { IPromptContentsProvider } from './types.js';
import { URI } from '../../../../../../base/common/uri.js';
import { VSBufferReadableStream } from '../../../../../../base/common/buffer.js';
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { IPromptContentsProviderOptions, PromptContentsProviderBase } from './promptContentsProviderBase.js';
import { FileChangesEvent, IFileService } from '../../../../../../platform/files/common/files.js';
/**
 * Prompt contents provider for a file on the disk referenced by
 * a provided {@link URI}.
 */
export declare class FilePromptContentProvider extends PromptContentsProviderBase<FileChangesEvent> implements IPromptContentsProvider {
    readonly uri: URI;
    private readonly fileService;
    private readonly modelService;
    private readonly languageService;
    get sourceName(): string;
    get languageId(): string;
    constructor(uri: URI, options: Partial<IPromptContentsProviderOptions>, fileService: IFileService, modelService: IModelService, languageService: ILanguageService);
    /**
     * Creates a stream of lines from the file based on the changes listed in
     * the provided event.
     *
     * @param event - event that describes the changes in the file; `'full'` is
     * 				  the special value that means that all contents have changed
     * @param cancellationToken - token that cancels this operation
     */
    protected getContentsStream(_event: FileChangesEvent | 'full', cancellationToken?: CancellationToken): Promise<VSBufferReadableStream>;
    createNew(promptContentsSource: {
        uri: URI;
    }, options?: Partial<IPromptContentsProviderOptions>): IPromptContentsProvider;
    /**
     * String representation of this object.
     */
    toString(): string;
}
