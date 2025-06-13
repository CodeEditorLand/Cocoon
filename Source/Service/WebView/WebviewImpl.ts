/**
 * @module WebViewImpl
 * @description The concrete implementation of the `vscode.WebView` interface. An
 * instance of this class represents a single webview from the extension host's
 * perspective, proxying state changes to the Mountain host.
 */

import { Effect, Stream } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type { Event, Uri, WebView, WebViewOption } from "vscode";

import * as TypeConverter from "../../TypeConverter.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import type { IPC } from "../IPC.js";

export class WebViewImpl implements WebView {
	// --- Private State ---
	private IsDisposed = false;
	private _Html = "";
	private _Option: WebViewOption;

	// --- Event Emitters ---
	private readonly OnDidReceiveMessageEvent = CreateEventStream<any>();
	public readonly onDidReceiveMessage: Event<any> =
		this.OnDidReceiveMessageEvent.Stream.pipe(Stream.toEvent);

	constructor(
		public readonly Handle: string, // A unique ID for this webview instance
		private readonly IPCService: IPC.Interface,
		private readonly Extension: IExtensionDescription,
		InitialOption: WebViewOption,
	) {
		this._Option = InitialOption;
	}

	// --- Public API Properties ---

	public get html(): string {
		return this._Html;
	}

	public set html(value: string) {
		if (this.IsDisposed || this._Html === value) {
			return;
		}
		this._Html = value;
		// Send a fire-and-forget notification to the host to update the UI.
		const updateEffect = this.IPCService.SendNotification(
			"$setWebViewHtml",
			[this.Handle, value],
		);
		Effect.runFork(updateEffect);
	}

	public get options(): WebViewOption {
		return this._Option;
	}

	public set options(newOption: WebViewOption) {
		if (this.IsDisposed) {
			return;
		}
		this._Option = newOption;
		const OptionDTO = TypeConverter.WebView.ConvertContentOptionToDTO(
			this.Extension,
			newOption,
		);
		const updateEffect = this.IPCService.SendNotification(
			"$setWebViewOption",
			[this.Handle, OptionDTO],
		);
		Effect.runFork(updateEffect);
	}

	public get cspSource(): string {
		// A simplified, common source. A real implementation might get this from the host.
		return "vscode-resource: vscode-webview-resource: https:";
	}

	// --- Public API Methods ---

	public postMessage(message: any): Promise<boolean> {
		if (this.IsDisposed) {
			return Promise.resolve(false);
		}
		const postEffect = this.IPCService.SendRequest<boolean>(
			"$postMessageToWebView",
			[this.Handle, message],
		).pipe(
			Effect.catchAll(() => Effect.succeed(false)), // Return false on any failure
		);
		return Effect.runPromise(postEffect);
	}

	public asWebViewUri(localResource: Uri): Uri {
		// This transforms a local file URI into a special URI that the host
		// can serve securely inside the webview.
		// This logic is typically local to the extension host.
		// Example: file:///path/to/image.png -> vscode-resource://file/path/to/image.png
		return localResource.with({
			scheme: `vscode-resource`,
			authority: localResource.scheme,
			path: localResource.path,
		});
	}

	// --- Internal Methods (called by other services) ---

	/**
	 * Called by the WebViewPanel service when a message is received from the host
	 * for this specific webview instance.
	 */
	public FireDidReceiveMessage(message: any): void {
		if (!this.IsDisposed) {
			this.OnDidReceiveMessageEvent.Fire(message);
		}
	}

	/**
	 * Marks this webview as disposed and cleans up its resources.
	 */
	public Dispose(): void {
		if (!this.IsDisposed) {
			this.IsDisposed = true;
			// You could close the event stream here if the implementation supports it.
		}
	}
}
