var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Stream } from "effect";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { WebviewImpl } from "../Webview/WebviewImpl.js";
class WebviewPanelImpl {
  // Also updated by events
  constructor(Handle, IpcService, Extension, OnDidDisposeCallback, InitialTitle, InitialOptions, InitialViewColumn) {
    this.Handle = Handle;
    this.IpcService = IpcService;
    this.Extension = Extension;
    this.OnDidDisposeCallback = OnDidDisposeCallback;
    this.viewType = "unimplemented";
    this.webview = new WebviewImpl(
      Handle,
      IpcService,
      Extension,
      InitialOptions
    );
    this._title = InitialTitle;
    this.viewColumn = InitialViewColumn;
    this.active = true;
    this.visible = true;
  }
  static {
    __name(this, "WebviewPanelImpl");
  }
  _isDisposed = false;
  _title;
  _iconPath;
  // --- Events ---
  OnDidDisposeEvent = CreateEventStream();
  onDidDispose = this.OnDidDisposeEvent.Stream.pipe(Stream.toEvent);
  OnDidChangeViewStateEvent = CreateEventStream();
  onDidChangeViewState = this.OnDidChangeViewStateEvent.Stream.pipe(Stream.toEvent);
  webview;
  viewType;
  viewColumn;
  // This would be updated by events from the host
  active;
  // Also updated by events
  visible;
  // --- Properties with RPC side-effects ---
  get title() {
    return this._title;
  }
  set title(value) {
    if (this._title !== value) {
      this._title = value;
      Effect.runFork(
        this.IpcService.SendNotification("$setWebviewTitle", [
          this.Handle,
          value
        ])
      );
    }
  }
  get iconPath() {
    return this._iconPath;
  }
  set iconPath(value) {
    if (this._iconPath !== value) {
      this._iconPath = value;
      Effect.runFork(
        this.IpcService.SendNotification("$setWebviewIconPath", [
          this.Handle,
          value
        ])
      );
    }
  }
  // --- Public Methods ---
  reveal(viewColumn, preserveFocus) {
  }
  dispose() {
    if (this._isDisposed) return;
    this._isDisposed = true;
    this.OnDidDisposeEvent.Fire();
    this.OnDidDisposeCallback();
    this.webview.Dispose();
    Effect.runFork(
      this.IpcService.SendNotification("$disposeWebview", [this.Handle])
    );
  }
}
export {
  WebviewPanelImpl
};
//# sourceMappingURL=WebviewPanelImpl.js.map
