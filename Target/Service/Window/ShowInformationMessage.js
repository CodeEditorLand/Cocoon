var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { Message } from "../Message/Service.js";
function ShowInformationMessage(message, ...itemsOrOptions) {
  return Effect.flatMap(
    Message.Tag,
    (service) => service.ShowInformationMessage(message, ...itemsOrOptions)
  );
}
__name(ShowInformationMessage, "ShowInformationMessage");
export {
  ShowInformationMessage
};
//# sourceMappingURL=ShowInformationMessage.js.map
