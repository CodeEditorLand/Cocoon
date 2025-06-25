import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IRange } from '../../../../editor/common/core/range.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IExtensionManagementService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IWorkbenchExtensionEnablementService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { ISearchResult, ISetting, ISettingsEditorModel, SettingMatchType } from '../../../services/preferences/common/preferences.js';
import { IAiSearchProvider, IPreferencesSearchService, IRemoteSearchProvider, ISearchProvider } from '../common/preferences.js';
export interface IEndpointDetails {
    urlBase?: string;
    key?: string;
}
export declare class PreferencesSearchService extends Disposable implements IPreferencesSearchService {
    private readonly instantiationService;
    private readonly configurationService;
    private readonly extensionManagementService;
    private readonly extensionEnablementService;
    readonly _serviceBrand: undefined;
    private _installedExtensions;
    private _remoteSearchProvider;
    private _aiSearchProvider;
    constructor(instantiationService: IInstantiationService, configurationService: IConfigurationService, extensionManagementService: IExtensionManagementService, extensionEnablementService: IWorkbenchExtensionEnablementService);
    getLocalSearchProvider(filter: string): LocalSearchProvider;
    private get remoteSearchAllowed();
    getRemoteSearchProvider(filter: string): IRemoteSearchProvider | undefined;
    getAiSearchProvider(filter: string): IAiSearchProvider;
}
export declare class LocalSearchProvider implements ISearchProvider {
    private _filter;
    private readonly configurationService;
    constructor(_filter: string, configurationService: IConfigurationService);
    searchModel(preferencesModel: ISettingsEditorModel, token: CancellationToken): Promise<ISearchResult | null>;
    private getGroupFilter;
}
export declare class SettingMatches {
    private searchDescription;
    private readonly configurationService;
    readonly matches: IRange[];
    matchType: SettingMatchType;
    /**
     * A match score for key matches to allow comparing key matches against each other.
     * Otherwise, all key matches are treated the same, and sorting is done by ToC order.
     */
    keyMatchScore: number;
    constructor(searchString: string, setting: ISetting, searchDescription: boolean, configurationService: IConfigurationService);
    private _findMatchesInSetting;
    private _keyToLabel;
    private _toAlphaNumeric;
    private _doFindMatchesInSetting;
    private toKeyRange;
    private toDescriptionRange;
    private toValueRange;
}
