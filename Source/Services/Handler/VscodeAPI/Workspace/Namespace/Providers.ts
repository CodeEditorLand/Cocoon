/**
 * @module Handler/VscodeAPI/WorkspaceNamespace/Providers
 * @description
 * Provider registration builders for the workspace shim:
 * registerTextDocumentContentProvider, registerFileSystemProvider,
 * registerTaskProvider, registerNotebookContentProvider,
 * registerNotebookSerializer, registerRemoteAuthorityResolver,
 * registerResourceLabelFormatter.
 */

import { NextProviderHandle } from "../../../../Language/Provider/Registry.js";
import type { HandlerContext } from "../../../Handler/Context.js";

const MakeProvider =
	(
		Context: HandlerContext,
		RegisterMethod: string,
		UnregisterMethod: string,
		_LegacyHandlePrefix: string,
		ExtraPayload: (Key: string) => Record<string, unknown>,
		OnRegister?: (Handle: number, Key: string, Provider: any) => void,
		OnDispose?: (Handle: number, Key: string) => void,
	) =>
	(Key: string, _Provider: any, _Options?: any) => {
		const Handle = NextProviderHandle();
		Context.SendToMountain(RegisterMethod, {
			handle: Handle,
			...ExtraPayload(Key),
		}).catch(() => {});
		OnRegister?.(Handle, Key, _Provider);
		return {
			dispose: () => {
				OnDispose?.(Handle, Key);
				Context.SendToMountain(UnregisterMethod, {
					handle: Handle,
				}).catch(() => {});
			},
		};
	};

export const BuildRegisterTextDocumentContentProvider = (
	Context: HandlerContext,
) =>
	MakeProvider(
		Context,
		"register_text_document_content_provider",
		"unregister_text_document_content_provider",
		"textDocumentContent",
		(Scheme) => ({ scheme: Scheme, extensionId: "" }),
		(_Handle, Scheme, Provider) => {
			Context.ExtensionRegistry.set(
				`__textDocumentContentProvider:${Scheme}`,
				Provider,
			);
		},
		(_Handle, Scheme) => {
			Context.ExtensionRegistry.delete(
				`__textDocumentContentProvider:${Scheme}`,
			);
		},
	);

/**
 * Local registry of schemes an extension has claimed via
 * `workspace.registerFileSystemProvider(scheme, provider, ...)`.
 *
 * Used by `FileSystemNamespace`'s tier-A/tier-C routing decision: for a
 * `file://` URI, if the `file` scheme is NOT in this set, the operation
 * can run natively in Cocoon's Node runtime (zero Mountain RTT). If an
 * extension has registered a provider for the scheme, we MUST forward to
 * Mountain so the provider is consulted - otherwise the extension's
 * ability to serve custom URIs silently breaks.
 *
 * Exported so the routing module + its tests can read it. `disposeAll`
 * is for test teardown.
 */
export const ClaimedFileSystemSchemes = new Set<string>();

export const BuildRegisterFileSystemProvider =
	(Context: HandlerContext) =>
	(
		Scheme: string,
		_Provider: any,
		Options?: { isCaseSensitive?: boolean; isReadonly?: boolean },
	) => {
		const Handle = NextProviderHandle();
		ClaimedFileSystemSchemes.add(Scheme);
		Context.SendToMountain("register_file_system_provider", {
			handle: Handle,
			scheme: Scheme,
			isCaseSensitive: Options?.isCaseSensitive ?? true,
			isReadonly: Options?.isReadonly ?? false,
			extensionId: "",
		}).catch(() => {});
		return {
			dispose: () => {
				ClaimedFileSystemSchemes.delete(Scheme);
				Context.SendToMountain("unregister_file_system_provider", {
					handle: Handle,
				}).catch(() => {});
			},
		};
	};

export const BuildRegisterTaskProvider = (Context: HandlerContext) =>
	MakeProvider(
		Context,
		"register_task_provider",
		"unregister_task_provider",
		"taskProvider",
		(TaskType) => ({ taskType: TaskType, extensionId: "" }),
	);

export const BuildRegisterNotebookContentProvider = (Context: HandlerContext) =>
	MakeProvider(
		Context,
		"register_notebook_content_provider",
		"unregister_notebook_content_provider",
		"notebookContent",
		(NotebookType) => ({ notebookType: NotebookType, extensionId: "" }),
	);

export const BuildRegisterNotebookSerializer = (Context: HandlerContext) =>
	MakeProvider(
		Context,
		"register_notebook_serializer",
		"unregister_notebook_serializer",
		"notebookSerializer",
		(NotebookType) => ({ notebookType: NotebookType, extensionId: "" }),
	);

export const BuildRegisterRemoteAuthorityResolver =
	(Context: HandlerContext) =>
	(AuthorityPrefix: string, _Resolver: unknown) => {
		Context.SendToMountain("register_remote_authority_resolver", {
			authorityPrefix: AuthorityPrefix,
			extensionId: "",
		}).catch(() => {});
		return {
			dispose: () => {
				Context.SendToMountain("unregister_remote_authority_resolver", {
					authorityPrefix: AuthorityPrefix,
				}).catch(() => {});
			},
		};
	};

export const BuildRegisterResourceLabelFormatter =
	(Context: HandlerContext) => (Formatter: unknown) => {
		Context.SendToMountain("register_resource_label_formatter", {
			formatter: Formatter,
		}).catch(() => {});
		return { dispose: () => {} };
	};
