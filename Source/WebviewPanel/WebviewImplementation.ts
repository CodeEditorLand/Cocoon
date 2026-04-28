/**
 * @module WebviewImplementation
 * @description The concrete implementation of the `vscode.Webview` interface.
 * An instance of this class represents a single webview from the extension host's
 * perspective, proxying state changes to the Mountain host.
 */

import { Schemas } from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/network.js";
import type { IExtensionDescription } from "@codeeditorland/output/Target/Microsoft/VSCode/vs/platform/extensions/common/extensions.js";
import { Effect } from "effect";
import type { Event, Uri, Webview, WebviewOptions } from "vscode";

import type { IPC } from "../IPC.js";
import { ConvertContentOptionToDTO } from "../TypeConverter/Webview/ConvertContentOptionToDTO.js";
import { CreateEventStream } from "../Utility/EventStream.js";

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
		const UpdateEffect = this.IPCService.SendNotification(
			"$setWebviewHtml",
			[this.Handle, Value],
		);
		Effect.runFork(UpdateEffect);
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
		const UpdateEffect = this.IPCService.SendNotification(
			"$setWebviewOptions",
			[this.Handle, OptionsDTO],
		);
		Effect.runFork(UpdateEffect);
	}

	public get cspSource(): string {
		return "vscode-resource: vscode-webview-resource: https:";
	}

	public postMessage(Message: any): Promise<boolean> {
		if (this.IsDisposed) return Promise.resolve(false);
		const PostEffect = this.IPCService.SendRequest<boolean>(
			"$postMessageToWebview",
			[this.Handle, Message],
		).pipe(Effect.catchAll(() => Effect.succeed(false)));
		return Effect.runPromise(PostEffect);
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
			Effect.runFork(this.OnDidReceiveMessageEmitter.Fire(Message));
		}
	}

	public dispose(): void {
		if (!this.IsDisposed) {
			this.IsDisposed = true;
			this.OnDidReceiveMessageEmitter.Shutdown();
		}
	}
}
