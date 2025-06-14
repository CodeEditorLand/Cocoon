/**
 * @module WebViewImplementation
 * @description The concrete implementation of the `vscode.Webview` interface. An
 * instance of this class represents a single webview from the extension host's
 * perspective, proxying state changes to the Mountain host.
 */

import { Effect, Stream } from "effect";
import { Schemas } from "vs/base/common/network.js";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type { Event, Uri, Webview, WebviewOptions } from "vscode";

import * as TypeConverter from "../../TypeConverter/WebView.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import type IPCService from "../IPC/Service.js";

export default class implements Webview {
	// --- Private State ---
	private _isDisposed = false;
	private _html = "";
	private _options: WebviewOptions;

	// --- Event Emitters ---
	private readonly onDidReceiveMessageEmitter = CreateEventStream<any>();
	public readonly onDidReceiveMessage: Event<any>;

	constructor(
		public readonly handle: string, // A unique ID for this webview instance
		private readonly ipc: IPCService,
		private readonly extension: IExtensionDescription,
		initialOptions: WebviewOptions,
	) {
		this._options = initialOptions;
		this.onDidReceiveMessage = Stream.toEvent(
			this.onDidReceiveMessageEmitter.Stream,
		);
	}

	// --- Public API Properties ---

	public get html(): string {
		return this._html;
	}

	public set html(value: string) {
		if (this._isDisposed || this._html === value) {
			return;
		}
		this._html = value;
		// Send a fire-and-forget notification to the host to update the UI.
		const updateEffect = this.ipc.SendNotification("$setWebviewHtml", [
			this.handle,
			value,
		]);
		Effect.runFork(updateEffect);
	}

	public get options(): WebviewOptions {
		return this._options;
	}

	public set options(newOptions: WebviewOptions) {
		if (this._isDisposed) {
			return;
		}
		this._options = newOptions;
		const OptionsDTO = TypeConverter.ConvertContentOptionToDTO(
			this.extension,
			newOptions,
		);
		const updateEffect = this.ipc.SendNotification("$setWebviewOptions", [
			this.handle,
			OptionsDTO,
		]);
		Effect.runFork(updateEffect);
	}

	public get cspSource(): string {
		// A simplified, common source. A real implementation might get this from the host.
		return "vscode-resource: vscode-webview-resource: https:";
	}

	// --- Public API Methods ---

	public postMessage(message: any): Promise<boolean> {
		if (this._isDisposed) {
			return Promise.resolve(false);
		}
		const postEffect = this.ipc
			.SendRequest<boolean>("$postMessageToWebview", [
				this.handle,
				message,
			])
			.pipe(
				Effect.catchAll(() => Effect.succeed(false)), // Return false on any failure
			);
		return Effect.runPromise(postEffect);
	}

	public asWebviewUri(localResource: Uri): Uri {
		const authority = this.extension.identifier.value.toLowerCase();
		return localResource.with({
			scheme: Schemas.vscodeWebviewResource,
			authority: authority,
		});
	}

	// --- Internal Methods (called by other services) ---

	/**
	 * Called by the WebViewPanel service when a message is received from the host
	 * for this specific webview instance.
	 */
	public fireDidReceiveMessage(message: any): void {
		if (!this._isDisposed) {
			this.onDidReceiveMessageEmitter.Fire(message);
		}
	}

	/**
	 * Marks this webview as disposed and cleans up its resources.
	 */
	public dispose(): void {
		if (!this._isDisposed) {
			this._isDisposed = true;
			this.onDidReceiveMessageEmitter.Shutdown();
		}
	}
}
