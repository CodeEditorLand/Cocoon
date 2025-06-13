var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Layer } from "effect";
import { Tag } from "./Service.js";
function Live(AllowExit) {
  return Layer.succeed(
    Tag,
    Tag.of({
      NativeExit: process.exit.bind(process),
      // Safely access `process.crash` as it's an Electron-specific, optional method.
      NativeCrash: typeof process.crash === "function" ? process.crash.bind(process) : void 0,
      AllowExit
    })
  );
}
__name(Live, "Live");
export {
  Live
};
//# sourceMappingURL=Live.js.map
