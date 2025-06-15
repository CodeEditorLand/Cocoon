var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
function ParseArgument_default(Arguments) {
  let Option = {};
  let Items = [];
  let Source = void 0;
  let CurrentIndex = 0;
  if (Arguments.length > CurrentIndex && typeof Arguments[CurrentIndex] === "object" && Arguments[CurrentIndex] !== null && !Arguments[CurrentIndex].title && !Arguments[CurrentIndex].id) {
    Option = Arguments[CurrentIndex++];
  }
  if (Arguments.length > CurrentIndex && typeof Arguments[CurrentIndex] === "object" && Arguments[CurrentIndex] !== null && typeof Arguments[CurrentIndex].id === "string") {
    Source = Arguments[CurrentIndex++];
  }
  Items = Arguments.slice(CurrentIndex).filter(
    (item) => typeof item === "string" || typeof item === "object" && item !== null && typeof item.title === "string"
  );
  return { Option, Items, Source };
}
__name(ParseArgument_default, "default");
export {
  ParseArgument_default as default
};
//# sourceMappingURL=ParseArgument.js.map
