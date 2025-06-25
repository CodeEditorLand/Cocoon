import { Emitter } from '../../../../base/common/event.js';
import { URI } from '../../../../base/common/uri.js';
import { IConfigurationChangeEvent, IConfigurationOverrides, IConfigurationService, IConfigurationValue } from '../../common/configuration.js';
export declare class TestConfigurationService implements IConfigurationService {
    _serviceBrand: undefined;
    private configuration;
    readonly onDidChangeConfigurationEmitter: Emitter<IConfigurationChangeEvent>;
    readonly onDidChangeConfiguration: import("../../../../workbench/workbench.web.main.internal.js").Event<IConfigurationChangeEvent>;
    constructor(configuration?: any);
    private configurationByRoot;
    reloadConfiguration<T>(): Promise<T>;
    getValue(arg1?: any, arg2?: any): any;
    updateValue(key: string, value: any): Promise<void>;
    setUserConfiguration(key: any, value: any, root?: URI): Promise<void>;
    private overrideIdentifiers;
    setOverrideIdentifiers(key: string, identifiers: string[]): void;
    inspect<T>(key: string, overrides?: IConfigurationOverrides): IConfigurationValue<T>;
    keys(): {
        default: string[];
        user: string[];
        workspace: never[];
        workspaceFolder: never[];
    };
    getConfigurationData(): null;
}
