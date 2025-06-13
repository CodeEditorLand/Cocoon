var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { ThemeColor } from "../../Type/ExtHostTypes.js";
import * as TypeConverter from "../../TypeConverter.js";
class StatusBarItemImplementation {
  constructor(entryID, IPCService, onDidDispose, initialID, initialAlignment, initialPriority) {
    this.entryID = entryID;
    this.IPCService = IPCService;
    this.onDidDispose = onDidDispose;
    this._id = initialID;
    this._alignment = initialAlignment;
    this._priority = initialPriority;
  }
  static {
    __name(this, "StatusBarItemImplementation");
  }
  _isDisposed = false;
  _visible = false;
  // --- Backing fields for properties ---
  _id;
  _name;
  _alignment;
  _priority;
  _text = "";
  _tooltip;
  _color;
  _backgroundColor;
  _command;
  _accessibilityInformation;
  // --- Getters and Setters that trigger IPC updates ---
  get id() {
    return this._id;
  }
  get alignment() {
    return this._alignment;
  }
  get priority() {
    return this._priority;
  }
  get name() {
    return this._name;
  }
  set name(value) {
    if (this._name !== value) {
      this._name = value;
      this.update();
    }
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
      if (value instanceof ThemeColor && value.id === "statusBarItem.errorForeground") {
        this.backgroundColor = new ThemeColor(
          "statusBarItem.errorBackground"
        );
      }
      this.update();
    }
  }
  get backgroundColor() {
    return this._backgroundColor;
  }
  set backgroundColor(value) {
    if (this._backgroundColor !== value) {
      this._backgroundColor = value;
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
        this.IPCService.SendNotification("$disposeEntry", [
          this.entryID
        ])
      );
    }
  }
  dispose() {
    if (!this._isDisposed) {
      this._isDisposed = true;
      this.hide();
      this.onDidDispose();
    }
  }
  // --- Private Methods ---
  update() {
    if (this._isDisposed || !this._visible) {
      return;
    }
    const commandConverter = new TypeConverter.Command.Definition(
      {},
      () => void 0
    );
    const DTO = TypeConverter.StatusBar.FromAPI(
      this,
      this.entryID,
      commandConverter
    );
    Effect.runFork(this.IPCService.SendNotification("$setEntry", [DTO]));
  }
}
export {
  StatusBarItemImplementation
};
//# sourceMappingURL=StatusBarItemImplementation.js.map
