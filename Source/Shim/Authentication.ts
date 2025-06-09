/*
 * File: Cocoon/Source/Shim/Authentication.ts
 * Responsibility: Implements the shim for the VS Code authentication API, enabling extensions to request authentication sessions and proxying these requests between the Cocoon sidecar and Mountain backend via Vine IPC.
 * Modified: 2025-06-07 05:37:42 UTC
 * Dependency: vs/base/common/lifecycle
 * Export: ShimExtHostAuthentication
 */

// Defines the shim for the `vscode.authentication` API. This provides a way for
// extensions to request authentication sessions from various providers.

import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
import { toDisposable, type IDisposable } from "vs/base/common/lifecycle";
import {
	ExtHostContext,
	MainContext,
	type AuthenticationGetSessionOptions,
	type AuthenticationSessionInfo,
	type ExtHostAuthenticationShape,
	type MainThreadAuthenticationShape,
} from "vs/workbench/api/common/extHost.protocol";
import type {
	AuthenticationProvider,
	AuthenticationProviderInformation,
	AuthenticationSession,
	AuthenticationSessionsChangeEvent,
	Extension,
} from "vscode";

import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_BaseShim";

export class ShimExtHostAuthentication
	extends BaseCocoonShim
	implements ExtHostAuthenticationShape
{
	public readonly _serviceBrand: undefined;
	readonly #MainThreadAuthenticationProxy: MainThreadAuthenticationShape | null =
		null;
	readonly #AuthenticationProvider = new Map<
		string,
		AuthenticationProvider
	>();

	private readonly _OnDidChangeAuthenticationProviderEmitter =
		this._InstanceDisposables.add(
			new VscodeEmitter<AuthenticationProviderInformation[]>(),
		);
	public readonly OnDidChangeAuthenticationProvider: VscodeEvent<
		AuthenticationProviderInformation[]
	> = this._OnDidChangeAuthenticationProviderEmitter.event;

	private readonly _OnDidChangeSessionEmitter = this._InstanceDisposables.add(
		new VscodeEmitter<AuthenticationSessionsChangeEvent>(),
	);
	public readonly OnDidChangeSession: VscodeEvent<AuthenticationSessionsChangeEvent> =
		this._OnDidChangeSessionEmitter.event;

	constructor(
		RpcService: IRpcProtocolServiceAdapter | undefined,
		LogService: ILogServiceForShim | undefined,
	) {
		super("ExtHostAuthentication", RpcService, LogService);
		this._LogInfo("Initialized.");

		if (this._RpcService) {
			this.#MainThreadAuthenticationProxy = this._GetProxy(
				MainContext.MainThreadAuthentication as ProxyIdentifier<MainThreadAuthenticationShape>,
			);
			try {
				this._RpcService.set(
					ExtHostContext.ExtHostAuthentication as ProxyIdentifier<ExtHostAuthenticationShape>,
					this,
				);
			} catch (Error: any) {
				this._LogError(
					"Failed to register self as RPC target for ExtHostAuthentication:",
					Error,
				);
			}
		}
	}

	protected override _RequireRpc(): boolean {
		return true;
	}

	public async GetSession(
		RequestingExtension: Extension,
		ProviderId: string,
		Scope: readonly string[],
		Option: AuthenticationGetSessionOptions = {},
	): Promise<AuthenticationSession | undefined> {
		this._LogDebug(
			`GetSession: Extension='${RequestingExtension.id}', Provider='${ProviderId}', Scope='${Scope.join(",")}'`,
			Option,
		);
		if (!this.#MainThreadAuthenticationProxy) {
			this._LogError("Cannot GetSession: MainThread proxy unavailable.");
			throw new Error("Authentication service is not available.");
		}
		try {
			const SessionInformation =
				await this.#MainThreadAuthenticationProxy.$getSession(
					RequestingExtension.id,
					ProviderId,
					Scope,
					Option,
				);
			return SessionInformation
				? this._ConvertInformationToSession(SessionInformation)
				: undefined;
		} catch (Error: any) {
			const RefinedError = refineErrorForShim(
				Error,
				this._LogService,
				`$getSession RPC`,
			);
			this._LogError(
				`GetSession call failed for provider '${ProviderId}':`,
				RefinedError,
			);
			throw RefinedError;
		}
	}

	public async ListSession(
		RequestingExtension: Extension,
		ProviderId: string,
		Scope: readonly string[],
	): Promise<readonly AuthenticationSession[]> {
		this._LogDebug(
			`ListSession: Extension='${RequestingExtension.id}', Provider='${ProviderId}', Scope='${Scope.join(",")}'`,
		);
		if (!this.#MainThreadAuthenticationProxy) {
			this._LogError("Cannot ListSession: MainThread proxy unavailable.");
			return [];
		}
		try {
			const SessionInformationCollection =
				await this.#MainThreadAuthenticationProxy.$getSessions(
					RequestingExtension.id,
					ProviderId,
					Scope,
				);
			return SessionInformationCollection.map((Session) =>
				this._ConvertInformationToSession(Session),
			);
		} catch (Error: any) {
			const RefinedError = refineErrorForShim(
				Error,
				this._LogService,
				`$getSessions RPC`,
			);
			this._LogError(
				`ListSession call failed for provider '${ProviderId}':`,
				RefinedError,
			);
			return [];
		}
	}

	public RegisterAuthenticationProvider(
		Id: string,
		Label: string,
		Provider: AuthenticationProvider,
		Option?: any,
	): IDisposable {
		this._LogInfo(
			`RegisterAuthenticationProvider: ID='${Id}', Label='${Label}'`,
		);
		if (this.#AuthenticationProvider.has(Id)) {
			throw new Error(
				`Authentication provider with id '${Id}' is already registered.`,
			);
		}
		this.#AuthenticationProvider.set(Id, Provider);

		const SupportMultipleAccount =
			Option?.supportsMultipleAccounts ?? false;
		this.#MainThreadAuthenticationProxy
			?.$registerAuthenticationProvider(Id, Label, SupportMultipleAccount)
			.catch((Error) =>
				this._LogError(
					`Failed to register auth provider '${Id}' on MainThread:`,
					Error,
				),
			);

		return toDisposable(() => {
			this._LogInfo(`Unregistering authentication provider: ID='${Id}'`);
			this.#AuthenticationProvider.delete(Id);
			this.#MainThreadAuthenticationProxy
				?.$unregisterAuthenticationProvider(Id)
				.catch((Error) =>
					this._LogError(
						`Failed to unregister auth provider '${Id}' on MainThread:`,
						Error,
					),
				);
		});
	}

	public $CreateSession(
		ProviderId: string,
		Scope: readonly string[],
		Option: AuthenticationGetSessionOptions,
	): Promise<AuthenticationSessionInfo> {
		const Provider = this.#AuthenticationProvider.get(ProviderId);
		if (!Provider) {
			throw new Error(
				`No authentication provider with id '${ProviderId}' is registered.`,
			);
		}
		return Provider.createSession(Scope, Option).then(
			this._ConvertSessionToInformation,
		);
	}

	public $RemoveSession(
		ProviderId: string,
		SessionId: string,
	): Promise<void> {
		const Provider = this.#AuthenticationProvider.get(ProviderId);
		if (!Provider) {
			throw new Error(
				`No authentication provider with id '${ProviderId}' is registered.`,
			);
		}
		return Provider.removeSession(SessionId);
	}

	public $ListSession(
		ProviderId: string,
		Scope: readonly string[],
	): Promise<readonly AuthenticationSessionInfo[]> {
		const Provider = this.#AuthenticationProvider.get(ProviderId);
		if (!Provider) {
			throw new Error(
				`No authentication provider with id '${ProviderId}' is registered.`,
			);
		}
		return Provider.getSessions(Scope).then((SessionCollection) =>
			SessionCollection.map(this._ConvertSessionToInformation),
		);
	}

	public $OnDidChangeAuthenticationSession(
		ProviderId: string,
		Label: string,
		Event: AuthenticationSessionsChangeEvent,
	): void {
		this._OnDidChangeSessionEmitter.fire({
			provider: { id: ProviderId, label: Label },
			...Event,
		});
	}

	public $OnDidChangeAuthenticationProvider(
		AddedProvider: AuthenticationProviderInformation[],
		RemovedProvider: AuthenticationProviderInformation[],
	): void {
		this._OnDidChangeAuthenticationProviderEmitter.fire(AddedProvider);
	}

	private _ConvertInformationToSession(
		SessionInformation: AuthenticationSessionInfo,
	): AuthenticationSession {
		return Object.freeze({
			...SessionInformation,
			account: Object.freeze(SessionInformation.account),
		});
	}

	private _ConvertSessionToInformation(
		Session: AuthenticationSession,
	): AuthenticationSessionInfo {
		return {
			id: Session.id,
			accessToken: Session.accessToken,
			account: Session.account,
			scopes: Session.scopes,
		};
	}

	public override Dispose(): void {
		super.Dispose();
	}
}
