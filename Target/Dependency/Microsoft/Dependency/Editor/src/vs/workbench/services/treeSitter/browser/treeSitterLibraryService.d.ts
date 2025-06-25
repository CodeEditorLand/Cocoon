import type { Parser, Language, Query } from '@vscode/tree-sitter-wasm';
import { IReader } from '../../../../base/common/observable.js';
import { ITreeSitterLibraryService } from '../../../../editor/common/services/treeSitter/treeSitterLibraryService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { AppResourcePath } from '../../../../base/common/network.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
export declare const EDITOR_EXPERIMENTAL_PREFER_TREESITTER = "editor.experimental.preferTreeSitter";
export declare const TREESITTER_ALLOWED_SUPPORT: string[];
export declare function getModuleLocation(environmentService: IEnvironmentService): AppResourcePath;
export declare class TreeSitterLibraryService extends Disposable implements ITreeSitterLibraryService {
    private readonly _configurationService;
    private readonly _fileService;
    private readonly _environmentService;
    _serviceBrand: undefined;
    isTest: boolean;
    private readonly _treeSitterImport;
    private readonly _supportsLanguage;
    private readonly _languagesCache;
    private readonly _injectionQueries;
    constructor(_configurationService: IConfigurationService, _fileService: IFileService, _environmentService: IEnvironmentService);
    supportsLanguage(languageId: string, reader: IReader | undefined): boolean;
    getParserClass(): Promise<typeof Parser>;
    getLanguage(languageId: string, reader: IReader | undefined): Language | undefined;
    getInjectionQueries(languageId: string, reader: IReader | undefined): Query | null | undefined;
    getHighlightingQueries(languageId: string, reader: IReader | undefined): Query | null | undefined;
}
