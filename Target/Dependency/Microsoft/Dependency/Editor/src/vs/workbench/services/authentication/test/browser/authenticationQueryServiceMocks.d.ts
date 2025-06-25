import { Disposable, IDisposable } from '../../../../../base/common/lifecycle.js';
import { AuthenticationSession, AuthenticationSessionAccount, IAuthenticationProvider, IAuthenticationService, IAuthenticationExtensionsService } from '../../common/authentication.js';
import { IAuthenticationUsageService } from '../../browser/authenticationUsageService.js';
import { IAuthenticationMcpUsageService } from '../../browser/authenticationMcpUsageService.js';
import { IAuthenticationAccessService } from '../../browser/authenticationAccessService.js';
import { IAuthenticationMcpAccessService } from '../../browser/authenticationMcpAccessService.js';
import { IAuthenticationMcpService } from '../../browser/authenticationMcpService.js';
/**
 * Helper function to create a mock authentication provider
 */
export declare function createProvider(overrides?: Partial<IAuthenticationProvider>): IAuthenticationProvider;
/**
 * Helper function to create a mock authentication session
 */
export declare function createSession(): AuthenticationSession;
/**
 * Interface for tracking method calls in mock services
 */
interface MethodCall {
    method: string;
    args: any[];
    timestamp: number;
}
/**
 * Base class for test services with common functionality and call tracking
 */
export declare abstract class BaseTestService extends Disposable {
    protected readonly data: Map<string, any>;
    private readonly _methodCalls;
    protected getKey(...parts: string[]): string;
    /**
     * Track a method call for verification in tests
     */
    protected trackCall(method: string, ...args: any[]): void;
    /**
     * Get all method calls for verification
     */
    getMethodCalls(): readonly MethodCall[];
    /**
     * Get calls for a specific method
     */
    getCallsFor(method: string): readonly MethodCall[];
    /**
     * Clear method call history
     */
    clearCallHistory(): void;
    /**
     * Get the last call for a specific method
     */
    getLastCallFor(method: string): MethodCall | undefined;
}
/**
 * Test implementation that actually stores and retrieves data
 */
export declare class TestUsageService extends BaseTestService implements IAuthenticationUsageService {
    readonly _serviceBrand: undefined;
    readAccountUsages(providerId: string, accountName: string): any[];
    addAccountUsage(providerId: string, accountName: string, scopes: readonly string[], extensionId: string, extensionName: string): void;
    removeAccountUsage(providerId: string, accountName: string): void;
    initializeExtensionUsageCache(): Promise<void>;
    extensionUsesAuth(extensionId: string): Promise<boolean>;
}
export declare class TestMcpUsageService extends BaseTestService implements IAuthenticationMcpUsageService {
    readonly _serviceBrand: undefined;
    readAccountUsages(providerId: string, accountName: string): any[];
    addAccountUsage(providerId: string, accountName: string, scopes: readonly string[], mcpServerId: string, mcpServerName: string): void;
    removeAccountUsage(providerId: string, accountName: string): void;
    initializeUsageCache(): Promise<void>;
    hasUsedAuth(mcpServerId: string): Promise<boolean>;
}
export declare class TestAccessService extends BaseTestService implements IAuthenticationAccessService {
    readonly _serviceBrand: undefined;
    private readonly _onDidChangeExtensionSessionAccess;
    onDidChangeExtensionSessionAccess: import("../../../../workbench.web.main.internal.js").Event<any>;
    isAccessAllowed(providerId: string, accountName: string, extensionId: string): boolean | undefined;
    readAllowedExtensions(providerId: string, accountName: string): any[];
    updateAllowedExtensions(providerId: string, accountName: string, extensions: any[]): void;
    removeAllowedExtensions(providerId: string, accountName: string): void;
}
export declare class TestMcpAccessService extends BaseTestService implements IAuthenticationMcpAccessService {
    readonly _serviceBrand: undefined;
    private readonly _onDidChangeMcpSessionAccess;
    onDidChangeMcpSessionAccess: import("../../../../workbench.web.main.internal.js").Event<any>;
    isAccessAllowed(providerId: string, accountName: string, mcpServerId: string): boolean | undefined;
    readAllowedMcpServers(providerId: string, accountName: string): any[];
    updateAllowedMcpServers(providerId: string, accountName: string, mcpServers: any[]): void;
    removeAllowedMcpServers(providerId: string, accountName: string): void;
}
export declare class TestPreferencesService extends BaseTestService {
    private readonly _onDidChangeAccountPreference;
    onDidChangeAccountPreference: import("../../../../workbench.web.main.internal.js").Event<any>;
    getAccountPreference(clientId: string, providerId: string): string | undefined;
    updateAccountPreference(clientId: string, providerId: string, account: any): void;
    removeAccountPreference(clientId: string, providerId: string): void;
}
export declare class TestExtensionsService extends TestPreferencesService implements IAuthenticationExtensionsService {
    readonly _serviceBrand: undefined;
    updateSessionPreference(): void;
    getSessionPreference(): string | undefined;
    removeSessionPreference(): void;
    selectSession(): Promise<any>;
    requestSessionAccess(): void;
    requestNewSession(): Promise<void>;
}
export declare class TestMcpService extends TestPreferencesService implements IAuthenticationMcpService {
    readonly _serviceBrand: undefined;
    updateSessionPreference(): void;
    getSessionPreference(): string | undefined;
    removeSessionPreference(): void;
    selectSession(): Promise<any>;
    requestSessionAccess(): void;
    requestNewSession(): Promise<void>;
}
/**
 * Minimal authentication service mock that only implements what we need
 */
