const On =
	process.env["NODE_ENV"] === "development" ||
	process.env["TAURI_ENV_DEBUG"] === "true";
const Clean = process.env["Clean"] === "true";
const Bundle = process.env["Bundle"] === "true";
const Compile = process.env["Compile"] === "true";
export { Bundle, Clean, Compile, On };
//# sourceMappingURL=Constant.js.map
