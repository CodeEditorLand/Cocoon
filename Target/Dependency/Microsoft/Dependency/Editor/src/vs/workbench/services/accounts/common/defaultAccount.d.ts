import { Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IAuthenticationService } from '../../authentication/common/authentication.js';
import { IRequestService } from '../../../../platform/request/common/request.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IWorkbenchContribution } from '../../../common/contributions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
export interface IDefaultAccount {
    readonly sessionId: string;
    readonly enterprise: boolean;
    readonly access_type_sku?: string;
    readonly assigned_date?: string;
    readonly can_signup_for_limited?: boolean;
    readonly chat_enabled?: boolean;
    readonly chat_preview_features_enabled?: boolean;
    readonly analytics_tracking_id?: string;
    readonly limited_user_quotas?: {
        readonly chat: number;
        readonly completions: number;
    };
    readonly monthly_quotas?: {
        readonly chat: number;
        readonly completions: number;
    };
    readonly limited_user_reset_date?: string;
}
export declare const IDefaultAccountService: import("../../../../platform/instantiation/common/instantiation.js").ServiceIdentifier<IDefaultAccountService>;
export interface IDefaultAccountService {
    readonly _serviceBrand: undefined;
    readonly onDidChangeDefaultAccount: Event<IDefaultAccount | null>;
    getDefaultAccount(): Promise<IDefaultAccount | null>;
    setDefaultAccount(account: IDefaultAccount | null): void;
}
export declare class DefaultAccountService extends Disposable implements IDefaultAccountService {
    _serviceBrand: undefined;
    private _defaultAccount;
    get defaultAccount(): IDefaultAccount | null;
    private readonly initBarrier;
    private readonly _onDidChangeDefaultAccount;
    readonly onDidChangeDefaultAccount: Event<IDefaultAccount | null>;
    getDefaultAccount(): Promise<IDefaultAccount | null>;
    setDefaultAccount(account: IDefaultAccount | null): void;
}
export declare class NullDefaultAccountService extends Disposable implements IDefaultAccountService {
    _serviceBrand: undefined;
    readonly onDidChangeDefaultAccount: Event<any>;
    getDefaultAccount(): Promise<IDefaultAccount | null>;
    setDefaultAccount(account: IDefaultAccount | null): void;
}
export declare class DefaultAccountManagementContribution extends Disposable implements IWorkbenchContribution {
    private readonly defaultAccountService;
    private readonly configurationService;
    private readonly authenticationService;
    private readonly extensionService;
    private readonly productService;
    private readonly requestService;
    private readonly logService;
    static ID: string;
    private defaultAccount;
    private readonly accountStatusContext;
    constructor(defaultAccountService: IDefaultAccountService, configurationService: IConfigurationService, authenticationService: IAuthenticationService, extensionService: IExtensionService, productService: IProductService, requestService: IRequestService, logService: ILogService, contextKeyService: IContextKeyService);
    private initialize;
    private setDefaultAccount;
    private extractFromToken;
    private getDefaultAccountFromAuthenticatedSessions;
    private scopesMatch;
    private getTokenEntitlements;
    private getChatEntitlements;
    private registerSignInAction;
}
