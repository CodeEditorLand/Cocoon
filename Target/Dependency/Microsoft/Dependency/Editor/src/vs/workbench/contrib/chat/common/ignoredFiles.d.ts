import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IDisposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
export interface ILanguageModelIgnoredFileProvider {
    isFileIgnored(uri: URI, token: CancellationToken): Promise<boolean>;
}
export declare const ILanguageModelIgnoredFilesService: import("../../../../platform/instantiation/common/instantiation.js").ServiceIdentifier<ILanguageModelIgnoredFilesService>;
export interface ILanguageModelIgnoredFilesService {
    _serviceBrand: undefined;
    fileIsIgnored(uri: URI, token: CancellationToken): Promise<boolean>;
    registerIgnoredFileProvider(provider: ILanguageModelIgnoredFileProvider): IDisposable;
}
export declare class LanguageModelIgnoredFilesService implements ILanguageModelIgnoredFilesService {
    _serviceBrand: undefined;
    private readonly _providers;
    fileIsIgnored(uri: URI, token: CancellationToken): Promise<boolean>;
    registerIgnoredFileProvider(provider: ILanguageModelIgnoredFileProvider): IDisposable;
}
