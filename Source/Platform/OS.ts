/**
 * @file OS Detection and Platform Information
 * @description
 * Provides comprehensive OS detection and platform-specific information for Cocoon.
 * Detects operating system (Windows, macOS, Linux) and provides platform-specific
 * utilities for path handling, environment detection, and OS-specific behavior.
 *
 * **Responsibilities:**
 * - OS detection and platform identification
 * - Platform-specific path handling (forward/backward slashes)
 * - OS-specific utility functions
 * - Platform constants and enums
 * - Locale and language detection
 *
 * **Element Connections:**
 * - **Air**: Rust workbench may call OS detection for cross-platform compilation
 * - **Wind**: Effect-TS services need platform-specific path and behavior resolution
 * - **Mountain**: Platform types convert to Mountain DTOs for Tauri backend communication
 * - **Output**: References VSCode platform code patterns from Dependency/Microsoft/Dependency/Editor/src/vs/base/common/platform.ts
 *
 * **TODOs:**
 * FUTURE: Windows path normalization - implement when Windows support is priority
 * FUTURE: Windows registry - use native Windows APIs for system info
 * FUTURE: macOS version detection - use os.release() for version parsing
 * FUTURE: Linux dist detection - parse /etc/os-release for distribution info
 * FUTURE: WSL detection - check /proc/sys/fs/binfmt_misc/WSLInterop
 * FUTURE: Container detection - check for docker/containerd cgroup markers
 * DEPENDENCY: Mountain OSInfo DTO - pending Mountain backend implementation
 * DEPENDENCY: Wind Effect-TS services - integrate with Wind services
 * PERFORMANCE: Use lazy initialization with cached Ref for OS detection
 * SECURITY: Check /sys/kernel/security for SELinux/AppArmor presence
 */

import { Effect, Option } from "effect";

/**
 * Platform enumeration matching VSCode patterns
 */
export enum PlatformNumber {
	Web = 0,

	Mac = 1,

	Linux = 2,

	Windows = 3,
}

/**
 * Platform type names
 */
export type PlatformName = "Web" | "Windows" | "Mac" | "Linux";

/**
 * Operating system enumeration
 */
export enum OperatingSystem {
	Windows = 1,

	Macintosh = 2,

	Linux = 3,
}

/**
 * OS architecture
 */
export enum OSArchitecture {
	X64 = "x64",

	ARM64 = "arm64",

	ARM = "arm",

	IA32 = "ia32",

	Unknown = "unknown",
}

/**
 * Path separator by platform
 */
export const PATH_SEPARATOR_WINDOWS = "\\";

export const PATH_SEPARATOR_UNIX = "/";

/**
 * Line ending by platform
 */
export const LINE_ENDING_WINDOWS = "\r\n";

export const LINE_ENDING_UNIX = "\n";

/**
 * Default language
 */
export const DEFAULT_LANGUAGE = "en";

/**
 * Default locale
 */
export const DEFAULT_LOCALE = "en-US";

/**
 * Process environment interface (simplified from VSCode)
 */
export interface IProcessEnvironment {
	[key: string]: string | undefined;
}

/**
 * Node process interface (simplified from VSCode)
 */
export interface INodeProcess {
	platform: string;

	arch: string;

	env: IProcessEnvironment;

	versions?: {
		node?: string;

		electron?: string;

		chrome?: string;
	};

	type?: string;

	cwd: () => string;
}

/**
 * OS information structure
 */
export interface OSInfo {
	platform: PlatformName;

	operatingSystem: OperatingSystem;

	architecture: OSArchitecture;

	pathSeparator: string;

	lineEnding: string;

	locale: string;

	language: string;

	isLittleEndian: boolean;

	isWeb: boolean;

	isElectron: boolean;

	isCI: boolean;

	userAgent?: string;
}

/**
 * OS detection state
 */
let _isWindows = false;

let _isMacintosh = false;

let _isLinux = false;

let _isWeb = false;

let _isElectron = false;

let _isCI = false;

let _isLittleEndian = false;

let _isLittleEndianComputed = false;

let _platformNumber = PlatformNumber.Web;

let _operatingSystem = OperatingSystem.Linux;

let _architecture = OSArchitecture.Unknown;

let _locale = DEFAULT_LOCALE;

let _language = DEFAULT_LANGUAGE;

let _userAgent: string | undefined = undefined;

/**
 * Initialize OS detection
 */
