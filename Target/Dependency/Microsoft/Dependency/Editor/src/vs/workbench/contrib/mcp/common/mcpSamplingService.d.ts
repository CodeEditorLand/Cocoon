import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { ILanguageModelsService } from '../../chat/common/languageModels.js';
import { IMcpServerSamplingConfiguration } from './mcpConfiguration.js';
import { IMcpSamplingService, IMcpServer, ISamplingOptions, ISamplingResult } from './mcpTypes.js';
export declare class McpSamplingService extends Disposable implements IMcpSamplingService {
    private readonly _languageModelsService;
    private readonly _configurationService;
    private readonly _dialogService;
    private readonly _notificationService;
    private readonly _commandService;
    readonly _serviceBrand: undefined;
    private readonly _sessionSets;
    private readonly _logs;
    constructor(_languageModelsService: ILanguageModelsService, _configurationService: IConfigurationService, _dialogService: IDialogService, _notificationService: INotificationService, _commandService: ICommandService, instaService: IInstantiationService);
    sample(opts: ISamplingOptions, token?: Readonly<CancellationToken>): Promise<ISamplingResult>;
    hasLogs(server: IMcpServer): boolean;
    getLogText(server: IMcpServer): string;
    private _getMatchingModel;
    private allowButtons;
    private _showContextual;
    private _notify;
    /**
     * Gets the matching model for the MCP server in this context, or
     * a reason why no model could be selected.
     */
    private _getMatchingModelInner;
    private _configKey;
    getConfig(server: IMcpServer): IMcpServerSamplingConfiguration;
    /**
     * _getConfig reads the sampling config reads the `{ server: data }` mapping
     * from the appropriate config. We read from the most specific possible
     * config up to the default configuration location that the MCP server itself
     * is defined in. We don't go further because then workspace-specific servers
     * would get in the user settings which is not meaningful and could lead
     * to confusion.
     *
     * todo@connor4312: generalize this for other esttings when we have them
     */
    private _getConfig;
    updateConfig(server: IMcpServer, mutate: (r: IMcpServerSamplingConfiguration) => unknown): Promise<{
        allowedDuringChat?: boolean;
        allowedOutsideChat?: boolean;
        allowedModels?: string[];
    }>;
}
