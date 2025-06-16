import { URI as e } from "../../Type/ExtHostTypes.js";

const r = (o) => o.toJSON(),
	t = (o) => e.revive(o);
var p = { FromAPI: r, ToAPI: t };
export { p as default };
