import { CancellationToken } from '../../../../base/common/cancellation.js';
import { OutputChannel } from './ripgrepSearchUtils.js';
import { TextSearchProvider2, TextSearchComplete2, TextSearchResult2, TextSearchQuery2, TextSearchProviderOptions } from '../common/searchExtTypes.js';
import { Progress } from '../../../../platform/progress/common/progress.js';
export declare class RipgrepSearchProvider implements TextSearchProvider2 {
    private outputChannel;
    private getNumThreads;
    private inProgress;
    constructor(outputChannel: OutputChannel, getNumThreads: () => Promise<number | undefined>);
    provideTextSearchResults(query: TextSearchQuery2, options: TextSearchProviderOptions, progress: Progress<TextSearchResult2>, token: CancellationToken): Promise<TextSearchComplete2>;
    private withToken;
    private dispose;
}