function InitializeDetection(): void {
	const nodeProcess: INodeProcess | undefined = GetNodeProcess();

	// Native environment detection
	if (typeof nodeProcess === "object") {
		_isWindows = nodeProcess.platform === "win32";

		_isMacintosh = nodeProcess.platform === "darwin";

		_isLinux = nodeProcess.platform === "linux";

		_isElectron = typeof nodeProcess?.versions?.electron === "string";

		_isCI = CheckCIEnvironment(nodeProcess.env);

		// Determine platform number
		if (_isMacintosh) {
			_platformNumber = PlatformNumber.Mac;
		} else if (_isWindows) {
			_platformNumber = PlatformNumber.Windows;
		} else if (_isLinux) {
			_platformNumber = PlatformNumber.Linux;
		}

		// Determine operating system
		_operatingSystem = _isMacintosh
			? OperatingSystem.Macintosh
			: _isWindows
				? OperatingSystem.Windows
				: OperatingSystem.Linux;

		// Detect architecture
		_architecture = DetectArchitecture(nodeProcess.arch);

		// Detect locale and language
		DetectLocaleAndLanguage(nodeProcess.env);
	}

	// Web environment detection
	else if (typeof navigator === "object") {
		_userAgent = navigator.userAgent;

		_isWindows = _userAgent.indexOf("Windows") >= 0;

		_isMacintosh = _userAgent.indexOf("Macintosh") >= 0;

		_isLinux = _userAgent.indexOf("Linux") >= 0;

		_isWeb = true;

		// Determine platform number
		if (_isMacintosh) {
			_platformNumber = PlatformNumber.Mac;
		} else if (_isWindows) {
			_platformNumber = PlatformNumber.Windows;
		} else if (_isLinux) {
			_platformNumber = PlatformNumber.Linux;
		}

		// Determine operating system
		_operatingSystem = _isMacintosh
			? OperatingSystem.Macintosh
			: _isWindows
				? OperatingSystem.Windows
				: OperatingSystem.Linux;

		_language =
			navigator.language.toLowerCase().split("-")[0] || DEFAULT_LANGUAGE;

		_locale = navigator.language || DEFAULT_LOCALE;

		_architecture = DetectWebArchitecture();
	} else {
		console.error("[OS] Unable to resolve platform");
	}
}

/**
 * Get node process
 */
function GetNodeProcess(): INodeProcess | undefined {
	const globalThisAny = globalThis as any;

	if (
		typeof globalThisAny.vscode !== "undefined" &&
		typeof globalThisAny.vscode.process !== "undefined"
	) {
		// Native environment (sandboxed)
		return globalThisAny.vscode.process;
	} else if (
		typeof process !== "undefined" &&
		typeof process?.versions?.node === "string"
	) {
		// Native environment (non-sandboxed)
		return process;
	}

	return undefined;
}

/**
 * Check CI environment
 */
function CheckCIEnvironment(env: IProcessEnvironment): boolean {
	return !!(
		env["CI"] ||
		env["BUILD_ARTIFACTSTAGINGDIRECTORY"] ||
		env["GITHUB_WORKSPACE"] ||
		env["GITLAB_CI"] ||
		env["JENKINS_URL"] ||
		env["TRAVIS"] ||
		env["CIRCLECI"]
	);
}

/**
 * Detect architecture from arch string
 */
function DetectArchitecture(arch: string): OSArchitecture {
	switch (arch.toLowerCase()) {
		case "x64":
		case "x86_64":
		case "amd64":
			return OSArchitecture.X64;

		case "arm64":
		case "aarch64":
			return OSArchitecture.ARM64;

		case "arm":
			return OSArchitecture.ARM;

		case "ia32":
		case "x86":
			return OSArchitecture.IA32;

		default:
			return OSArchitecture.Unknown;
	}
}

/**
 * Detect architecture from web navigator
 */
function DetectWebArchitecture(): OSArchitecture {
	// In Cocoon (Node.js) use process.arch directly - fastest, no API call.
	if (typeof process !== "undefined" && process.arch) {
		return DetectArchitecture(process.arch);
	}

	// Browser fallback: navigator.userAgentData is async-only; return
	// Unknown synchronously and let the caller deal with it.
	return OSArchitecture.Unknown;
}

/**
 * Detect locale and language from environment
 */
