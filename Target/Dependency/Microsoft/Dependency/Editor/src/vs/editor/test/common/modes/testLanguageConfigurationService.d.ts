import { Disposable, IDisposable } from '../../../../base/common/lifecycle.js';
import { LanguageConfiguration } from '../../../common/languages/languageConfiguration.js';
import { ILanguageConfigurationService, LanguageConfigurationServiceChangeEvent, ResolvedLanguageConfiguration } from '../../../common/languages/languageConfigurationRegistry.js';
export declare class TestLanguageConfigurationService extends Disposable implements ILanguageConfigurationService {
    _serviceBrand: undefined;
    private readonly _registry;
    private readonly _onDidChange;
    readonly onDidChange: import("../../../../workbench/workbench.web.main.internal.js").Event<LanguageConfigurationServiceChangeEvent>;
    constructor();
    register(languageId: string, configuration: LanguageConfiguration, priority?: number): IDisposable;
    getLanguageConfiguration(languageId: string): ResolvedLanguageConfiguration;
}
