import { Event } from '../../../../../base/common/event.js';
import { URI } from '../../../../../base/common/uri.js';
import { ITrustedDomainService } from '../../browser/trustedDomainService.js';
export declare class MockTrustedDomainService implements ITrustedDomainService {
    private readonly _trustedDomains;
    _serviceBrand: undefined;
    constructor(_trustedDomains?: string[]);
    onDidChangeTrustedDomains: Event<void>;
    isValid(resource: URI): boolean;
}
