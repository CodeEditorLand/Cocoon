var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
const FromAPI = /* @__PURE__ */ __name((option) => {
  return {
    showCollapseAll: !!option.showCollapseAll,
    canSelectMany: !!option.canSelectMany,
    hasHandleDrag: !!option.dragAndDropController?.handleDrag,
    hasHandleDrop: !!option.dragAndDropController?.handleDrop
  };
}, "FromAPI");
export {
  FromAPI
};
//# sourceMappingURL=Option.js.map
