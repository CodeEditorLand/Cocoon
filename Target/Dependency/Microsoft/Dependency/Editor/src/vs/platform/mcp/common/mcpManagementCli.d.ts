import { IConfigurationService } from '../../configuration/common/configuration.js';
import { ILogger } from '../../log/common/log.js';
export declare class McpManagementCli {
    private readonly _logger;
    private readonly _userConfigurationService;
    constructor(_logger: ILogger, _userConfigurationService: IConfigurationService);
    addMcpDefinitions(definitions: string[]): Promise<void>;
    private updateMcpInConfig;
    private validateConfiguration;
}
