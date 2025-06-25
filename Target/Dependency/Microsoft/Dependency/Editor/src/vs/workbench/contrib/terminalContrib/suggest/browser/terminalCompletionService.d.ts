import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Disposable, IDisposable } from '../../../../../base/common/lifecycle.js';
import { UriComponents } from '../../../../../base/common/uri.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { type ITerminalCapabilityStore } from '../../../../../platform/terminal/common/capabilities/capabilities.js';
import { TerminalShellType } from '../../../../../platform/terminal/common/terminal.js';
import { type ITerminalCompletion } from './terminalCompletionItem.js';
import type { IProcessEnvironment } from '../../../../../base/common/platform.js';
export declare const ITerminalCompletionService: import("../../../../../platform/instantiation/common/instantiation.js").ServiceIdentifier<ITerminalCompletionService>;
/**
 * Represents a collection of {@link CompletionItem completion items} to be presented
 * in the terminal.
 */
export declare class TerminalCompletionList<ITerminalCompletion> {
    /**
     * Resources should be shown in the completions list
     */
    resourceRequestConfig?: TerminalResourceRequestConfig;
    /**
     * The completion items.
     */
    items?: ITerminalCompletion[];
    /**
     * Creates a new completion list.
     *
     * @param items The completion items.
     * @param isIncomplete The list is not complete.
     */
    constructor(items?: ITerminalCompletion[], resourceRequestConfig?: TerminalResourceRequestConfig);
}
export interface TerminalResourceRequestConfig {
    filesRequested?: boolean;
    foldersRequested?: boolean;
    fileExtensions?: string[];
    cwd?: UriComponents;
    pathSeparator: string;
    env?: {
        [key: string]: string | null | undefined;
    };
}
export interface ITerminalCompletionProvider {
    id: string;
    shellTypes?: TerminalShellType[];
    provideCompletions(value: string, cursorPosition: number, allowFallbackCompletions: boolean, token: CancellationToken): Promise<ITerminalCompletion[] | TerminalCompletionList<ITerminalCompletion> | undefined>;
    triggerCharacters?: string[];
    isBuiltin?: boolean;
}
export interface ITerminalCompletionService {
    _serviceBrand: undefined;
    readonly providers: IterableIterator<ITerminalCompletionProvider>;
    registerTerminalCompletionProvider(extensionIdentifier: string, id: string, provider: ITerminalCompletionProvider, ...triggerCharacters: string[]): IDisposable;
    provideCompletions(promptValue: string, cursorPosition: number, allowFallbackCompletions: boolean, shellType: TerminalShellType, capabilities: ITerminalCapabilityStore, token: CancellationToken, triggerCharacter?: boolean, skipExtensionCompletions?: boolean, explicitlyInvoked?: boolean): Promise<ITerminalCompletion[] | undefined>;
}
export declare class TerminalCompletionService extends Disposable implements ITerminalCompletionService {
    private readonly _configurationService;
    private readonly _fileService;
    _serviceBrand: undefined;
    private readonly _providers;
    get providers(): IterableIterator<ITerminalCompletionProvider>;
    private _providersGenerator;
    /** Overrides the environment for testing purposes. */
    set processEnv(env: IProcessEnvironment);
    private _processEnv;
    constructor(_configurationService: IConfigurationService, _fileService: IFileService);
    registerTerminalCompletionProvider(extensionIdentifier: string, id: string, provider: ITerminalCompletionProvider, ...triggerCharacters: string[]): IDisposable;
    provideCompletions(promptValue: string, cursorPosition: number, allowFallbackCompletions: boolean, shellType: TerminalShellType, capabilities: ITerminalCapabilityStore, token: CancellationToken, triggerCharacter?: boolean, skipExtensionCompletions?: boolean, explicitlyInvoked?: boolean): Promise<ITerminalCompletion[] | undefined>;
    private _collectCompletions;
    resolveResources(resourceRequestConfig: TerminalResourceRequestConfig, promptValue: string, cursorPosition: number, provider: string, capabilities: ITerminalCapabilityStore, shellType?: TerminalShellType): Promise<ITerminalCompletion[] | undefined>;
    private _getEnvVar;
    private _getHomeDir;
}
