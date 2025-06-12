var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
const ParseArguments = /* @__PURE__ */ __name((Args) => {
  let Options = {};
  let Items = [];
  let Source = void 0;
  let CurrentIndex = 0;
  if (Args.length > CurrentIndex && typeof Args[CurrentIndex] === "object" && Args[CurrentIndex] !== null && !Args[CurrentIndex].title && !Args[CurrentIndex].id) {
    Options = Args[CurrentIndex++];
  }
  if (Args.length > CurrentIndex && typeof Args[CurrentIndex] === "object" && Args[CurrentIndex] !== null && typeof Args[CurrentIndex].id === "string") {
    Source = Args[CurrentIndex++];
  }
  Items = Args.slice(CurrentIndex).filter(
    (item) => typeof item === "string" || typeof item === "object" && item !== null && typeof item.title === "string"
  );
  return { Options, Items, Source };
}, "ParseArguments");
export {
  ParseArguments
};
//# sourceMappingURL=ParseArgument.js.map
