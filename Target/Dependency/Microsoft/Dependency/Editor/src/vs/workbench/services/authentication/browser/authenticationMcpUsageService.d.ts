import { Disposable } from '../../../../base/common/lifecycle.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IAuthenticationService } from '../common/authentication.js';
export interface IAuthenticationMcpUsage {
    mcpServerId: string;
    mcpServerName: string;
    lastUsed: number;
    scopes?: string[];
}
export declare const IAuthenticationMcpUsageService: import("../../../../platform/instantiation/common/instantiation.js").ServiceIdentifier<IAuthenticationMcpUsageService>;
export interface IAuthenticationMcpUsageService {
    readonly _serviceBrand: undefined;
    /**
     * Initializes the cache of MCP servers that use authentication. Ideally used in a contribution that can be run eventually after the workspace is loaded.
     */
    initializeUsageCache(): Promise<void>;
    /**
     * Checks if an MCP server uses authentication
     * @param mcpServerId The id of the MCP server to check
     */
    hasUsedAuth(mcpServerId: string): Promise<boolean>;
    /**
     * Reads the usages for an account
     * @param providerId The id of the authentication provider to get usages for
     * @param accountName The name of the account to get usages for
     */
    readAccountUsages(providerId: string, accountName: string): IAuthenticationMcpUsage[];
    /**
     *
     * @param providerId The id of the authentication provider to get usages for
     * @param accountName The name of the account to get usages for
     */
    removeAccountUsage(providerId: string, accountName: string): void;
    /**
     * Adds a usage for an account
     * @param providerId The id of the authentication provider to get usages for
     * @param accountName The name of the account to get usages for
     * @param mcpServerId The id of the MCP server to add a usage for
     * @param mcpServerName The name of the MCP server to add a usage for
     */
    addAccountUsage(providerId: string, accountName: string, scopes: ReadonlyArray<string>, mcpServerId: string, mcpServerName: string): void;
}
export declare class AuthenticationMcpUsageService extends Disposable implements IAuthenticationMcpUsageService {
    private readonly _storageService;
    private readonly _authenticationService;
    private readonly _logService;
    _serviceBrand: undefined;
    private _queue;
    private _mcpServersUsingAuth;
    constructor(_storageService: IStorageService, _authenticationService: IAuthenticationService, _logService: ILogService, productService: IProductService);
    initializeUsageCache(): Promise<void>;
    hasUsedAuth(mcpServerId: string): Promise<boolean>;
    readAccountUsages(providerId: string, accountName: string): IAuthenticationMcpUsage[];
    removeAccountUsage(providerId: string, accountName: string): void;
    addAccountUsage(providerId: string, accountName: string, scopes: string[], mcpServerId: string, mcpServerName: string): void;
    private _addToCache;
}
