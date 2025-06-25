import { IStringDictionary } from '../../../../base/common/collections.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { AbstractPolicyService, IPolicyService, PolicyDefinition } from '../../../../platform/policy/common/policy.js';
import { IDefaultAccountService } from '../../accounts/common/defaultAccount.js';
export declare class AccountPolicyService extends AbstractPolicyService implements IPolicyService {
    private readonly logService;
    private readonly defaultAccountService;
    private chatPreviewFeaturesEnabled;
    constructor(logService: ILogService, defaultAccountService: IDefaultAccountService);
    private _update;
    protected _updatePolicyDefinitions(policyDefinitions: IStringDictionary<PolicyDefinition>): Promise<void>;
}