function DetectLocaleAndLanguage(env: IProcessEnvironment): void {
	// Check for VSCode NLS configuration
	const rawNlsConfig = env["VSCODE_NLS_CONFIG"];

	if (rawNlsConfig) {
		try {
			const nlsConfig = JSON.parse(rawNlsConfig);

			_locale = nlsConfig.userLocale || DEFAULT_LOCALE;

			_language =
				nlsConfig.resolvedLanguage ||
				nlsConfig.language ||
				DEFAULT_LANGUAGE;

			return;
		} catch (e) {
			// Fall through to other methods
		}
	}

	// Check locale environment variables (Unix/Linux/macOS)
	const locale =
		env["LC_ALL"] || env["LC_MESSAGES"] || env["LANG"] || env["LANGUAGE"];

	if (locale) {
		_locale = locale.split(".")[0]!.replace("_", "-") || DEFAULT_LOCALE;

		_language = _locale.split("-")[0] || DEFAULT_LANGUAGE;

		return;
	}

	// Default values
	_locale = DEFAULT_LOCALE;

	_language = DEFAULT_LANGUAGE;
}

/**
 * Detect if system is little endian
 */
function DetectLittleEndian(): boolean {
	if (_isLittleEndianComputed) {
		return _isLittleEndian;
	}

	_isLittleEndianComputed = true;

	const test = new Uint8Array(2);

	test[0] = 1;

	test[1] = 2;

	const view = new Uint16Array(test.buffer);

	_isLittleEndian = view[0] === (2 << 8) + 1;

	return _isLittleEndian;
}

/**
 * Initialize detection on module load
 */
InitializeDetection();

_isLittleEndian = DetectLittleEndian();

/**
 * Get platform number
 */
export function GetPlatformNumber(): PlatformNumber {
	return _platformNumber;
}

/**
 * Get platform name
 */
export function GetPlatformName(): PlatformName {
	switch (_platformNumber) {
		case PlatformNumber.Web:
			return "Web";

		case PlatformNumber.Mac:
			return "Mac";

		case PlatformNumber.Linux:
			return "Linux";

		case PlatformNumber.Windows:
			return "Windows";
	}
}

/**
 * Get operating system
 */
export function GetOperatingSystem(): OperatingSystem {
	return _operatingSystem;
}

/**
 * Get architecture
 */
export function GetArchitecture(): OSArchitecture {
	return _architecture;
}

/**
 * Check if running on Windows
 */
export function IsWindows(): boolean {
	return _isWindows;
}

/**
 * Check if running on macOS
 */
export function IsMacintosh(): boolean {
	return _isMacintosh;
}

/**
 * Check if running on Linux
 */
export function IsLinux(): boolean {
	return _isLinux;
}

/**
 * Check if running in web environment
 */
export function IsWeb(): boolean {
	return _isWeb;
}

/**
 * Check if running in Electron
 */
export function IsElectron(): boolean {
	return _isElectron;
}

/**
 * Check if running in CI environment
 */
export function IsCI(): boolean {
	return _isCI;
}

/**
 * Get path separator for current platform
 */
export function GetPathSeparator(): string {
	return _isWindows ? PATH_SEPARATOR_WINDOWS : PATH_SEPARATOR_UNIX;
}

/**
 * Get line ending for current platform
 */
export function GetLineEnding(): string {
	return _isWindows ? LINE_ENDING_WINDOWS : LINE_ENDING_UNIX;
}

/**
 * Normalize path separators to current platform
 */
