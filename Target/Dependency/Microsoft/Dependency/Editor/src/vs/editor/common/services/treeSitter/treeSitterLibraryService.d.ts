import type { Language, Parser, Query } from '@vscode/tree-sitter-wasm';
import { IReader } from '../../../../base/common/observable.js';
export declare const ITreeSitterLibraryService: import("../../../../platform/instantiation/common/instantiation.js").ServiceIdentifier<ITreeSitterLibraryService>;
export interface ITreeSitterLibraryService {
    readonly _serviceBrand: undefined;
    getParserClass(): Promise<typeof Parser>;
    supportsLanguage(languageId: string, reader: IReader | undefined): boolean;
    getLanguage(languageId: string, reader: IReader | undefined): Language | undefined;
    /**
     * Return value of null indicates that there are no injection queries for this language.
     * @param languageId
     * @param reader
     */
    getInjectionQueries(languageId: string, reader: IReader | undefined): Query | null | undefined;
    /**
     * Return value of null indicates that there are no highlights queries for this language.
     * @param languageId
     * @param reader
     */
    getHighlightingQueries(languageId: string, reader: IReader | undefined): Query | null | undefined;
}
