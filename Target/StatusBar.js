var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { generateUuid } from "vs/base/common/uuid.js";
import {
  Disposable,
  StatusBarAlignment
} from "vscode";
import { FromAPI as StatusBarItemToDTO } from "./TypeConverter/StatusBar.js";
import { Command as CommandConverter } from "./TypeConverter/Command.js";
import { Command as CommandInterface, CommandService } from "./Command.js";
import { IPC, IPCService } from "./IPC.js";
class StatusBarItemImplementation {
  constructor(EntryId, ExtensionId, IPC2, Command, OnDidDispose, InitialId, InitialAlignment, InitialPriority) {
    this.EntryId = EntryId;
    this.ExtensionId = ExtensionId;
    this.IPC = IPC2;
    this.Command = Command;
    this.OnDidDispose = OnDidDispose;
    this._id = InitialId;
    this._alignment = InitialAlignment;
    this._priority = InitialPriority;
  }
  static {
    __name(this, "StatusBarItemImplementation");
  }
  IsDisposed = false;
  IsVisible = false;
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
  tooltip2;
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
        this.IPC.SendNotification("$statusBar:dispose", [this.EntryId])
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
  Update() {
    if (this.IsDisposed || !this.IsVisible) return;
    const TheCommandConverter = new CommandConverter(
      this.Command.registerCommand,
      this.Command.executeCommand,
      () => void 0
    );
    const DTO = StatusBarItemToDTO(
      this,
      this.EntryId,
      this.ExtensionId,
      TheCommandConverter
    );
    Effect.runFork(this.IPC.SendNotification("$statusBar:set", [DTO]));
  }
}
class StatusBarService extends Effect.Service()(
  "Service/StatusBar",
  {
    effect: Effect.gen(function* () {
      const IPC2 = yield* IPCService;
      const Command = yield* CommandService;
      const ActiveItemsRef = yield* Ref.make(
        /* @__PURE__ */ new Map()
      );
      return {
        CreateStatusBarItem: /* @__PURE__ */ __name((Extension, Id, Alignment, Priority) => Effect.sync(() => {
          const EntryId = generateUuid();
          const ItemId = Id ?? `${Extension.identifier.value}.${EntryId}`;
          const FinalAlignment = Alignment ?? StatusBarAlignment.Left;
          const OnDispose = /* @__PURE__ */ __name(() => Effect.runSync(
            Ref.update(
              ActiveItemsRef,
              (Map2) => (Map2.delete(EntryId), Map2)
            )
          ), "OnDispose");
          const Entry = new StatusBarItemImplementation(
            EntryId,
            Extension.identifier.value,
            IPC2,
            Command,
            OnDispose,
            ItemId,
            FinalAlignment,
            Priority
          );
          Effect.runSync(
            Ref.update(
              ActiveItemsRef,
              (Map2) => Map2.set(EntryId, Entry)
            )
          );
          return Entry;
        }), "CreateStatusBarItem"),
        SetStatusBarMessage: /* @__PURE__ */ __name((text, hideOrPromise) => {
          const HideId = `status.message.${generateUuid()}`;
          const ShowEffect = IPC2.SendNotification(
            "$setStatusBarMessage",
            [HideId, text]
          );
          const HideEffect = IPC2.SendNotification(
            "$disposeStatusBarMessage",
            [HideId]
          );
          Effect.runFork(ShowEffect);
          if (typeof hideOrPromise === "number") {
            setTimeout(
              () => Effect.runFork(HideEffect),
              hideOrPromise
            );
          } else if (hideOrPromise) {
            hideOrPromise.then(() => Effect.runFork(HideEffect));
          }
          return new Disposable(() => Effect.runFork(HideEffect));
        }, "SetStatusBarMessage")
      };
    })
  }
) {
  static {
    __name(this, "StatusBarService");
  }
}
export {
  StatusBarService
};
//# sourceMappingURL=StatusBar.js.map
