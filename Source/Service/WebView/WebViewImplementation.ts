/*
 * File: Cocoon/Source/Service/WebView/WebViewImplementation.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:32:18 UTC
 * Dependency: ../../TypeConverter/WebView.js, ../../Utility/CreateEventStream.js, ../IPC/Service.js, effect, vs/base/common/network.js, vs/platform/extensions/common/extensions.js, vscode
 * Export: implements
 */

/**
 * @module WebViewImplementation
 * @description The concrete implementation of the `vscode.Webview` interface. An
 * instance of this class represents a single webview from the extension host's
 * perspective, proxying state changes to the Mountain host.
 */

import { Effect } from "effect";
import { Schemas } from "vs/base/common/network.js";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type { Event, Uri, Webview, WebviewOptions } from "vscode";

import { WebView as WebViewConverter } from "../../TypeConverter/WebView.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import type IPCService from "../IPC/Service.js";

export default class implements Webview {
	// --- Private State ---
	private IsDisposed = false;
	private _html = "";
	private _options: WebviewOptions;

	// --- Event Emitters ---
	private readonly OnDidReceiveMessageEmitter = CreateEventStream<any>();
	public readonly onDidReceiveMessage: Event<any>;

	constructor(
		public readonly Handle: string, // A unique ID for this webview instance
		private readonly IPC: IPCService["Type"],
		private readonly Extension: IExtensionDescription,
		InitialOptions: WebviewOptions,
	) {
		this._options = InitialOptions;
		this.onDidReceiveMessage = this.OnDidReceiveMessageEmitter.event;
	}

	// --- Public API Properties ---

	public get html(): string {
		return this._html;
	}

	public set html(Value: string) {
		if (this.IsDisposed || this._html === Value) {
			return;
		}
		this._html = Value;
		// Send a fire-and-forget notification to the host to update the UI.
		const UpdateEffect = this.IPC.SendNotification("$setWebviewHtml", [
			this.Handle,
			Value,
		]);
		Effect.runFork(UpdateEffect);
	}

	public get options(): WebviewOptions {
		return this._options;
	}

	public set options(NewOptions: WebviewOptions) {
		if (this.IsDisposed) {
			return;
		}
		this._options = NewOptions;
		const OptionsDTO = WebViewConverter.ConvertContentOptionToDTO(
			this.Extension,
			NewOptions,
		);
		const UpdateEffect = this.IPC.SendNotification("$setWebviewOptions", [
			this.Handle,
			OptionsDTO,
		]);
		Effect.runFork(UpdateEffect);
	}

	public get cspSource(): string {
		// A simplified, common source. A real implementation might get this from the host.
		return "vscode-resource: vscode-webview-resource: https:";
	}

	// --- Public API Methods ---

	public postMessage(Message: any): Promise<boolean> {
		if (this.IsDisposed) {
			return Promise.resolve(false);
		}
		const PostEffect = this.IPC.SendRequest<boolean>(
			"$postMessageToWebview",
			[this.Handle, Message],
		).pipe(Effect.catchAll(() => Effect.succeed(false))); // Return false on any failure
		return Effect.runPromise(PostEffect);
	}

	public asWebviewUri(LocalResource: Uri): Uri {
		const Authority = this.Extension.identifier.value.toLowerCase();
		return LocalResource.with({
			scheme: Schemas["vscode-webview-resource"],
			authority: Authority,
		});
	}

	// --- Internal Methods (called by other services) ---

	/**
	 * Called by the WebViewPanel service when a message is received from the host
	 * for this specific webview instance.
	 */
	public fireDidReceiveMessage(Message: any): void {
		if (!this.IsDisposed) {
			Effect.runFork(this.OnDidReceiveMessageEmitter.Fire(Message));
		}
	}

	/**
	 * Marks this webview as disposed and cleans up its resources.
	 */
	public dispose(): void {
		if (!this.IsDisposed) {
			this.IsDisposed = true;
			this.OnDidReceiveMessageEmitter.Shutdown();
		}
	}
}
