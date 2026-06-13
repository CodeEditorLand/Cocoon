/**
 * @file Environment Variable Management
 * @description
 * Provides comprehensive environment variable management for Cocoon.
 * Reads, sets, validates, and manages environment variables with defensive
 * coding and security considerations for all supported platforms.
 *
 * **Responsibilities:**
 * - Read environment variables from process.env
 * - Set environment variables (where supported)
 * - Validate environment variable values
 * - Detect locale and language from environment
 * - Provide secure environment access with sanitization
 * - Cache frequently accessed environment variables
 *
 * **Element Connections:**
 * - **Air**: Rust workbench may need environment variables for compilation flags and paths
 * - **Wind**: Effect-TS services need environment-aware configuration and context
 * - **Mountain**: Environment data converts to Mountain DTOs for Tauri backend
 * - **Output**: References VSCode environment handling from Dependency/Microsoft/Dependency/Editor/src/vs/base/common/platform.ts
 *
 * **TODOs:**
 * FUTURE: .env file loading - use dotenv package or custom parser
 * FUTURE: Validation schemas - implement with zod for type-safe validation
 * FUTURE: Variable expansion - implement ${VAR} and ${VAR:-default} syntax
 * FUTURE: File monitoring - use fs.watch for .env file changes
 * DEPENDENCY: Mountain EnvironmentInfo DTO - pending Mountain backend
 * DEPENDENCY: Wind Effect-TS Environment service - integrate with Wind
 * SECURITY: Mask in logs - filter PASSWORD, TOKEN, SECRET, KEY values
 * SECURITY: Access control - implement per-variable permission system
 * PERFORMANCE: Use Map with LRU cache for frequently accessed vars
 * TESTING: Add jest unit tests for env parsing edge cases
 */

/**
 * Process environment interface
 */
export interface IProcessEnvironment {

	[key: string]: string | undefined;
}

/**
 * Environment variable validation result
 */
export interface EnvironmentValidationResult {

	isValid: boolean;

	value: string;

	error?: string;
}

/**
 * Environment variable validation rules
 */
export interface EnvironmentValidationRule {

	required?: boolean;

	type?: "string" | "number" | "boolean" | "path" | "url";

	pattern?: RegExp;

	min?: number;

	max?: number;

	allowedValues?: string[];

	sanitize?: (value: string) => string;
}

/**
 * Environment information structure
 */
export interface EnvironmentInfo {

	variables: Record<string, string>;

	language: string;

	locale: string;

	homeDirectory: string;

	tempDirectory: string;

	userDataDirectory: string;

	platformHome: string;
}

/**
 * Default environment variables
 */
export const DEFAULT_LANGUAGE = "en";

export const DEFAULT_LOCALE = "en-US";

/**
 * Cache for environment variables
 */
const EnvironmentCache = new Map<string, string>();

/**
 * Cache validity timestamp
 */
let CacheTimestamp = 0;

const CACHE_TTL = 60000; // 60 seconds

/**
 * Process environment reference
 */
declare const process: { env: IProcessEnvironment };

/**
 * Get the process environment
 */
function GetProcessEnvironment(): IProcessEnvironment {
	if (typeof process === "object" && typeof process.env === "object") {
		return process.env;
	}

	return {};
}

/**
 * Clear environment cache
 */
export function ClearCache(): void {
	EnvironmentCache.clear();

	CacheTimestamp = Date.now();
}

/**
 * Invalidate cache if expired
 */
function InvalidateCacheIfNeeded(): void {
	if (Date.now() - CacheTimestamp > CACHE_TTL) {
		ClearCache();
	}
}

/**
 * Get environment variable
 */
export function GetEnvironmentVariable(name: string): Option.Option<string> {
	if (!name || typeof name !== "string") {
		return Option.none();
	}

	InvalidateCacheIfNeeded();

	// Check cache first
	const cached = EnvironmentCache.get(name);

	if (cached !== undefined) {
		return Option.some(cached);
	}

	const env = GetProcessEnvironment();

	const value = env[name];

	if (value !== undefined) {
		EnvironmentCache.set(name, value);

		return Option.some(value);
	}

	return Option.none();
}

/**
 * Get environment variable with default
 */
export function GetEnvironmentVariableOr(
	name: string,

	defaultValue: string,
): string {
	return Option.getOrElse(GetEnvironmentVariable(name), () => defaultValue);
}

/**
 * Set environment variable (where supported)
 */
