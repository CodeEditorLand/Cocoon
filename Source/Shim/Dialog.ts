/*
 * File: Cocoon/Source/Shim/Dialog.ts
 * Responsibility: Provides a shim implementation for handling file dialog operations, enabling VS Code extensions to interact with the native file dialog through the Cocoon sidecar by communicating with the Mountain backend.
 * Modified: 2025-06-07 00:57:45 UTC
 * Dependency: vs/base/common/uri
 * Export: IExtHostDialogServiceShape, ShimExtHostDialogService
 */

// Defines the shim for the `vscode.window` dialog-related functions,
// such as showing file open/save dialogs.

import type { UriComponents as VSCodeInternalUriComponents } from "vs/base/common/uri";
import type {
	CancellationToken,
	OpenDialogOptions as VscodeOpenDialogOptions,
	SaveDialogOptions as VscodeSaveDialogOptions,
	Uri as VscodeUri,
} from "vscode";

import {
	BaseCocoonShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
} from "./_BaseShim";

// DTO interfaces for IPC communication with Mountain, mirroring the structure of the options.
interface IFileFilterForIpc {
	Name: string;
	Extension: readonly string[];
}

interface IOpenDialogOptionForIpc
	extends Omit<VscodeOpenDialogOptions, "defaultUri" | "filters"> {
	DefaultUri?: VSCodeInternalUriComponents;
	Filter?: IFileFilterForIpc[];
}

interface ISaveDialogOptionForIpc
	extends Omit<VscodeSaveDialogOptions, "defaultUri" | "filters"> {
	DefaultUri?: VSCodeInternalUriComponents;
	Filter?: IFileFilterForIpc[];
}

export interface IExtHostDialogServiceShape {
	readonly _serviceBrand: undefined;
	ShowOpenDialog(
		Option?: VscodeOpenDialogOptions,
		Token?: CancellationToken,
	): Promise<VscodeUri[] | undefined>;
	ShowSaveDialog(
		Option?: VscodeSaveDialogOptions,
		Token?: CancellationToken,
	): Promise<VscodeUri | undefined>;
}

export class ShimExtHostDialogService
	extends BaseCocoonShim
	implements IExtHostDialogServiceShape
{
	public readonly _serviceBrand: undefined;

	constructor(
		RpcService: IRpcProtocolServiceAdapter | undefined,
		LogService: ILogServiceForShim | undefined,
	) {
		super("ExtHostDialogService", RpcService, LogService);
		this._LogDebug("Initialized.");
	}

	protected override _RequireRpc(): boolean {
		return false; // Uses direct IPC calls, not standard RPCProxy
	}

	private _SerializeFilterForIpc(Filter?: {
		[name: string]: readonly string[];
	}): IFileFilterForIpc[] | undefined {
		if (!Filter || Object.keys(Filter).length === 0) return undefined;
		return Object.entries(Filter).map(([Name, Extension]) => ({
			Name,
			Extension,
		}));
	}

	public async ShowOpenDialog(
		Option?: VscodeOpenDialogOptions,
		Token?: CancellationToken,
	): Promise<VscodeUri[] | undefined> {
		if (Token?.isCancellationRequested) return undefined;
		const IpcOption: IOpenDialogOptionForIpc = { ...(Option || {}) };
		if (Option?.defaultUri) {
			IpcOption.DefaultUri = this._ConvertApiArgToInternal(
				Option.defaultUri,
			) as VSCodeInternalUriComponents;
		}
		IpcOption.Filter = this._SerializeFilterForIpc(Option?.filters);

		try {
			const Result = (await this._IpcRequestResponse(
				"ui_showOpenDialog",
				IpcOption,
			)) as VSCodeInternalUriComponents[] | null | undefined;
			if (Token?.isCancellationRequested || !Result) return undefined;
			return Result.map((UriDto) =>
				this._ReviveApiArgument<VscodeUri>(UriDto),
			);
		} catch (Error: any) {
			if (!Token?.isCancellationRequested)
				this._LogError(`ShowOpenDialog failed:`, Error);
			return undefined;
		}
	}

	public async ShowSaveDialog(
		Option?: VscodeSaveDialogOptions,
		Token?: CancellationToken,
	): Promise<VscodeUri | undefined> {
		if (Token?.isCancellationRequested) return undefined;
		const IpcOption: ISaveDialogOptionForIpc = { ...(Option || {}) };
		if (Option?.defaultUri) {
			IpcOption.DefaultUri = this._ConvertApiArgToInternal(
				Option.defaultUri,
			) as VSCodeInternalUriComponents;
		}
		IpcOption.Filter = this._SerializeFilterForIpc(Option?.filters);

		try {
			const Result = (await this._IpcRequestResponse(
				"ui_showSaveDialog",
				IpcOption,
			)) as VSCodeInternalUriComponents | null | undefined;
			if (Token?.isCancellationRequested || !Result) return undefined;
			return this._ReviveApiArgument<VscodeUri>(Result);
		} catch (Error: any) {
			if (!Token?.isCancellationRequested)
				this._LogError(`ShowSaveDialog failed:`, Error);
			return undefined;
		}
	}

	public override Dispose(): void {
		super.Dispose();
	}
}
