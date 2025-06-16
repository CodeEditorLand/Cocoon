import { ViewColumn as r } from "vs/workbench/api/common/extHostTypes.js";

const t = -1,
	n = -2,
	u = (e) => {
		if (typeof e == "number")
			switch (e) {
				case r.Active:
					return t;
				case r.Beside:
					return n;
				default:
					if (e >= r.One) return e - 1;
			}
	};
var i = { FromAPI: u };
export { i as default };
