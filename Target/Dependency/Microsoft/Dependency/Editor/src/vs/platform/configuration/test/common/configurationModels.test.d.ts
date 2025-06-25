import { Configuration, ConfigurationModel } from '../../common/configurationModels.js';
export declare class TestConfiguration extends Configuration {
    constructor(defaultConfiguration: ConfigurationModel, policyConfiguration: ConfigurationModel, applicationConfiguration: ConfigurationModel, localUserConfiguration: ConfigurationModel, remoteUserConfiguration?: ConfigurationModel);
}
