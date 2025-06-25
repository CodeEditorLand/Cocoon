import { Disposable } from '../../../../base/common/lifecycle.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IAuthenticationService, IAuthenticationExtensionsService } from '../common/authentication.js';
import { IAuthenticationQueryService, IProviderQuery, IExtensionQuery, IMcpServerQuery } from '../common/authenticationQuery.js';
import { IAuthenticationUsageService } from './authenticationUsageService.js';
import { IAuthenticationMcpUsageService } from './authenticationMcpUsageService.js';
import { IAuthenticationAccessService } from './authenticationAccessService.js';
import { IAuthenticationMcpAccessService } from './authenticationMcpAccessService.js';
import { IAuthenticationMcpService } from './authenticationMcpService.js';
/**
 * Main implementation of the authentication query service
 */
export declare class AuthenticationQueryService extends Disposable implements IAuthenticationQueryService {
    readonly authenticationService: IAuthenticationService;
    readonly authenticationUsageService: IAuthenticationUsageService;
    readonly authenticationMcpUsageService: IAuthenticationMcpUsageService;
    readonly authenticationAccessService: IAuthenticationAccessService;
    readonly authenticationMcpAccessService: IAuthenticationMcpAccessService;
    readonly authenticationExtensionsService: IAuthenticationExtensionsService;
    readonly authenticationMcpService: IAuthenticationMcpService;
    readonly logService: ILogService;
    readonly _serviceBrand: undefined;
    private readonly _onDidChangePreferences;
    readonly onDidChangePreferences: import("../../../workbench.web.main.internal.js").Event<{
        readonly providerId: string;
        readonly entityType: "extension" | "mcpServer";
        readonly entityIds: string[];
    }>;
    private readonly _onDidChangeAccess;
    readonly onDidChangeAccess: import("../../../workbench.web.main.internal.js").Event<{
        readonly providerId: string;
        readonly accountName: string;
    }>;
    constructor(authenticationService: IAuthenticationService, authenticationUsageService: IAuthenticationUsageService, authenticationMcpUsageService: IAuthenticationMcpUsageService, authenticationAccessService: IAuthenticationAccessService, authenticationMcpAccessService: IAuthenticationMcpAccessService, authenticationExtensionsService: IAuthenticationExtensionsService, authenticationMcpService: IAuthenticationMcpService, logService: ILogService);
    provider(providerId: string): IProviderQuery;
    extension(extensionId: string): IExtensionQuery;
    mcpServer(mcpServerId: string): IMcpServerQuery;
    getProviderIds(includeInternal?: boolean): string[];
    clearAllData(confirmation: 'CLEAR_ALL_AUTH_DATA', includeInternal?: boolean): Promise<void>;
}
