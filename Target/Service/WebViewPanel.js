import { Layer } from "effect";
import { Live as LiveIPC } from "./IPC.js";
import { Live as LiveLog } from "./Log.js";
import { Definition } from "./WebViewPanel/Definition.js";
import { Tag } from "./WebViewPanel/Service.js";
import { Tag as Tag2 } from "./WebViewPanel/Service.js";
const Live = Layer.effect(Tag, Definition).pipe(
  Layer.provide(Layer.merge(LiveIPC, LiveLog))
);
export {
  Live,
  Tag2 as Tag
};
//# sourceMappingURL=WebViewPanel.js.map
