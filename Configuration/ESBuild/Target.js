import { sep as s, posix as x } from "node:path";

import { default as f } from "./Config/BaseConfig.js";
import { default as m } from "./Config/CompileConfig.js";
import { default as a, default as l } from "./Config/TargetConfig.js";
import * as o from "./Constant/EnvironmentConstant.js";

export {
	f as BaseConfig,
	m as CompileConfig,
	o as Environment,
	a as TargetConfig,
	l as default,
	x as posix,
	s as sep,
};
