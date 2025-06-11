import { Layer } from "effect";
import { Live as LiveIpc } from "../Ipc/mod.js";
import { Live as LiveTelemetry } from "../Telemetry.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";
import { Tag as Tag2 } from "./Service.js";
const Live = Layer.effect(Tag, Definition).pipe(
  Layer.provide(Layer.merge(LiveIpc, LiveTelemetry))
);
export {
  Live,
  Tag2 as Tag
};
//# sourceMappingURL=mod.js.map
