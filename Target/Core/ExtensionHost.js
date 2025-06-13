import { Layer } from "effect";
import { IPC } from "../Service/IPC.js";
import { Log } from "../Service/Log.js";
import { APIFactory } from "./APIFactory.js";
import { Definition } from "./ExtensionHost/Definition.js";
import { Tag } from "./ExtensionHost/Service.js";
const Live = Layer.effect(Tag, Definition).pipe(
  Layer.provide(
    Layer.mergeAll(
      APIFactory.Live,
      Log.Live,
      IPC.Live
      // The InitData layer is special and will be provided at the top-level
      // when the application starts, so we don't provide a concrete Live
      // implementation for it here. It's an external dependency.
    )
  )
);
export {
  Live
};
//# sourceMappingURL=ExtensionHost.js.map
