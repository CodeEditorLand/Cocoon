import r from "./URI.js";

const e = (o) => ({ uri: r.ToAPI(o.uri), name: o.name, index: o.index });
var p = { fromDTO: e };
export { p as default };