export function NormalizePath(path: string | null | undefined): string {
	if (!path) {
		return "";
	}

	const separator = GetPathSeparator();

	if (_isWindows) {
		// Convert forward slashes to backslashes (Windows)
		return path.replace(/\//g, separator);
	} else {
		// Convert backslashes to forward slashes (Unix/macOS/Linux)
		return path.replace(/\\/g, separator);
	}
}

/**
 * Normalize path separators to forward slashes (for web/Unix)
 */
export function NormalizePathToUnix(path: string | null | undefined): string {
	if (!path) {
		return "";
	}

	return path.replace(/\\/g, "/");
}

/**
 * Normalize path separators to backslashes (for Windows)
 */
export function NormalizePathToWindows(
	path: string | null | undefined,
): string {
	if (!path) {
		return "";
	}

	return path.replace(/\//g, PATH_SEPARATOR_WINDOWS);
}

/**
 * Join path segments using platform separator
 */
export function JoinPath(...segments: (string | null | undefined)[]): string {
	const validSegments = segments.filter(
		(s) => s != null && s !== "",
	) as string[];

	if (validSegments.length === 0) {
		return "";
	}

	const separator = GetPathSeparator();

	let result = validSegments.join(separator === "/" ? "/" : "\\");

	// Remove duplicate separators
	result = result.replace(/\/+/g, separator === "/" ? "/" : "\\");

	result = result.replace(/\\+/g, "\\");

	return result;
}

/**
 * Get locale
 */
export function GetLocale(): string {
	return _locale;
}

/**
 * Get language
 */
export function GetLanguage(): string {
	return _language;
}

/**
 * Get user agent (web only)
 */
export function GetUserAgent(): string | undefined {
	return _userAgent;
}

/**
 * Check if system is little endian
 */
export function IsLittleEndian(): boolean {
	return _isLittleEndian;
}

/**
 * Get comprehensive OS information
 */
export function GetOSInfo(): OSInfo {
	return {
		platform: GetPlatformName(),

		operatingSystem: GetOperatingSystem(),

		architecture: GetArchitecture(),

		pathSeparator: GetPathSeparator(),

		lineEnding: GetLineEnding(),

		locale: GetLocale(),

		language: GetLanguage(),

		isLittleEndian: IsLittleEndian(),

		isWeb: IsWeb(),

		isElectron: IsElectron(),

		isCI: IsCI(),

		userAgent: GetUserAgent(),
	} as OSInfo;
}

/**
 * Convert platform number to string
 */
export function PlatformToString(platform: PlatformNumber): PlatformName {
	switch (platform) {
		case PlatformNumber.Web:
			return "Web";

		case PlatformNumber.Mac:
			return "Mac";

		case PlatformNumber.Linux:
			return "Linux";

		case PlatformNumber.Windows:
			return "Windows";

		default:
			return "Web";
	}
}

/**
 * Convert platform string to number
 */
export function StringToPlatform(
	platform: string,
): Option.Option<PlatformNumber> {
	const normalized = String(platform);

	switch (normalized) {
		case "Web":
			return Option.some(PlatformNumber.Web);

		case "Mac":
			return Option.some(PlatformNumber.Mac);

		case "Linux":
			return Option.some(PlatformNumber.Linux);

		case "Windows":
			return Option.some(PlatformNumber.Windows);

		default:
			return Option.none();
	}
}

/**
 * Check if language is default (English)
 */
export function IsDefaultLanguage(): boolean {
	return _language === DEFAULT_LANGUAGE;
}

/**
 * Check if language is English variant (en-*)
 */
export function IsEnglishVariant(): boolean {
	if (_language.length === 2) {
		return _language === "en";
	} else if (_language.length >= 3) {
		return (
			_language[0] === "e" && _language[1] === "n" && _language[2] === "-"
		);
	}

	return false;
}

/**
 * Effect-TS: Get OS information as Effect
 */
export function GetOSInfoEffect(): Effect.Effect<OSInfo> {
	return Effect.succeed(GetOSInfo());
}

/**
 * Effect-TS: Detect platform as Effect
 */
export function DetectPlatformEffect(): Effect.Effect<PlatformNumber> {
	return Effect.succeed(GetPlatformNumber());
}

/**
 * Effect-TS: Normalize path as Effect
 */
export function NormalizePathEffect(
	path: string,
): Effect.Effect<string, Error> {
	if (!path) {
		return Effect.fail(new Error("Path cannot be null or undefined"));
	}

	return Effect.succeed(NormalizePath(path));
}

/**
 * Effect-TS: Check if path is absolute for current platform
 */
export function IsAbsolutePath(path: string): boolean {
	if (!path) {
		return false;
	}

	if (_isWindows) {
		// Windows: drive letter (C:\) or UNC path (\\server\share)
		return /^[a-zA-Z]:\\/.test(path) || /^\\\\[^\\]/.test(path);
	} else {
		// Unix/macOS/Linux: starts with /
		return path.startsWith("/");
	}
}

/**
 * Export constants
 */
export const Platform = {
	Web: PlatformNumber.Web,

	Mac: PlatformNumber.Mac,

	Linux: PlatformNumber.Linux,

	Windows: PlatformNumber.Windows,
};

export const PlatformConstants = {
	DEFAULT_LANGUAGE,

	DEFAULT_LOCALE,

	PATH_SEPARATOR_WINDOWS,

	PATH_SEPARATOR_UNIX,

	LINE_ENDING_WINDOWS,

	LINE_ENDING_UNIX,
} as const;

/**
 * Export getters
 */
export const OS = {
	IsWindows,

	IsMacintosh,

	IsLinux,

	IsWeb,

	IsElectron,

	IsCI,

	GetPlatformNumber,

	GetPlatformName,

	GetOperatingSystem,

	GetArchitecture,

	GetPathSeparator,

	GetLineEnding,

	GetLocale,

	GetLanguage,

	GetUserAgent,

	IsLittleEndian,

	GetOSInfo,

	NormalizePath,

	NormalizePathToUnix,

	NormalizePathToWindows,

	JoinPath,

	IsAbsolutePath,

	IsDefaultLanguage,

	IsEnglishVariant,
} as const;
