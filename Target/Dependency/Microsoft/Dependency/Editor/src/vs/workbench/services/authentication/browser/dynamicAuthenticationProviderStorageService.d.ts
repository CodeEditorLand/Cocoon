import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IDynamicAuthenticationProviderStorageService, DynamicAuthenticationProviderInfo, DynamicAuthenticationProviderTokensChangeEvent } from '../common/dynamicAuthenticationProviderStorage.js';
import { ISecretStorageService } from '../../../../platform/secrets/common/secrets.js';
import { IAuthorizationTokenResponse } from '../../../../base/common/oauth.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
export declare class DynamicAuthenticationProviderStorageService extends Disposable implements IDynamicAuthenticationProviderStorageService {
    private readonly storageService;
    private readonly secretStorageService;
    private readonly logService;
    readonly _serviceBrand: undefined;
    private static readonly PROVIDERS_STORAGE_KEY;
    private readonly _onDidChangeTokens;
    readonly onDidChangeTokens: Event<DynamicAuthenticationProviderTokensChangeEvent>;
    constructor(storageService: IStorageService, secretStorageService: ISecretStorageService, logService: ILogService);
    getClientId(providerId: string): string | undefined;
    storeClientId(providerId: string, authorizationServer: string, clientId: string, label?: string): void;
    private _trackProvider;
    private _getStoredProviders;
    private _storeProviders;
    getInteractedProviders(): ReadonlyArray<DynamicAuthenticationProviderInfo>;
    removeDynamicProvider(providerId: string): Promise<void>;
    getSessionsForDynamicAuthProvider(authProviderId: string, clientId: string): Promise<(IAuthorizationTokenResponse & {
        created_at: number;
    })[] | undefined>;
    setSessionsForDynamicAuthProvider(authProviderId: string, clientId: string, sessions: (IAuthorizationTokenResponse & {
        created_at: number;
    })[]): Promise<void>;
}
