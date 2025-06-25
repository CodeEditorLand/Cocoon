import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable, IDisposable } from '../../../../base/common/lifecycle.js';
import { AiSettingsSearchResult, IAiSettingsSearchProvider, IAiSettingsSearchService } from './aiSettingsSearch.js';
export declare class AiSettingsSearchService extends Disposable implements IAiSettingsSearchService {
    readonly _serviceBrand: undefined;
    private static readonly MAX_PICKS;
    private _providers;
    private _llmRankedResultsPromises;
    private _embeddingsResultsPromises;
    private _onProviderRegistered;
    readonly onProviderRegistered: Event<void>;
    isEnabled(): boolean;
    registerSettingsSearchProvider(provider: IAiSettingsSearchProvider): IDisposable;
    startSearch(query: string, embeddingsOnly: boolean, token: CancellationToken): void;
    getEmbeddingsResults(query: string, token: CancellationToken): Promise<string[] | null>;
    getLLMRankedResults(query: string, token: CancellationToken): Promise<string[] | null>;
    handleSearchResult(result: AiSettingsSearchResult): void;
}
