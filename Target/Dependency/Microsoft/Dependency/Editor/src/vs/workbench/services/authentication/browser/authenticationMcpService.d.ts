import { Disposable } from '../../../../base/common/lifecycle.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IActivityService } from '../../activity/common/activity.js';
import { IAuthenticationMcpAccessService } from './authenticationMcpAccessService.js';
import { IAuthenticationMcpUsageService } from './authenticationMcpUsageService.js';
import { AuthenticationSession, IAuthenticationService, AuthenticationSessionAccount } from '../common/authentication.js';
import { Event } from '../../../../base/common/event.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
export declare const IAuthenticationMcpService: import("../../../../platform/instantiation/common/instantiation.js").ServiceIdentifier<IAuthenticationMcpService>;
export interface IAuthenticationMcpService {
    readonly _serviceBrand: undefined;
    /**
     * Fires when an account preference for a specific provider has changed for the specified MCP servers. Does not fire when:
     * * An account preference is removed
     * * A session preference is changed (because it's deprecated)
     * * A session preference is removed (because it's deprecated)
     */
    onDidChangeAccountPreference: Event<{
        mcpServerIds: string[];
        providerId: string;
    }>;
    /**
     * Returns the accountName (also known as account.label) to pair with `IAuthenticationMCPServerAccessService` to get the account preference
     * @param providerId The authentication provider id
     * @param mcpServerId The MCP server id to get the preference for
     * @returns The accountName of the preference, or undefined if there is no preference set
     */
    getAccountPreference(mcpServerId: string, providerId: string): string | undefined;
    /**
     * Sets the account preference for the given provider and MCP server
     * @param providerId The authentication provider id
     * @param mcpServerId The MCP server id to set the preference for
     * @param account The account to set the preference to
     */
    updateAccountPreference(mcpServerId: string, providerId: string, account: AuthenticationSessionAccount): void;
    /**
     * Removes the account preference for the given provider and MCP server
     * @param providerId The authentication provider id
     * @param mcpServerId The MCP server id to remove the preference for
     */
    removeAccountPreference(mcpServerId: string, providerId: string): void;
    /**
     * @deprecated Sets the session preference for the given provider and MCP server
     * @param providerId
     * @param mcpServerId
     * @param session
     */
    updateSessionPreference(providerId: string, mcpServerId: string, session: AuthenticationSession): void;
    /**
     * @deprecated Gets the session preference for the given provider and MCP server
     * @param providerId
     * @param mcpServerId
     * @param scopes
     */
    getSessionPreference(providerId: string, mcpServerId: string, scopes: string[]): string | undefined;
    /**
     * @deprecated Removes the session preference for the given provider and MCP server
     * @param providerId
     * @param mcpServerId
     * @param scopes
     */
    removeSessionPreference(providerId: string, mcpServerId: string, scopes: string[]): void;
    selectSession(providerId: string, mcpServerId: string, mcpServerName: string, scopes: string[], possibleSessions: readonly AuthenticationSession[]): Promise<AuthenticationSession>;
    requestSessionAccess(providerId: string, mcpServerId: string, mcpServerName: string, scopes: string[], possibleSessions: readonly AuthenticationSession[]): void;
    requestNewSession(providerId: string, scopes: string[], mcpServerId: string, mcpServerName: string): Promise<void>;
}
export declare class AuthenticationMcpService extends Disposable implements IAuthenticationMcpService {
    private readonly activityService;
    private readonly storageService;
    private readonly dialogService;
    private readonly quickInputService;
    private readonly _productService;
    private readonly _authenticationService;
    private readonly _authenticationUsageService;
    private readonly _authenticationAccessService;
    readonly _serviceBrand: undefined;
    private _signInRequestItems;
    private _sessionAccessRequestItems;
    private readonly _accountBadgeDisposable;
    private _onDidAccountPreferenceChange;
    readonly onDidChangeAccountPreference: Event<{
        providerId: string;
        mcpServerIds: string[];
    }>;
    private _inheritAuthAccountPreferenceParentToChildren;
    private _inheritAuthAccountPreferenceChildToParent;
    constructor(activityService: IActivityService, storageService: IStorageService, dialogService: IDialogService, quickInputService: IQuickInputService, _productService: IProductService, _authenticationService: IAuthenticationService, _authenticationUsageService: IAuthenticationMcpUsageService, _authenticationAccessService: IAuthenticationMcpAccessService);
    private registerListeners;
    private updateNewSessionRequests;
    private updateAccessRequests;
    private updateBadgeCount;
    private removeAccessRequest;
    updateAccountPreference(mcpServerId: string, providerId: string, account: AuthenticationSessionAccount): void;
    getAccountPreference(mcpServerId: string, providerId: string): string | undefined;
    removeAccountPreference(mcpServerId: string, providerId: string): void;
    private _getKey;
    updateSessionPreference(providerId: string, mcpServerId: string, session: AuthenticationSession): void;
    getSessionPreference(providerId: string, mcpServerId: string, scopes: string[]): string | undefined;
    removeSessionPreference(providerId: string, mcpServerId: string, scopes: string[]): void;
    private _updateAccountAndSessionPreferences;
    private showGetSessionPrompt;
    /**
     * This function should be used only when there are sessions to disambiguate.
     */
    selectSession(providerId: string, mcpServerId: string, mcpServerName: string, scopes: string[], availableSessions: AuthenticationSession[]): Promise<AuthenticationSession>;
    private completeSessionAccessRequest;
    requestSessionAccess(providerId: string, mcpServerId: string, mcpServerName: string, scopes: string[], possibleSessions: AuthenticationSession[]): void;
    requestNewSession(providerId: string, scopes: string[], mcpServerId: string, mcpServerName: string): Promise<void>;
}
