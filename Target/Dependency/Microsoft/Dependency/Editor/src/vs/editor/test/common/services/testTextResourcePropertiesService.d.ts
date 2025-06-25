import { URI } from '../../../../base/common/uri.js';
import { ITextResourcePropertiesService } from '../../../common/services/textResourceConfiguration.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
export declare class TestTextResourcePropertiesService implements ITextResourcePropertiesService {
    private readonly configurationService;
    readonly _serviceBrand: undefined;
    constructor(configurationService: IConfigurationService);
    getEOL(resource: URI, language?: string): string;
}
