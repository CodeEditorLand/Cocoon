var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/TypeConverter/Quick/Input.ts
var SerializeItems = /* @__PURE__ */ __name((Items) => {
  return Items.map((Item, Index) => {
    const Base = typeof Item === "string" ? { label: Item } : Item;
    return { ...Base, handle: Index };
  });
}, "SerializeItems");
var SerializeButtons = /* @__PURE__ */ __name((Buttons) => {
  return Buttons?.map((Button, Index) => {
    const iconPath = Button.iconPath;
    return {
      iconPath: iconPath ? "dark" in iconPath && "light" in iconPath ? {
        dark: iconPath.dark.toJSON(),
        light: iconPath.light.toJSON()
      } : iconPath.toJSON() : void 0,
      tooltip: Button.tooltip,
      handle: Index
    };
  });
}, "SerializeButtons");

// Source/Services/Window/Quick/Input.ts
import { Effect } from "effect";
var ShowQuickPick = /* @__PURE__ */ __name((MountainClient, Logger, Items, Options) => Effect.gen(function* () {
  yield* Logger.Debug(
    `[WindowService] Showing quick pick with ${Items.length} items`
  );
  const ItemsDTO = SerializeItems(Items);
  const ButtonsDTO = Options?.buttons ? SerializeButtons(Options.buttons) : void 0;
  const RequestPayload = {
    items: ItemsDTO,
    options: Options ? {
      placeHolder: Options.placeHolder,
      matchOnDescription: Options.matchOnDescription,
      matchOnDetail: Options.matchOnDetail,
      ignoreFocusLost: Options.ignoreFocusLost,
      canPickMany: Options.canPickMany
    } : void 0,
    buttons: ButtonsDTO
  };
  const SelectedItems = yield* Effect.tryPromise({
    try: /* @__PURE__ */ __name(async () => {
      const Response = await MountainClient.sendRequest(
        "UserInterface.ShowQuickPick",
        [RequestPayload.items, RequestPayload.options]
      );
      if (Response === null || Response === void 0) {
        return void 0;
      }
      return Response;
    }, "try"),
    catch: /* @__PURE__ */ __name((Error_) => {
      throw new Error(
        `Failed to show quick pick: ${Error_.message}`
      );
    }, "catch")
  });
  if (!SelectedItems || SelectedItems.length === 0) {
    return void 0;
  }
  const SelectedValue = SelectedItems[0];
  if (typeof Items[0] === "string") {
    return SelectedValue;
  }
  return Items.find(
    (Item) => Item.label === SelectedValue
  );
}), "ShowQuickPick");
var ShowInputBox = /* @__PURE__ */ __name((MountainClient, Logger, Options) => Effect.gen(function* () {
  yield* Logger.Debug(
    `[WindowService] Showing input box${Options ? ` with placeholder: ${Options.placeholder}` : ""}`
  );
  const RequestPayload = Options ? {
    title: Options.title,
    value: Options.value,
    valueSelection: Options.valueSelection,
    prompt: Options.prompt,
    placeHolder: Options.placeHolder,
    password: Options.password,
    ignoreFocusLost: Options.ignoreFocusLost,
    validateInput: Options.validateInput ? Options.validateInput.toString() : void 0
  } : void 0;
  const Result = yield* Effect.tryPromise({
    try: /* @__PURE__ */ __name(async () => {
      const Response = await MountainClient.sendRequest(
        "UserInterface.ShowInputBox",
        [RequestPayload]
      );
      if (Response === null || Response === void 0) {
        return void 0;
      }
      return Response;
    }, "try"),
    catch: /* @__PURE__ */ __name((Error_) => {
      throw new Error(
        `Failed to show input box: ${Error_.message}`
      );
    }, "catch")
  });
  return Result;
}), "ShowInputBox");
export {
  ShowInputBox,
  ShowQuickPick
};
//# sourceMappingURL=Input.js.map
