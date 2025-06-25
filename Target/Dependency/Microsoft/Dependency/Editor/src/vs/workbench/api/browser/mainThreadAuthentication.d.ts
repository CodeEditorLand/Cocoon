import { Disposable } from '../../../base/common/lifecycle.js';
import { IExtHostContext } from '../../services/extensions/common/extHostCustomers.js';
import { AuthenticationSession, AuthenticationSessionsChangeEvent, IAuthenticationProvider, IAuthenticationService, IAuthenticationExtensionsService, AuthenticationSessionAccount, IAuthenticationProviderSessionOptions } from '../../services/authentication/common/authentication.js';
import { ExtHostAuthenticationShape, MainThreadAuthenticationShape } from '../common/extHost.protocol.js';
import { IDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { INotificationService } from '../../../platform/notification/common/notification.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
import { ITelemetryService } from '../../../platform/telemetry/common/telemetry.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { IAuthenticationAccessService } from '../../services/authentication/browser/authenticationAccessService.js';
import { IAuthenticationUsageService } from '../../services/authentication/browser/authenticationUsageService.js';
import { URI, UriComponents } from '../../../base/common/uri.js';
import { IOpenerService } from '../../../platform/opener/common/opener.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { IURLService } from '../../../platform/url/common/url.js';
import { IAuthorizationTokenResponse } from '../../../base/common/oauth.js';
import { IDynamicAuthenticationProviderStorageService } from '../../services/authentication/common/dynamicAuthenticationProviderStorage.js';
import { IClipboardService } from '../../../platform/clipboard/common/clipboardService.js';
export interface AuthenticationInteractiveOptions {
    detail?: string;
    learnMore?: UriComponents;
    sessionToRecreate?: AuthenticationSession;
}
export interface AuthenticationGetSessionOptions {
    clearSessionPreference?: boolean;
    createIfNone?: boolean | AuthenticationInteractiveOptions;
    forceNewSession?: boolean | AuthenticationInteractiveOptions;
    silent?: boolean;
    account?: AuthenticationSessionAccount;
    authorizationServer?: UriComponents;
}
export declare class MainThreadAuthenticationProvider extends Disposable implements IAuthenticationProvider {
    private readonly _proxy;
    readonly id: string;
    readonly label: string;
    readonly supportsMultipleAccounts: boolean;
    readonly authorizationServers: ReadonlyArray<URI>;
    readonly onDidChangeSessions: Event<AuthenticationSessionsChangeEvent>;
    constructor(_proxy: ExtHostAuthenticationShape, id: string, label: string, supportsMultipleAccounts: boolean, authorizationServers: ReadonlyArray<URI>, onDidChangeSessionsEmitter: Emitter<AuthenticationSessionsChangeEvent>);
    getSessions(scopes: string[] | undefined, options: IAuthenticationProviderSessionOptions): Promise<readonly AuthenticationSession[]>;
    createSession(scopes: string[], options: IAuthenticationProviderSessionOptions): Promise<AuthenticationSession>;
    removeSession(sessionId: string): Promise<void>;
}
export declare class MainThreadAuthentication extends Disposable implements MainThreadAuthenticationShape {
    private readonly authenticationService;
    private readonly authenticationExtensionsService;
    private readonly authenticationAccessService;
    private readonly authenticationUsageService;
    private readonly dialogService;
    private readonly notificationService;
    private readonly extensionService;
    private readonly telemetryService;
    private readonly openerService;
    private readonly logService;
    private readonly urlService;
    private readonly dynamicAuthProviderStorageService;
    private readonly clipboardService;
    private readonly _proxy;
    private readonly _registrations;
    private _sentProviderUsageEvents;
    private _suppressUnregisterEvent;
    constructor(extHostContext: IExtHostContext, authenticationService: IAuthenticationService, authenticationExtensionsService: IAuthenticationExtensionsService, authenticationAccessService: IAuthenticationAccessService, authenticationUsageService: IAuthenticationUsageService, dialogService: IDialogService, notificationService: INotificationService, extensionService: IExtensionService, telemetryService: ITelemetryService, openerService: IOpenerService, logService: ILogService, urlService: IURLService, dynamicAuthProviderStorageService: IDynamicAuthenticationProviderStorageService, clipboardService: IClipboardService);
    $registerAuthenticationProvider(id: string, label: string, supportsMultipleAccounts: boolean, supportedAuthorizationServer?: UriComponents[]): Promise<void>;
    $unregisterAuthenticationProvider(id: string): Promise<void>;
    $ensureProvider(id: string): Promise<void>;
    $sendDidChangeSessions(providerId: string, event: AuthenticationSessionsChangeEvent): Promise<void>;
    $removeSession(providerId: string, sessionId: string): Promise<void>;
    $waitForUriHandler(expectedUri: UriComponents): Promise<UriComponents>;
    $showContinueNotification(message: string): Promise<boolean>;
    $registerDynamicAuthenticationProvider(id: string, label: string, authorizationServer: UriComponents, clientId: string): Promise<void>;
    $setSessionsForDynamicAuthProvider(authProviderId: string, clientId: string, sessions: (IAuthorizationTokenResponse & {
        created_at: number;
    })[]): Promise<void>;
    private loginPrompt;
    private continueWithIncorrectAccountPrompt;
    private doGetSession;
    $getSession(providerId: string, scopes: string[], extensionId: string, extensionName: string, options: AuthenticationGetSessionOptions): Promise<AuthenticationSession | undefined>;
    $getAccounts(providerId: string): Promise<ReadonlyArray<AuthenticationSessionAccount>>;
    private _sentClientIdUsageEvents;
    private sendClientIdUsageTelemetry;
    private sendProviderUsageTelemetry;
    private _getAccountPreference;
    private _updateAccountPreference;
    private _removeAccountPreference;
    $showDeviceCodeModal(userCode: string, verificationUri: string): Promise<boolean>;
}