export function SetEnvironmentVariable(name: string, value: string): boolean {
	if (!name || typeof name !== "string") {
		return false;
	}

	if (value === undefined || value === null) {
		return false;
	}

	const env = GetProcessEnvironment(;

	(env as any)[name] = value;

	// Update cache
	EnvironmentCache.set(name, value;

	return true;
}

/**
 * Delete environment variable
 */
export function DeleteEnvironmentVariable(name: string): boolean {
	if (!name || typeof name !== "string") {
		return false;
	}

	const env = GetProcessEnvironment(;

	delete (env as any)[name];

	// Remove from cache
	EnvironmentCache.delete(name;

	return true;
}

/**
 * Get all environment variables
 */
export function GetAllEnvironmentVariables(): IProcessEnvironment {
	InvalidateCacheIfNeeded(;

	return GetProcessEnvironment(;
}

/**
 * Validate environment variable value
 */
export function ValidateEnvironmentVariable(
	name: string,

	value: string,

	rule: EnvironmentValidationRule,
): EnvironmentValidationResult {
	// Check required
	if (rule.required && (!value || value.trim() === "")) {
		return {
			isValid: false,

			value: "",

			error: `Environment variable ${name} is required but empty`,
		};
	}

	// Check type
	if (rule.type) {
		switch (rule.type) {
			case "number":
				if (isNaN(Number(value))) {
					return {
						isValid: false,

						value,

						error: `Environment variable ${name} must be a number`,
					};
				}

				break;

			case "boolean":
				if (
					!["true", "false", "1", "0", "yes", "no"].includes(
						value.toLowerCase(),
					)
				) {
					return {
						isValid: false,

						value,

						error: `Environment variable ${name} must be a boolean value`,
					};
				}

				break;

			case "path":
				if (
					!value ||
					value.trim() === "" ||
					!/^[a-zA-Z0-9_\-\.\s\\\/]+$/.test(value)
				) {
					return {
						isValid: false,

						value,

						error: `Environment variable ${name} must be a valid path`,
					};
				}

				break;

			case "url":
				try {
					new URL(value;
				} catch {
					return {
						isValid: false,

						value,

						error: `Environment variable ${name} must be a valid URL`,
					};
				}

				break;
		}
	}

	// Check pattern
	if (rule.pattern && !rule.pattern.test(value)) {
		return {
			isValid: false,

			value,

			error: `Environment variable ${name} does not match required pattern`,
		};
	}

	// Check min length
	if (rule.min && value.length < rule.min) {
		return {
			isValid: false,

			value,

			error: `Environment variable ${name} must be at least ${rule.min} characters`,
		};
	}

	// Check max length
	if (rule.max && value.length > rule.max) {
		return {
			isValid: false,

			value,

			error: `Environment variable ${name} must be at most ${rule.max} characters`,
		};
	}

	// Check allowed values
	if (rule.allowedValues && !rule.allowedValues.includes(value)) {
		return {
			isValid: false,

			value,

			error: `Environment variable ${name} must be one of: ${rule.allowedValues.join(", ")}`,
		};
	}

	// Sanitize value
	let sanitizedValue = value;

	if (rule.sanitize) {
		sanitizedValue = rule.sanitize(value;
	}

	return {
		isValid: true,

		value: sanitizedValue,
	};
}

/**
 * Get and validate environment variable
 */
export function GetValidatedEnvironmentVariable(
	name: string,

	rule: EnvironmentValidationRule,
): EnvironmentValidationResult {
	const valueOption = GetEnvironmentVariable(name;

	if (Option.isNone(valueOption)) {
		if (rule.required) {
			return {
				isValid: false,

				value: "",

				error: `Environment variable ${name} is required but not set`,
			};
		}

		return {
			isValid: true,

			value: "",
		};
	}

	return ValidateEnvironmentVariable(name, valueOption.value, rule;
}

/**
 * Get language from environment
 */
export function GetLanguage(): string {
	// Check VSCODE_NLS_CONFIG first (VSCode)
	const nlsConfig = GetEnvironmentVariable("VSCODE_NLS_CONFIG";

	if (Option.isSome(nlsConfig)) {
		try {
			const config = JSON.parse(nlsConfig.value;

			if (config.resolvedLanguage) {
				return config.resolvedLanguage;
			}

			if (config.language) {
				return config.language;
			}
		} catch {
			// Ignore parse errors
		}
	}

	// Check standard locale variables
	const lcAll = GetEnvironmentVariable("LC_ALL";

	if (Option.isSome(lcAll) && lcAll.value) {
		const parts = lcAll.value.split(".";

		if (parts.length > 0) {
			const locale = parts[0]!.replace("_", "-";

			return locale.split("-")[0] || DEFAULT_LANGUAGE;
		}
	}

	const lang = GetEnvironmentVariable("LANG";

	if (Option.isSome(lang) && lang.value) {
		const parts = lang.value.split(".";

		if (parts.length > 0) {
			const locale = parts[0]!.replace("_", "-";

			return locale.split("-")[0] || DEFAULT_LANGUAGE;
		}
	}

	const language = GetEnvironmentVariable("LANGUAGE";

	if (Option.isSome(language) && language.value) {
		const parts = language.value.split(":")[0];

		return parts.replace("_", "-").split("-")[0] || DEFAULT_LANGUAGE;
	}

	return DEFAULT_LANGUAGE;
}

/**
 * Get locale from environment
 */
export function GetLocale(): string {
	// Check VSCODE_NLS_CONFIG first (VSCode)
	const nlsConfig = GetEnvironmentVariable("VSCODE_NLS_CONFIG";

	if (Option.isSome(nlsConfig)) {
		try {
			const config = JSON.parse(nlsConfig.value;

			if (config.userLocale && typeof config.userLocale === "string") {
				return config.userLocale;
			}

			if (config.osLocale && typeof config.osLocale === "string") {
				return config.osLocale;
			}
		} catch {
			// Ignore parse errors
		}
	}

	// Check standard locale variables
	const lcAll = GetEnvironmentVariable("LC_ALL";

	if (Option.isSome(lcAll) && lcAll.value) {
		const parts = lcAll.value.split(".";

		if (parts && parts.length > 0) {
			return parts[0]!.replace("_", "-";
		}
	}

	const lang = GetEnvironmentVariable("LANG";

	if (Option.isSome(lang) && lang.value) {
		const parts = lang.value.split(".";

		if (parts && parts.length > 0) {
			return parts[0]!.replace("_", "-";
		}
	}

	return DEFAULT_LOCALE;
}

/**
 * Get home directory from environment
 */
export function GetHomeDirectory(): string {
	const env = GetProcessEnvironment(;

	// Unix/Linux/macOS
	if (env.HOME) {
		return env.HOME;
	}

	// Windows
	if (env.USERPROFILE) {
		return env.USERPROFILE;
	}

	// Alternative Windows variables
	if (env.HOMEPATH && env.HOMEDRIVE) {
		return env.HOMEDRIVE + env.HOMEPATH;
	}

	return "/tmp";
}

/**
 * Get temp directory from environment
 */
export function GetTempDirectory(): string {
	const env = GetProcessEnvironment(;

	// Windows
	if (env.TEMP) {
		return env.TEMP;
	}

	if (env.TMP) {
		return env.TMP;
	}

	// Unix/Linux/macOS
	if (env.TMPDIR) {
		return env.TMPDIR;
	}

	// Default temp directories
	const platform = GetPlatformType(;

	if (platform === "windows") {
		return "\	emp";
	}

	return "/tmp";
}

/**
 * Get user data directory
 */
export function GetUserDataDirectory(): string {
	// Check XDG_DATA_HOME (Unix/Linux)
	const xdgDataHome = GetEnvironmentVariable("XDG_DATA_HOME";

	if (Option.isSome(xdgDataHome) && xdgDataHome.value) {
		return xdgDataHome.value;
	}

	const home = GetHomeDirectory(;

	const platform = GetPlatformType(;

	// Platform-specific defaults
	switch (platform) {
		case "mac":
			return `${home}/Library/Application Support`;

		case "windows":
			const localAppData = GetEnvironmentVariable("LOCALAPPDATA";

			if (Option.isSome(localAppData) && localAppData.value) {
				return localAppData.value;
			}

			return `${home}/AppData/Local`;

		case "linux":
		default:
			return `${home}/.local/share`;
	}
}

/**
 * Get platform home directory
 */
export function GetPlatformHome(): string {
	const home = GetHomeDirectory(;

	const platform = GetPlatformType(;

	switch (platform) {
		case "mac":
			return `${home}/Library`;

		case "windows":
			return GetEnvironmentVariableOr(
				"APPDATA",

				`${home}/AppData/Roaming`,
			;

		case "linux":
		default:
			return home;
	}
}

/**
 * Detect platform type
 */
function GetPlatformType(): "windows" | "mac" | "linux" {
	const currentProcess = typeof process !== "undefined" ? process : undefined;

	const platform =
		currentProcess && "platform" in currentProcess
			? ((currentProcess as any).platform as string)
			: "";

	if (platform === "win32") {
		return "windows";
	}

	if (platform === "darwin") {
		return "mac";
	}

	return "linux";
}

/**
 * Get comprehensive environment information
 */
export function GetEnvironmentInfo(): EnvironmentInfo {
	const envVars = GetAllEnvironmentVariables(;

	const safeEnvVars: Record<string, string> = {};

	for (const [key, value] of Object.entries(envVars)) {
		if (value !== undefined) {
			safeEnvVars[key] = value;
		}
	}

	return {
		variables: safeEnvVars,

		language: GetLanguage(),

		locale: GetLocale(),

		homeDirectory: GetHomeDirectory(),

		tempDirectory: GetTempDirectory(),

		userDataDirectory: GetUserDataDirectory(),

		platformHome: GetPlatformHome(),
	};
}

/**
 * Check if running in development environment
 */
export function IsDevelopment(): boolean {
	const nodeEnv = GetEnvironmentVariable("NODE_ENV";

	if (Option.isNone(nodeEnv)) {
		return false;
	}

	return ["development", "dev", "test"].includes(nodeEnv.value.toLowerCase();
}

/**
 * Check if running in production environment
 */
export function IsProduction(): boolean {
	const nodeEnv = GetEnvironmentVariable("NODE_ENV";

	if (Option.isNone(nodeEnv)) {
		return true; // Default to production
	}

	return nodeEnv.value.toLowerCase() === "production";
}

/**
 * Check if running in CI environment
 */
export function IsCI(): boolean {
	const ciVariables = [
		"CI",

		"CONTINUOUS_INTEGRATION",

		"GITHUB_ACTIONS",

		"GITLAB_CI",

		"JENKINS_URL",

		"TRAVIS",

		"CIRCLECI",

		"APPVEYOR",

		"BUILD_NUMBER",

		"GITHUB_WORKSPACE",
	];

	for (const variable of ciVariables) {
		const value = GetEnvironmentVariable(variable;

		if (Option.isSome(value) && value.value) {
			return true;
		}
	}

	return false;
}

/**
 * Check if running in VSCode environment
 */
export function IsVSCode(): boolean {
	const codeEnv = GetEnvironmentVariable("VSCODE_PID";

	const vscodeEnv = GetEnvironmentVariable("VSCODE_CWD";

	return Option.isSome(codeEnv) || Option.isSome(vscodeEnv;
}

/**
 * Get VSCode installation path
 */
export function GetVSCodePath(): Option.Option<string> {
	return GetEnvironmentVariable("VSCODE_PATH";
}

/**
 * Sanitize environment variable name
 */
export function SanitizeName(name: string): string {
	return name.replace(/[^a-zA-Z0-9_]/g, "").toUpperCase(;
}

/**
 * Sanitize environment variable value
 */
export function SanitizeValue(value: string): string {
	// Remove control characters
	return value.replace(/[\x00-\x1F\x7F]/g, "").trim(;
}

/**
 * Effect-TS: Get environment variable as Effect
 */
export function GetEnvironmentVariableEffect(
	name: string,
): Promise<Option.Option<string>> {
	return GetEnvironmentVariable(name;
}

/**
 * Effect-TS: Get environment variable or default as Effect
 */
export function GetEnvironmentVariableOrEffect(
	name: string,

	defaultValue: string,
): Promise<string> {
	return GetEnvironmentVariableOr(name, defaultValue;
}

/**
 * Effect-TS: Set environment variable as Effect
 */
export function SetEnvironmentVariableEffect(
	name: string,

	value: string,
): Promise<void> {
	if (!name) {
		return throw (
			new Error("Environment variable name cannot be empty"),
		;
	}

	return {
		SetEnvironmentVariable(name, value;
	};
}

/**
 * Effect-TS: Get environment info as Effect
 */
export function GetEnvironmentInfoEffect(): Promise<EnvironmentInfo> {
	return GetEnvironmentInfo(;
}

/**
 * Export environment module
 */
export const Environment = {
	GetEnvironmentVariable,

	GetEnvironmentVariableOr,

	SetEnvironmentVariable,

	DeleteEnvironmentVariable,

	GetAllEnvironmentVariables,

	ValidateEnvironmentVariable,

	GetValidatedEnvironmentVariable,

	GetLanguage,

	GetLocale,

	GetHomeDirectory,

	GetTempDirectory,

	GetUserDataDirectory,

	GetPlatformHome,

	GetEnvironmentInfo,

	IsDevelopment,

	IsProduction,

	IsCI,

	IsVSCode,

	GetVSCodePath,

	SanitizeName,

	SanitizeValue,

	ClearCache,
};
