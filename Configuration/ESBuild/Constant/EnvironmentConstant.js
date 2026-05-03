const e =
		process.env.NODE_ENV === "development" ||
		process.env.TAURI_ENV_DEBUG === "true",
	o = process.env.Clean === "true",
	n = process.env.Bundle === "true",
	s = process.env.Compile === "true";
export { n as Bundle, o as Clean, s as Compile, e as On };
