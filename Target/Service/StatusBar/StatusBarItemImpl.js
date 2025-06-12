var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import * as TypeConverter from "../../TypeConverter/mod.js";
class StatusBarItemImpl {
  // ... other properties
  constructor(EntryId, IpcService, OnDidDispose, InitialId, InitialAlignment, InitialPriority) {
    this.EntryId = EntryId;
    this.IpcService = IpcService;
    this.OnDidDispose = OnDidDispose;
    this._id = InitialId;
    this._alignment = InitialAlignment;
    this._priority = InitialPriority;
  }
  static {
    __name(this, "StatusBarItemImpl");
  }
  _isDisposed = false;
  _visible = false;
  _id;
  // --- Backing fields for properties ---
  _alignment;
  _priority;
  _text = "";
  _tooltip;
  _color;
  _command;
  _accessibilityInformation;
  // --- Getters and Setters ---
  get id() {
    return this._id;
  }
  get alignment() {
    return this._alignment;
  }
  get priority() {
    return this._priority;
  }
  get text() {
    return this._text;
  }
  set text(value) {
    if (this._text !== value) {
      this._text = value;
      this.update();
    }
  }
  get tooltip() {
    return this._tooltip;
  }
  set tooltip(value) {
    if (this._tooltip !== value) {
      this._tooltip = value;
      this.update();
    }
  }
  get color() {
    return this._color;
  }
  set color(value) {
    if (this._color !== value) {
      this._color = value;
      this.update();
    }
  }
  get command() {
    return this._command;
  }
  set command(value) {
    if (this._command !== value) {
      this._command = value;
      this.update();
    }
  }
  get accessibilityInformation() {
    return this._accessibilityInformation;
  }
  set accessibilityInformation(value) {
    if (this._accessibilityInformation !== value) {
      this._accessibilityInformation = value;
      this.update();
    }
  }
  // ... other getters/setters
  // --- Public Methods ---
  show() {
    if (!this._visible) {
      this._visible = true;
      this.update();
    }
  }
  hide() {
    if (this._visible) {
      this._visible = false;
      Effect.runFork(
        this.IpcService.SendNotification("$disposeEntry", [
          this.EntryId
        ])
      );
    }
  }
  dispose() {
    if (!this._disposed) {
      this.hide();
      this._disposed = true;
      this.OnDidDispose();
    }
  }
  // --- Private Methods ---
  update() {
    if (this._disposed || !this._visible) {
      return;
    }
    const Dto = TypeConverter.StatusBar.fromApi(this, this.EntryId);
    Effect.runFork(this.IpcService.SendNotification("$setEntry", [Dto]));
  }
}
export {
  StatusBarItemImpl
};
//# sourceMappingURL=StatusBarItemImpl.js.map
