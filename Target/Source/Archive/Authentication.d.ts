/**
 * @module Authentication
 * @description Defines the service for implementing the `vscode.authentication` API.
 * This service handles authentication providers, sessions, and the authentication
 * flows required by extensions, proxying requests to the host.
 */
import type { AuthenticationGetSessionOptions } from "@codeeditorland/output/vs/workbench/api/browser/mainThreadAuthentication.js";
import type { AuthenticationSession } from "@codeeditorland/output/vs/workbench/services/authentication/common/authentication.js";
import { Effect } from "effect";
import { IPCService } from "./IPC.js";
import { LoggerService } from "./Logger.js";
/**
 * @interface Authentication
 * @description The contract for the Authentication service, mirroring `vscode.authentication`.
 */
export interface Authentication {
    readonly getSession: (providerId: string, scopes: readonly string[], options?: AuthenticationGetSessionOptions) => Promise<AuthenticationSession | undefined>;
    readonly getAccounts: (providerId: string) => Promise<readonly {
        label: string;
        id: string;
    }[]>;
    readonly onDidChangeSessions: Event<AuthenticationSessionsChangeEvent>;
    readonly registerAuthenticationProvider: (id: string, label: string, provider: AuthenticationProvider, options?: AuthenticationProviderOptions) => Disposable;
    readonly getProviderInfos: () => Promise<AuthenticationProviderInformation[]>;
    readonly getSessions: (providerId: string, scopes: readonly string[], options: AuthenticationGetSessionOptions) => Promise<readonly AuthenticationSession[]>;
    readonly login: (providerId: string, scopes: readonly string[], options: AuthenticationProviderSessionOptions) => Promise<AuthenticationSession>;
    readonly logout: (providerId: string, sessionId: string) => Promise<void>;
}
declare const AuthenticationService_base: Effect.Service.Class<AuthenticationService, "Service/Authentication", {
    readonly effect: Effect.Effect<Authentication, never, LoggerService | IPCService>;
}>;
/**
 * @class AuthenticationService
 * @description The `Effect.Service` for the Authentication service.
 */
export declare class AuthenticationService extends AuthenticationService_base {
}
export {};
//# sourceMappingURL=Authentication.d.ts.map