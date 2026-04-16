export const On =
	process.env["NODE_ENV"] === "development" ||
	process.env["TAURI_ENV_DEBUG"] === "true";

export const Clean = process.env["Clean"] === "true";

export const Bundle = process.env["Bundle"] === "true";

export const Compile = process.env["Compile"] === "true";
