/**
 * @module Handler/VscodeAPI/WorkspaceNamespace/Providers
 * @description
 * Provider registration builders for the workspace shim:
 * registerTextDocumentContentProvider, registerFileSystemProvider,
 * registerTaskProvider, registerNotebookContentProvider,
 * registerNotebookSerializer, registerRemoteAuthorityResolver,
 * registerResourceLabelFormatter.
 */

import type { HandlerContext } from "../../HandlerContext.js";

const MakeProvider = (
	Context: HandlerContext,
	RegisterMethod: string,
	UnregisterMethod: string,
	HandlePrefix: string,
	ExtraPayload: (Key: string) => Record<string, unknown>,
	OnRegister?: (Handle: string, Key: string, Provider: any) => void,
	OnDispose?: (Handle: string, Key: string) => void,
) =>
(Key: string, _Provider: any, _Options?: any) => {
	const Handle = `${HandlePrefix}:${Key}:${Date.now()}`;
	Context.SendToMountain(RegisterMethod, {
		handle: Handle,
		...ExtraPayload(Key),
	}).catch(() => {});
	OnRegister?.(Handle, Key, _Provider);
	return {
		dispose: () => {
			OnDispose?.(Handle, Key);
			Context.SendToMountain(UnregisterMethod, { handle: Handle }).catch(
				() => {},
			);
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
		(Scheme) => ({ scheme: Scheme, extension_id: "" }),
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

export const BuildRegisterFileSystemProvider =
	(Context: HandlerContext) =>
	(
		Scheme: string,
		_Provider: any,
		Options?: { isCaseSensitive?: boolean; isReadonly?: boolean },
	) => {
		const Handle = `fileSystemProvider:${Scheme}:${Date.now()}`;
		Context.SendToMountain("register_file_system_provider", {
			handle: Handle,
			scheme: Scheme,
			is_case_sensitive: Options?.isCaseSensitive ?? true,
			is_readonly: Options?.isReadonly ?? false,
			extension_id: "",
		}).catch(() => {});
		return {
			dispose: () => {
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
		(TaskType) => ({ task_type: TaskType, extension_id: "" }),
	);

export const BuildRegisterNotebookContentProvider = (
	Context: HandlerContext,
) =>
	MakeProvider(
		Context,
		"register_notebook_content_provider",
		"unregister_notebook_content_provider",
		"notebookContent",
		(NotebookType) => ({ notebook_type: NotebookType, extension_id: "" }),
	);

export const BuildRegisterNotebookSerializer = (Context: HandlerContext) =>
	MakeProvider(
		Context,
		"register_notebook_serializer",
		"unregister_notebook_serializer",
		"notebookSerializer",
		(NotebookType) => ({ notebook_type: NotebookType, extension_id: "" }),
	);

export const BuildRegisterRemoteAuthorityResolver =
	(Context: HandlerContext) =>
	(AuthorityPrefix: string, _Resolver: unknown) => {
		Context.SendToMountain("register_remote_authority_resolver", {
			authority_prefix: AuthorityPrefix,
			extension_id: "",
		}).catch(() => {});
		return {
			dispose: () => {
				Context.SendToMountain(
					"unregister_remote_authority_resolver",
					{ authority_prefix: AuthorityPrefix },
				).catch(() => {});
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
