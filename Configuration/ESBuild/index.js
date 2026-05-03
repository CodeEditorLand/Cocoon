import { sep as r, posix as t } from "node:path";

import { default as p } from "./Config/BaseConfig.js";
import { default as i } from "./Config/CompileConfig.js";
import { default as s } from "./Config/TargetConfig.js";

export * from "./Constant/EnvironmentConstant.js";
export {
	p as BaseConfig,
	i as CompileConfig,
	s as TargetConfig,
	t as posix,
	r as sep,
};
