/**
 * @module WebviewImplementation
 * @description The concrete implementation of the `vscode.Webview` interface.
 * An instance of this class represents a single webview from the extension host's
 * perspective, proxying state changes to the Mountain host.
 */

import { Schemas } from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/network.js";
import type { IExtensionDescription } from "@codeeditorland/output/Target/Microsoft/VSCode/vs/platform/extensions/common/extensions.js";
import type { Event, Uri, Webview, WebviewOptions } from "vscode";

import { ConvertContentOptionToDTO } from "../../TypeConverter/Webview/Convert/Content/Option/To/DTO.js";
import { CreateEventStream } from "../../Utility/Event/Stream.js";

/**
 * @interface IPC
 * @description Promise-based fire-and-forget IPC surface used by webview
 * implementations to relay state changes to the Mountain host.
 */
export interface IPC {
	readonly SendNotification: (
		Method: string,

		Params: unknown[],
	) => Promise<void>;

	readonly SendRequest: <T>(
		Method: string,

		Params: unknown[],
	) => Promise<T>;
}

/**
 * @class WebviewImplementation
 * @implements {Webview}
 */
export class WebviewImplementation implements Webview {
	private IsDisposed = false;

	private _html = "";

	private _options: WebviewOptions;

	private readonly OnDidReceiveMessageEmitter = CreateEventStream<any>();

	public readonly onDidReceiveMessage: Event<any>;

	constructor(
		public readonly Handle: string,

		private readonly IPCService: IPC,

		private readonly Extension: IExtensionDescription,

		InitialOptions: WebviewOptions,
	) {
		this._options = InitialOptions;

		this.onDidReceiveMessage = this.OnDidReceiveMessageEmitter.event;
	}

	public get html(): string {
		return this._html;
	}

	public set html(Value: string) {
		if (this.IsDisposed || this._html === Value) return;

		this._html = Value;

		void this.IPCService.SendNotification("$setWebviewHtml", [
			this.Handle,

			Value,
		]).catch(() => {});
	}

	public get options(): WebviewOptions {
		return this._options;
	}

	public set options(NewOptions: WebviewOptions) {
		if (this.IsDisposed) return;

		this._options = NewOptions;

		const OptionsDTO = ConvertContentOptionToDTO(
			this.Extension,

			NewOptions,
		);

		void this.IPCService.SendNotification("$setWebviewOptions", [
			this.Handle,

			OptionsDTO,
		]).catch(() => {});
	}

	public get cspSource(): string {
		// `asWebviewUri` produces `vscode-file://<extensionId>/<path>` URIs
		// (see implementation below). The webview's CSP must allow that
		// scheme or the rewritten URLs are blocked by the renderer's
		// content security policy and every extension-supplied icon /
		// script / stylesheet 404s with a CSP refusal in DevTools.
		// Legacy schemes are kept for extensions that hardcode them.
		// WKWebView does not recognise custom protocol scheme sources
		// in CSP (e.g. "vscode-file:" in font-src), so include a
		// wildcard fallback so fonts still render.
		return "vscode-file: vscode-resource: vscode-webview-resource: https: *";
	}

	public postMessage(Message: any): Promise<boolean> {
		if (this.IsDisposed) return Promise.resolve(false);

		return this.IPCService.SendRequest<boolean>("$postMessageToWebview", [
			this.Handle,

			Message,
		]).catch(() => false);
	}

	public asWebviewUri(LocalResource: Uri): Uri {
		const Authority = this.Extension.identifier.value.toLowerCase();

		return LocalResource.with({
			scheme: Schemas.vscodeFileResource,
			authority: Authority,
		});
	}

	public fireDidReceiveMessage(Message: any): void {
		if (!this.IsDisposed) {
			this.OnDidReceiveMessageEmitter.Fire(Message);
		}
	}

	public dispose(): void {
		if (!this.IsDisposed) {
			this.IsDisposed = true;

			this.OnDidReceiveMessageEmitter.Shutdown();
		}
	}
}
