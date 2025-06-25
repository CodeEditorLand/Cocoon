import { Disposable } from '../../../base/common/lifecycle.js';
import { IExtHostContext } from '../../services/extensions/common/extHostCustomers.js';
import { AiSettingsSearchResult, IAiSettingsSearchService } from '../../services/aiSettingsSearch/common/aiSettingsSearch.js';
import { MainThreadAiSettingsSearchShape } from '../common/extHost.protocol.js';
export declare class MainThreadAiSettingsSearch extends Disposable implements MainThreadAiSettingsSearchShape {
    private readonly _settingsSearchService;
    private readonly _proxy;
    private readonly _registrations;
    constructor(context: IExtHostContext, _settingsSearchService: IAiSettingsSearchService);
    $registerAiSettingsSearchProvider(handle: number): void;
    $unregisterAiSettingsSearchProvider(handle: number): void;
    $handleSearchResult(handle: number, result: AiSettingsSearchResult): void;
}
