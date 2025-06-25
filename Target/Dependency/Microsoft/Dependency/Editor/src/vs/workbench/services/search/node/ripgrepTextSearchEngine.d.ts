import { EventEmitter } from 'events';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { URI } from '../../../../base/common/uri.js';
import { Progress } from '../../../../platform/progress/common/progress.js';
import { ITextSearchPreviewOptions } from '../common/search.js';
import { TextSearchComplete2, TextSearchProviderOptions, TextSearchQuery2, TextSearchResult2 } from '../common/searchExtTypes.js';
import { IOutputChannel } from './ripgrepSearchUtils.js';
import type { RipgrepTextSearchOptions } from '../common/searchExtTypesInternal.js';
export declare class RipgrepTextSearchEngine {
    private outputChannel;
    private readonly _numThreads?;
    constructor(outputChannel: IOutputChannel, _numThreads?: number | undefined);
    provideTextSearchResults(query: TextSearchQuery2, options: TextSearchProviderOptions, progress: Progress<TextSearchResult2>, token: CancellationToken): Promise<TextSearchComplete2>;
    provideTextSearchResultsWithRgOptions(query: TextSearchQuery2, options: RipgrepTextSearchOptions, progress: Progress<TextSearchResult2>, token: CancellationToken): Promise<TextSearchComplete2>;
}
export declare class RipgrepParser extends EventEmitter {
    private maxResults;
    private root;
    private previewOptions;
    private remainder;
    private isDone;
    private hitLimit;
    private stringDecoder;
    private numResults;
    constructor(maxResults: number, root: URI, previewOptions: ITextSearchPreviewOptions);
    cancel(): void;
    flush(): void;
    on(event: 'result', listener: (result: TextSearchResult2) => void): this;
    on(event: 'hitLimit', listener: () => void): this;
    handleData(data: Buffer | string): void;
    private handleDecodedData;
    private handleLine;
    private createTextSearchMatch;
    private createTextSearchContexts;
    private onResult;
}
export declare function getRgArgs(query: TextSearchQuery2, options: RipgrepTextSearchOptions): string[];
export declare function unicodeEscapesToPCRE2(pattern: string): string;
export interface IRgMessage {
    type: 'match' | 'context' | string;
    data: IRgMatch;
}
export interface IRgMatch {
    path: IRgBytesOrText;
    lines: IRgBytesOrText;
    line_number: number;
    absolute_offset: number;
    submatches: IRgSubmatch[];
}
export interface IRgSubmatch {
    match: IRgBytesOrText;
    start: number;
    end: number;
}
export type IRgBytesOrText = {
    bytes: string;
} | {
    text: string;
};
export declare function fixRegexNewline(pattern: string): string;
export declare function fixNewline(pattern: string): string;
/**
 * Parses out curly braces and returns equivalent globs. Only supports one level of nesting.
 * Exported for testing.
 */
export declare function performBraceExpansionForRipgrep(pattern: string): string[];
