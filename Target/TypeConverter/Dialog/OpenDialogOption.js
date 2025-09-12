var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { SerializeFilters } from "./Filter.js";
const ToDTO = /* @__PURE__ */ __name((Options) => {
  if (!Options) {
    return void 0;
  }
  return {
    ...Options,
    defaultUri: Options.defaultUri?.toJSON(),
    filters: SerializeFilters(Options.filters)
  };
}, "ToDTO");
export {
  ToDTO
};
//# sourceMappingURL=OpenDialogOption.js.map
