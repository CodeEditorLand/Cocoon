import { Layer } from "effect";
import { Definition } from "./Command/Definition.js";
import { Tag } from "./Command/Service.js";
import { Live as LiveIPC } from "./IPC.js";
import { Live as LiveTelemetry } from "./Telemetry.js";
import { Live as LiveWorkSpace } from "./WorkSpace.js";
import { Tag as Tag2 } from "./Command/Service.js";
const Live = Layer.effect(Tag, Definition).pipe(
  Layer.provide(Layer.mergeAll(LiveIPC, LiveTelemetry, LiveWorkSpace))
);
export {
  Live,
  Tag2 as Tag
};
//# sourceMappingURL=Command.js.map