export declare class TestAuthenticationService extends BaseTestService implements IAuthenticationService {
    readonly _serviceBrand: undefined;
    private readonly _onDidChangeSessions;
    private readonly _onDidRegisterAuthenticationProvider;
    private readonly _onDidUnregisterAuthenticationProvider;
    private readonly _onDidChangeDeclaredProviders;
    onDidChangeSessions: import("../../../../workbench.web.main.internal.js").Event<any>;
    onDidRegisterAuthenticationProvider: import("../../../../workbench.web.main.internal.js").Event<any>;
    onDidUnregisterAuthenticationProvider: import("../../../../workbench.web.main.internal.js").Event<any>;
    onDidChangeDeclaredProviders: import("../../../../workbench.web.main.internal.js").Event<void>;
    private readonly accountsMap;
    registerAuthenticationProvider(id: string, provider: IAuthenticationProvider): void;
    getProviderIds(): string[];
    isAuthenticationProviderRegistered(id: string): boolean;
    getProvider(id: string): IAuthenticationProvider;
    addAccounts(providerId: string, accounts: AuthenticationSessionAccount[]): void;
    getAccounts(providerId: string): Promise<readonly AuthenticationSessionAccount[]>;
    get declaredProviders(): any[];
    isDynamicAuthenticationProvider(): boolean;
    getSessions(): Promise<readonly AuthenticationSession[]>;
    createSession(): Promise<AuthenticationSession>;
    removeSession(): Promise<void>;
    manageTrustedExtensionsForAccount(): void;
    removeAccountSessions(): Promise<void>;
    registerDeclaredAuthenticationProvider(): void;
    unregisterDeclaredAuthenticationProvider(): void;
    unregisterAuthenticationProvider(): void;
    registerAuthenticationProviderHostDelegate(): IDisposable;
    createDynamicAuthenticationProvider(): Promise<any>;
    requestNewSession(): Promise<AuthenticationSession>;
    getSession(): Promise<AuthenticationSession | undefined>;
    getOrActivateProviderIdForServer(): Promise<string | undefined>;
    supportsHeimdallConnection(): boolean;
}
export {};
