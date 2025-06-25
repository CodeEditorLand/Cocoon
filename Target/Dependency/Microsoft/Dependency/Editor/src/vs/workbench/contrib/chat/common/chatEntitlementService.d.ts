import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Event } from '../../../../base/common/event.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IRequestService } from '../../../../platform/request/common/request.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { AuthenticationSession, IAuthenticationExtensionsService, IAuthenticationService } from '../../../services/authentication/common/authentication.js';
import { IWorkbenchExtensionEnablementService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
export declare const IChatEntitlementService: import("../../../../platform/instantiation/common/instantiation.js").ServiceIdentifier<IChatEntitlementService>;
export declare enum ChatEntitlement {
    /** Signed out */
    Unknown = 1,
    /** Signed in but not yet resolved */
    Unresolved = 2,
    /** Signed in and entitled to Free */
    Available = 3,
    /** Signed in but not entitled to Free */
    Unavailable = 4,
    /** Signed-up to Free */
    Free = 5,
    /** Signed-up to Pro */
    Pro = 6,
    /** Signed-up to Pro Plus */
    ProPlus = 7,
    /** Signed-up to Business */
    Business = 8,
    /** Signed-up to Enterprise */
    Enterprise = 9
}
export interface IChatSentiment {
    /**
     * User has Chat installed.
     */
    installed?: boolean;
    /**
     * User signals no intent in using Chat.
     *
     * Note: in contrast to `disabled`, this should not only disable
     * Chat but also hide all of its UI.
     */
    hidden?: boolean;
    /**
     * User signals intent to disable Chat.
     *
     * Note: in contrast to `hidden`, this should not hide
     * Chat but but disable its functionality.
     */
    disabled?: boolean;
    /**
     * User signals intent to use Chat later.
     */
    later?: boolean;
}
export interface IChatEntitlementService {
    _serviceBrand: undefined;
    readonly onDidChangeEntitlement: Event<void>;
    readonly entitlement: ChatEntitlement;
    readonly onDidChangeQuotaExceeded: Event<void>;
    readonly onDidChangeQuotaRemaining: Event<void>;
    readonly quotas: IQuotas;
    update(token: CancellationToken): Promise<void>;
    readonly onDidChangeSentiment: Event<void>;
    readonly sentiment: IChatSentiment;
}
/**
 * Checks the chat entitlements to see if the user falls into the paid category
 * @param chatEntitlement The chat entitlement to check
 * @returns Whether or not they are a paid user
 */
export declare function isProUser(chatEntitlement: ChatEntitlement): boolean;
interface IChatQuotasAccessor {
    clearQuotas(): void;
    acceptQuotas(quotas: IQuotas): void;
}
export declare class ChatEntitlementService extends Disposable implements IChatEntitlementService {
    private readonly contextKeyService;
    _serviceBrand: undefined;
    readonly context: Lazy<ChatEntitlementContext> | undefined;
    readonly requests: Lazy<ChatEntitlementRequests> | undefined;
    constructor(instantiationService: IInstantiationService, productService: IProductService, environmentService: IWorkbenchEnvironmentService, contextKeyService: IContextKeyService, configurationService: IConfigurationService);
    readonly onDidChangeEntitlement: Event<void>;
    get entitlement(): ChatEntitlement;
    private readonly _onDidChangeQuotaExceeded;
    readonly onDidChangeQuotaExceeded: Event<void>;
    private readonly _onDidChangeQuotaRemaining;
    readonly onDidChangeQuotaRemaining: Event<void>;
    private _quotas;
    get quotas(): IQuotas;
    private readonly chatQuotaExceededContextKey;
    private readonly completionsQuotaExceededContextKey;
    private ExtensionQuotaContextKeys;
    private registerListeners;
    acceptQuotas(quotas: IQuotas): void;
    private compareQuotas;
    clearQuotas(): void;
    private updateContextKeys;
    readonly onDidChangeSentiment: Event<void>;
    get sentiment(): IChatSentiment;
    update(token: CancellationToken): Promise<void>;
}
interface IEntitlements {
    readonly entitlement: ChatEntitlement;
    readonly quotas?: IQuotas;
}
export interface IQuotaSnapshot {
    readonly total: number;
    readonly percentRemaining: number;
    readonly overageEnabled: boolean;
    readonly overageCount: number;
    readonly unlimited: boolean;
}
interface IQuotas {
    readonly resetDate?: string;
    readonly chat?: IQuotaSnapshot;
    readonly completions?: IQuotaSnapshot;
    readonly premiumChat?: IQuotaSnapshot;
}
export declare class ChatEntitlementRequests extends Disposable {
    private readonly context;
    private readonly chatQuotasAccessor;
    private readonly telemetryService;
    private readonly authenticationService;
    private readonly logService;
    private readonly requestService;
    private readonly dialogService;
    private readonly openerService;
    private readonly configurationService;
    private readonly authenticationExtensionsService;
    private readonly lifecycleService;
    static providerId(configurationService: IConfigurationService): string;
    private state;
    private pendingResolveCts;
    private didResolveEntitlements;
    constructor(context: ChatEntitlementContext, chatQuotasAccessor: IChatQuotasAccessor, telemetryService: ITelemetryService, authenticationService: IAuthenticationService, logService: ILogService, requestService: IRequestService, dialogService: IDialogService, openerService: IOpenerService, configurationService: IConfigurationService, authenticationExtensionsService: IAuthenticationExtensionsService, lifecycleService: ILifecycleService);
    private registerListeners;
    private resolve;
    private findMatchingProviderSession;
    private doGetSessions;
    private scopesMatch;
    private resolveEntitlement;
    private doResolveEntitlement;
    private toQuotas;
    private request;
    private update;
    forceResolveEntitlement(session: AuthenticationSession | undefined, token?: Readonly<CancellationToken>): Promise<IEntitlements | undefined>;
    signUpFree(session: AuthenticationSession): Promise<true | false | {
        errorCode: number;
    }>;
    private onUnknownSignUpError;
    private onUnprocessableSignUpError;
    signIn(options?: {
        useAlternateProvider?: boolean;
    }): Promise<{
        session: AuthenticationSession;
        entitlements: IEntitlements | undefined;
    }>;
    dispose(): void;
}
export interface IChatEntitlementContextState extends IChatSentiment {
    /**
     * Users last known or resolved entitlement.
     */
    entitlement: ChatEntitlement;
    /**
     * User is or was a registered Chat user.
     */
    registered?: boolean;
}
export declare class ChatEntitlementContext extends Disposable {
    private readonly storageService;
    private readonly extensionEnablementService;
    private readonly logService;
    private readonly extensionsWorkbenchService;
    private static readonly CHAT_ENTITLEMENT_CONTEXT_STORAGE_KEY;
    private readonly canSignUpContextKey;
    private readonly signedOutContextKey;
    private readonly freeContextKey;
    private readonly proContextKey;
    private readonly proPlusContextKey;
    private readonly businessContextKey;
    private readonly enterpriseContextKey;
    private readonly hiddenContext;
    private readonly laterContext;
    private readonly installedContext;
    private readonly disabledContext;
    private _state;
    private suspendedState;
    get state(): IChatEntitlementContextState;
    private readonly _onDidChange;
    readonly onDidChange: Event<void>;
    private updateBarrier;
    constructor(contextKeyService: IContextKeyService, storageService: IStorageService, extensionEnablementService: IWorkbenchExtensionEnablementService, logService: ILogService, extensionsWorkbenchService: IExtensionsWorkbenchService);
    private checkExtensionInstallation;
    update(context: {
        installed: boolean;
        disabled: boolean;
    }): Promise<void>;
    update(context: {
        hidden: boolean;
    }): Promise<void>;
    update(context: {
        later: boolean;
    }): Promise<void>;
    update(context: {
        entitlement: ChatEntitlement;
    }): Promise<void>;
    private updateContext;
    private updateContextSync;
    suspend(): void;
    resume(): void;
}
export {};
