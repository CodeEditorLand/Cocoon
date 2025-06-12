import { Layer } from "effect";
import { Live as LiveIpc } from "../Ipc/mod.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";
import {
  ShowErrorMessage,
  ShowInformationMessage,
  ShowWarningMessage
} from "./ShowInformationMessage.js";
import { Tag as Tag2 } from "./Service.js";
const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveIpc));
export {
  Live,
  ShowErrorMessage,
  ShowInformationMessage,
  ShowWarningMessage,
  Tag2 as Tag
};
//# sourceMappingURL=mod.js.map
