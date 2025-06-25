import { Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
export interface AllowedMcpServer {
    id: string;
    name: string;
    /**
     * If true or undefined, the extension is allowed to use the account
     * If false, the extension is not allowed to use the account
     * TODO: undefined shouldn't be a valid value, but it is for now
     */
    allowed?: boolean;
    lastUsed?: number;
    trusted?: boolean;
}
export declare const IAuthenticationMcpAccessService: import("../../../../platform/instantiation/common/instantiation.js").ServiceIdentifier<IAuthenticationMcpAccessService>;
export interface IAuthenticationMcpAccessService {
    readonly _serviceBrand: undefined;
    readonly onDidChangeMcpSessionAccess: Event<{
        providerId: string;
        accountName: string;
    }>;
    /**
     * Check MCP server access to an account
     * @param providerId The id of the authentication provider
     * @param accountName The account name that access is checked for
     * @param mcpServerId The id of the MCP server requesting access
     * @returns Returns true or false if the user has opted to permanently grant or disallow access, and undefined
     * if they haven't made a choice yet
     */
    isAccessAllowed(providerId: string, accountName: string, mcpServerId: string): boolean | undefined;
    readAllowedMcpServers(providerId: string, accountName: string): AllowedMcpServer[];
    updateAllowedMcpServers(providerId: string, accountName: string, mcpServers: AllowedMcpServer[]): void;
    removeAllowedMcpServers(providerId: string, accountName: string): void;
}
export declare class AuthenticationMcpAccessService extends Disposable implements IAuthenticationMcpAccessService {
    private readonly _storageService;
    private readonly _productService;
    _serviceBrand: undefined;
    private _onDidChangeMcpSessionAccess;
    readonly onDidChangeMcpSessionAccess: Event<{
        providerId: string;
        accountName: string;
    }>;
    constructor(_storageService: IStorageService, _productService: IProductService);
    isAccessAllowed(providerId: string, accountName: string, mcpServerId: string): boolean | undefined;
    readAllowedMcpServers(providerId: string, accountName: string): AllowedMcpServer[];
    updateAllowedMcpServers(providerId: string, accountName: string, mcpServers: AllowedMcpServer[]): void;
    removeAllowedMcpServers(providerId: string, accountName: string): void;
}
