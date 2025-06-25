import { IStringDictionary } from '../../../../base/common/collections.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { AbstractPolicyService, IPolicyService, PolicyDefinition, PolicyValue } from '../../../../platform/policy/common/policy.js';
export declare class MultiplexPolicyService extends AbstractPolicyService implements IPolicyService {
    private readonly policyServices;
    private readonly logService;
    constructor(policyServices: ReadonlyArray<IPolicyService>, logService: ILogService);
    updatePolicyDefinitions(policyDefinitions: IStringDictionary<PolicyDefinition>): Promise<IStringDictionary<PolicyValue>>;
    protected _updatePolicyDefinitions(policyDefinitions: IStringDictionary<PolicyDefinition>): Promise<void>;
    private updatePolicies;
}
