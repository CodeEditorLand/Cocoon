import { Disposable } from '../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IWorkbenchContribution } from '../../../common/contributions.js';
export declare class McpDiscovery extends Disposable implements IWorkbenchContribution {
    static readonly ID = "workbench.contrib.mcp.discovery";
    constructor(instantiationService: IInstantiationService, configurationService: IConfigurationService);
}
