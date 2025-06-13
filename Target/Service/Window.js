import { Layer } from "effect";
import { Live as LiveIPC } from "./IPC.js";
import { Definition } from "./Window/Definition.js";
import { Tag } from "./Window/Service.js";
import { Live as LiveWorkSpace } from "./WorkSpace.js";
import { ShowInformationMessage } from "./Window/ShowInformationMessage.js";
import { Tag as Tag2 } from "./Window/Service.js";
const Live = Layer.effect(Tag, Definition).pipe(
  Layer.provide(Layer.merge(LiveIPC, LiveWorkSpace))
);
export {
  Live,
  ShowInformationMessage,
  Tag2 as Tag
};
//# sourceMappingURL=Window.js.map
