import { sep as r, posix as t } from "node:path";

import { default as p } from "./Config/Base/Config.js";
import { default as i } from "./Config/Compile/Config.js";
import { default as s } from "./Config/Target/Config.js";

export * from "./Constant/Environment/Constant.js";

export {
	p as BaseConfig,
	i as CompileConfig,
	s as TargetConfig,
	t as posix,
	r as sep,
};
