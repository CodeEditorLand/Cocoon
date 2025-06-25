import type { Parser, Language, Query } from '@vscode/tree-sitter-wasm';
import { IReader } from '../../../../base/common/observable.js';
import { ITreeSitterLibraryService } from '../../../../editor/common/services/treeSitter/treeSitterLibraryService.js';
export declare class TestTreeSitterLibraryService implements ITreeSitterLibraryService {
    readonly _serviceBrand: undefined;
    getParserClass(): Promise<typeof Parser>;
    supportsLanguage(languageId: string, reader: IReader | undefined): boolean;
    getLanguage(languageId: string, reader: IReader | undefined): Language | undefined;
    getInjectionQueries(languageId: string, reader: IReader | undefined): Query | null | undefined;
    getHighlightingQueries(languageId: string, reader: IReader | undefined): Query | null | undefined;
}
