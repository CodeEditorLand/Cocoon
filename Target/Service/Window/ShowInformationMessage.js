var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import MessageService from "../Message/Service.js";
const ShowInformationMessage = /* @__PURE__ */ __name((Message, ...ItemsOrOptions) => Effect.flatMap(
  MessageService,
  (Service) => Service.ShowInformationMessage(Message, ...ItemsOrOptions)
), "ShowInformationMessage");
var ShowInformationMessage_default = ShowInformationMessage;
export {
  ShowInformationMessage_default as default
};
//# sourceMappingURL=ShowInformationMessage.js.map
