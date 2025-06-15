var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { ThemeColor } from "../../Type/ExtHostTypes.js";
import { StatusBar as StatusBarConverter } from "../../TypeConverter.js";
import {
  Definition as CommandConverterDefinition
} from "../../TypeConverter/Command.js";
class StatusBarItemImplementation_default {
  constructor(EntryID, IPC, OnDidDispose, InitialID, InitialAlignment, InitialPriority) {
    this.EntryID = EntryID;
    this.IPC = IPC;
    this.OnDidDispose = OnDidDispose;
    this._id = InitialID;
    this._alignment = InitialAlignment;
    this._priority = InitialPriority;
  }
  static {
    __name(this, "default");
  }
  IsDisposed = false;
  IsVisible = false;
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
  set name(Value) {
    if (this._name !== Value) {
      this._name = Value;
      this.Update();
    }
  }
  get text() {
    return this._text;
  }
  set text(Value) {
    if (this._text !== Value) {
      this._text = Value;
      this.Update();
    }
  }
  get tooltip() {
    return this._tooltip;
  }
  set tooltip(Value) {
    if (this._tooltip !== Value) {
      this._tooltip = Value;
      this.Update();
    }
  }
  get color() {
    return this._color;
  }
  set color(Value) {
    if (this._color !== Value) {
      this._color = Value;
      if (Value instanceof ThemeColor && Value.id === "statusBarItem.errorForeground") {
        this.backgroundColor = new ThemeColor(
          "statusBarItem.errorBackground"
        );
      }
      this.Update();
    }
  }
  get backgroundColor() {
    return this._backgroundColor;
  }
  set backgroundColor(Value) {
    if (this._backgroundColor !== Value) {
      this._backgroundColor = Value;
      this.Update();
    }
  }
  get command() {
    return this._command;
  }
  set command(Value) {
    if (this._command !== Value) {
      this._command = Value;
      this.Update();
    }
  }
  get accessibilityInformation() {
    return this._accessibilityInformation;
  }
  set accessibilityInformation(Value) {
    if (this._accessibilityInformation !== Value) {
      this._accessibilityInformation = Value;
      this.Update();
    }
  }
  // --- Public Methods ---
  show() {
    if (!this.IsVisible) {
      this.IsVisible = true;
      this.Update();
    }
  }
  hide() {
    if (this.IsVisible) {
      this.IsVisible = false;
      Effect.runFork(
        this.IPC.SendNotification("$disposeEntry", [this.EntryID])
      );
    }
  }
  dispose() {
    if (!this.IsDisposed) {
      this.IsDisposed = true;
      this.hide();
      this.OnDidDispose();
    }
  }
  // --- Private Methods ---
  Update() {
    if (this.IsDisposed || !this.IsVisible) {
      return;
    }
    const CommandConverterInstance = new CommandConverterDefinition(
      {},
      () => void 0
    );
    const DTO = StatusBarConverter.FromAPI(
      this,
      this.EntryID,
      CommandConverterInstance
    );
    Effect.runFork(this.IPC.SendNotification("$setEntry", [DTO]));
  }
}
export {
  StatusBarItemImplementation_default as default
};
//# sourceMappingURL=StatusBarItemImplementation.js.map
