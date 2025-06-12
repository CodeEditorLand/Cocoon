import { Layer } from "effect";
import { InitDataService } from "../../Service/InitData.js";
import { Live as LiveIpc } from "../../Service/Ipc/mod.js";
import { Live as LiveLog } from "../../Service/Log.js";
import { Live as LiveApiFactory } from "../ApiFactory/mod.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";
const Live = Layer.effect(Tag, Definition).pipe(
  Layer.provide(LiveApiFactory),
  Layer.provide(LiveLog),
  Layer.provide(LiveIpc),
  Layer.provide(Layer.succeed(InitDataService, {}))
  // Placeholder for real init data
);
export {
  Live
};
//# sourceMappingURL=mod.js.map
