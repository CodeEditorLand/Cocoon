var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// Source/Platform/OS.ts
var OS_exports = {};
__export(OS_exports, {
  DEFAULT_LANGUAGE: () => DEFAULT_LANGUAGE,
  DEFAULT_LOCALE: () => DEFAULT_LOCALE,
  DetectPlatformEffect: () => DetectPlatformEffect,
  GetArchitecture: () => GetArchitecture,
  GetLanguage: () => GetLanguage,
  GetLineEnding: () => GetLineEnding,
  GetLocale: () => GetLocale,
  GetOSInfo: () => GetOSInfo,
  GetOSInfoEffect: () => GetOSInfoEffect,
  GetOperatingSystem: () => GetOperatingSystem,
  GetPathSeparator: () => GetPathSeparator,
  GetPlatformName: () => GetPlatformName,
  GetPlatformNumber: () => GetPlatformNumber,
  GetUserAgent: () => GetUserAgent,
  IsAbsolutePath: () => IsAbsolutePath,
  IsCI: () => IsCI,
  IsDefaultLanguage: () => IsDefaultLanguage,
  IsElectron: () => IsElectron,
  IsEnglishVariant: () => IsEnglishVariant,
  IsLinux: () => IsLinux,
  IsLittleEndian: () => IsLittleEndian,
  IsMacintosh: () => IsMacintosh,
  IsWeb: () => IsWeb,
  IsWindows: () => IsWindows,
  JoinPath: () => JoinPath,
  LINE_ENDING_UNIX: () => LINE_ENDING_UNIX,
  LINE_ENDING_WINDOWS: () => LINE_ENDING_WINDOWS,
  NormalizePath: () => NormalizePath,
  NormalizePathEffect: () => NormalizePathEffect,
  NormalizePathToUnix: () => NormalizePathToUnix,
  NormalizePathToWindows: () => NormalizePathToWindows,
  OS: () => OS,
  OSArchitecture: () => OSArchitecture,
  OperatingSystem: () => OperatingSystem,
  PATH_SEPARATOR_UNIX: () => PATH_SEPARATOR_UNIX,
  PATH_SEPARATOR_WINDOWS: () => PATH_SEPARATOR_WINDOWS,
  Platform: () => Platform,
  PlatformConstants: () => PlatformConstants,
  PlatformNumber: () => PlatformNumber,
  PlatformToString: () => PlatformToString,
  StringToPlatform: () => StringToPlatform
});
import { Effect, Option } from "effect";
var PlatformNumber = /* @__PURE__ */ ((PlatformNumber2) => {
  PlatformNumber2[PlatformNumber2["Web"] = 0] = "Web";
  PlatformNumber2[PlatformNumber2["Mac"] = 1] = "Mac";
  PlatformNumber2[PlatformNumber2["Linux"] = 2] = "Linux";
  PlatformNumber2[PlatformNumber2["Windows"] = 3] = "Windows";
  return PlatformNumber2;
})(PlatformNumber || {});
var OperatingSystem = /* @__PURE__ */ ((OperatingSystem2) => {
  OperatingSystem2[OperatingSystem2["Windows"] = 1] = "Windows";
  OperatingSystem2[OperatingSystem2["Macintosh"] = 2] = "Macintosh";
  OperatingSystem2[OperatingSystem2["Linux"] = 3] = "Linux";
  return OperatingSystem2;
})(OperatingSystem || {});
var OSArchitecture = /* @__PURE__ */ ((OSArchitecture2) => {
  OSArchitecture2["X64"] = "x64";
  OSArchitecture2["ARM64"] = "arm64";
  OSArchitecture2["ARM"] = "arm";
  OSArchitecture2["IA32"] = "ia32";
  OSArchitecture2["Unknown"] = "unknown";
  return OSArchitecture2;
})(OSArchitecture || {});
var PATH_SEPARATOR_WINDOWS = "\\";
var PATH_SEPARATOR_UNIX = "/";
var LINE_ENDING_WINDOWS = "\r\n";
var LINE_ENDING_UNIX = "\n";
var DEFAULT_LANGUAGE = "en";
var DEFAULT_LOCALE = "en-US";
var _isWindows = false;
var _isMacintosh = false;
var _isLinux = false;
var _isWeb = false;
var _isElectron = false;
var _isCI = false;
var _isLittleEndian = false;
var _isLittleEndianComputed = false;
var _platformNumber = 0 /* Web */;
var _operatingSystem = 3 /* Linux */;
var _architecture = "unknown" /* Unknown */;
var _locale = DEFAULT_LOCALE;
var _language = DEFAULT_LANGUAGE;
var _userAgent = void 0;
function InitializeDetection() {
  const nodeProcess = GetNodeProcess();
  if (typeof nodeProcess === "object") {
    _isWindows = nodeProcess.platform === "win32";
    _isMacintosh = nodeProcess.platform === "darwin";
    _isLinux = nodeProcess.platform === "linux";
    _isElectron = typeof nodeProcess?.versions?.electron === "string";
    _isCI = CheckCIEnvironment(nodeProcess.env);
    if (_isMacintosh) {
      _platformNumber = 1 /* Mac */;
    } else if (_isWindows) {
      _platformNumber = 3 /* Windows */;
    } else if (_isLinux) {
      _platformNumber = 2 /* Linux */;
    }
    _operatingSystem = _isMacintosh ? 2 /* Macintosh */ : _isWindows ? 1 /* Windows */ : 3 /* Linux */;
    _architecture = DetectArchitecture(nodeProcess.arch);
    DetectLocaleAndLanguage(nodeProcess.env);
  } else if (typeof navigator === "object") {
    _userAgent = navigator.userAgent;
    _isWindows = _userAgent.indexOf("Windows") >= 0;
    _isMacintosh = _userAgent.indexOf("Macintosh") >= 0;
    _isLinux = _userAgent.indexOf("Linux") >= 0;
    _isWeb = true;
    if (_isMacintosh) {
      _platformNumber = 1 /* Mac */;
    } else if (_isWindows) {
      _platformNumber = 3 /* Windows */;
    } else if (_isLinux) {
      _platformNumber = 2 /* Linux */;
    }
    _operatingSystem = _isMacintosh ? 2 /* Macintosh */ : _isWindows ? 1 /* Windows */ : 3 /* Linux */;
    _language = navigator.language.toLowerCase().split("-")[0] || DEFAULT_LANGUAGE;
    _locale = navigator.language || DEFAULT_LOCALE;
    _architecture = DetectWebArchitecture();
  } else {
    console.error("[OS] Unable to resolve platform");
  }
}
__name(InitializeDetection, "InitializeDetection");
function GetNodeProcess() {
  const globalThisAny = globalThis;
  if (typeof globalThisAny.vscode !== "undefined" && typeof globalThisAny.vscode.process !== "undefined") {
    return globalThisAny.vscode.process;
  } else if (typeof process !== "undefined" && typeof process?.versions?.node === "string") {
    return process;
  }
  return void 0;
}
__name(GetNodeProcess, "GetNodeProcess");
function CheckCIEnvironment(env) {
  return !!(env["CI"] || env["BUILD_ARTIFACTSTAGINGDIRECTORY"] || env["GITHUB_WORKSPACE"] || env["GITLAB_CI"] || env["JENKINS_URL"] || env["TRAVIS"] || env["CIRCLECI"]);
}
__name(CheckCIEnvironment, "CheckCIEnvironment");
function DetectArchitecture(arch) {
  switch (arch.toLowerCase()) {
    case "x64":
    case "x86_64":
    case "amd64":
      return "x64" /* X64 */;
    case "arm64":
    case "aarch64":
      return "arm64" /* ARM64 */;
    case "arm":
      return "arm" /* ARM */;
    case "ia32":
    case "x86":
      return "ia32" /* IA32 */;
    default:
      return "unknown" /* Unknown */;
  }
}
__name(DetectArchitecture, "DetectArchitecture");
function DetectWebArchitecture() {
  if (typeof process !== "undefined" && process.arch) {
    return DetectArchitecture(process.arch);
  }
  return "unknown" /* Unknown */;
}
__name(DetectWebArchitecture, "DetectWebArchitecture");
function DetectLocaleAndLanguage(env) {
  const rawNlsConfig = env["VSCODE_NLS_CONFIG"];
  if (rawNlsConfig) {
    try {
      const nlsConfig = JSON.parse(rawNlsConfig);
      _locale = nlsConfig.userLocale || DEFAULT_LOCALE;
      _language = nlsConfig.resolvedLanguage || nlsConfig.language || DEFAULT_LANGUAGE;
      return;
    } catch (e) {
    }
  }
  const locale = env["LC_ALL"] || env["LC_MESSAGES"] || env["LANG"] || env["LANGUAGE"];
  if (locale) {
    _locale = locale.split(".")[0].replace("_", "-") || DEFAULT_LOCALE;
    _language = _locale.split("-")[0] || DEFAULT_LANGUAGE;
    return;
  }
  _locale = DEFAULT_LOCALE;
  _language = DEFAULT_LANGUAGE;
}
__name(DetectLocaleAndLanguage, "DetectLocaleAndLanguage");
function DetectLittleEndian() {
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
__name(DetectLittleEndian, "DetectLittleEndian");
InitializeDetection();
_isLittleEndian = DetectLittleEndian();
function GetPlatformNumber() {
  return _platformNumber;
}
__name(GetPlatformNumber, "GetPlatformNumber");
function GetPlatformName() {
  switch (_platformNumber) {
    case 0 /* Web */:
      return "Web";
    case 1 /* Mac */:
      return "Mac";
    case 2 /* Linux */:
      return "Linux";
    case 3 /* Windows */:
      return "Windows";
  }
}
__name(GetPlatformName, "GetPlatformName");
function GetOperatingSystem() {
  return _operatingSystem;
}
__name(GetOperatingSystem, "GetOperatingSystem");
function GetArchitecture() {
  return _architecture;
}
__name(GetArchitecture, "GetArchitecture");
function IsWindows() {
  return _isWindows;
}
__name(IsWindows, "IsWindows");
function IsMacintosh() {
  return _isMacintosh;
}
__name(IsMacintosh, "IsMacintosh");
function IsLinux() {
  return _isLinux;
}
__name(IsLinux, "IsLinux");
function IsWeb() {
  return _isWeb;
}
__name(IsWeb, "IsWeb");
function IsElectron() {
  return _isElectron;
}
__name(IsElectron, "IsElectron");
function IsCI() {
  return _isCI;
}
__name(IsCI, "IsCI");
function GetPathSeparator() {
  return _isWindows ? PATH_SEPARATOR_WINDOWS : PATH_SEPARATOR_UNIX;
}
__name(GetPathSeparator, "GetPathSeparator");
function GetLineEnding() {
  return _isWindows ? LINE_ENDING_WINDOWS : LINE_ENDING_UNIX;
}
__name(GetLineEnding, "GetLineEnding");
function NormalizePath(path) {
  if (!path) {
    return "";
  }
  const separator = GetPathSeparator();
  if (_isWindows) {
    return path.replace(/\//g, separator);
  } else {
    return path.replace(/\\/g, separator);
  }
}
__name(NormalizePath, "NormalizePath");
function NormalizePathToUnix(path) {
  if (!path) {
    return "";
  }
  return path.replace(/\\/g, "/");
}
__name(NormalizePathToUnix, "NormalizePathToUnix");
function NormalizePathToWindows(path) {
  if (!path) {
    return "";
  }
  return path.replace(/\//g, PATH_SEPARATOR_WINDOWS);
}
__name(NormalizePathToWindows, "NormalizePathToWindows");
function JoinPath(...segments) {
  const validSegments = segments.filter(
    (s) => s != null && s !== ""
  );
  if (validSegments.length === 0) {
    return "";
  }
  const separator = GetPathSeparator();
  let result = validSegments.join(separator === "/" ? "/" : "\\");
  result = result.replace(/\/+/g, separator === "/" ? "/" : "\\");
  result = result.replace(/\\+/g, "\\");
  return result;
}
__name(JoinPath, "JoinPath");
function GetLocale() {
  return _locale;
}
__name(GetLocale, "GetLocale");
function GetLanguage() {
  return _language;
}
__name(GetLanguage, "GetLanguage");
function GetUserAgent() {
  return _userAgent;
}
__name(GetUserAgent, "GetUserAgent");
function IsLittleEndian() {
  return _isLittleEndian;
}
__name(IsLittleEndian, "IsLittleEndian");
function GetOSInfo() {
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
    userAgent: GetUserAgent()
  };
}
__name(GetOSInfo, "GetOSInfo");
function PlatformToString(platform) {
  switch (platform) {
    case 0 /* Web */:
      return "Web";
    case 1 /* Mac */:
      return "Mac";
    case 2 /* Linux */:
      return "Linux";
    case 3 /* Windows */:
      return "Windows";
    default:
      return "Web";
  }
}
__name(PlatformToString, "PlatformToString");
function StringToPlatform(platform) {
  const normalized = String(platform);
  switch (normalized) {
    case "Web":
      return Option.some(0 /* Web */);
    case "Mac":
      return Option.some(1 /* Mac */);
    case "Linux":
      return Option.some(2 /* Linux */);
    case "Windows":
      return Option.some(3 /* Windows */);
    default:
      return Option.none();
  }
}
__name(StringToPlatform, "StringToPlatform");
function IsDefaultLanguage() {
  return _language === DEFAULT_LANGUAGE;
}
__name(IsDefaultLanguage, "IsDefaultLanguage");
function IsEnglishVariant() {
  if (_language.length === 2) {
    return _language === "en";
  } else if (_language.length >= 3) {
    return _language[0] === "e" && _language[1] === "n" && _language[2] === "-";
  }
  return false;
}
__name(IsEnglishVariant, "IsEnglishVariant");
function GetOSInfoEffect() {
  return Effect.succeed(GetOSInfo());
}
__name(GetOSInfoEffect, "GetOSInfoEffect");
function DetectPlatformEffect() {
  return Effect.succeed(GetPlatformNumber());
}
__name(DetectPlatformEffect, "DetectPlatformEffect");
function NormalizePathEffect(path) {
  if (!path) {
    return Effect.fail(new Error("Path cannot be null or undefined"));
  }
  return Effect.succeed(NormalizePath(path));
}
__name(NormalizePathEffect, "NormalizePathEffect");
function IsAbsolutePath(path) {
  if (!path) {
    return false;
  }
  if (_isWindows) {
    return /^[a-zA-Z]:\\/.test(path) || /^\\\\[^\\]/.test(path);
  } else {
    return path.startsWith("/");
  }
}
__name(IsAbsolutePath, "IsAbsolutePath");
var Platform = {
  Web: 0 /* Web */,
  Mac: 1 /* Mac */,
  Linux: 2 /* Linux */,
  Windows: 3 /* Windows */
};
var PlatformConstants = {
  DEFAULT_LANGUAGE,
  DEFAULT_LOCALE,
  PATH_SEPARATOR_WINDOWS,
  PATH_SEPARATOR_UNIX,
  LINE_ENDING_WINDOWS,
  LINE_ENDING_UNIX
};
var OS = {
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
  IsEnglishVariant
};

// Source/Platform/Environment.ts
var Environment_exports = {};
__export(Environment_exports, {
  ClearCache: () => ClearCache,
  DEFAULT_LANGUAGE: () => DEFAULT_LANGUAGE2,
  DEFAULT_LOCALE: () => DEFAULT_LOCALE2,
  DeleteEnvironmentVariable: () => DeleteEnvironmentVariable,
  Environment: () => Environment,
  GetAllEnvironmentVariables: () => GetAllEnvironmentVariables,
  GetEnvironmentInfo: () => GetEnvironmentInfo,
  GetEnvironmentInfoEffect: () => GetEnvironmentInfoEffect,
  GetEnvironmentVariable: () => GetEnvironmentVariable,
  GetEnvironmentVariableEffect: () => GetEnvironmentVariableEffect,
  GetEnvironmentVariableOr: () => GetEnvironmentVariableOr,
  GetEnvironmentVariableOrEffect: () => GetEnvironmentVariableOrEffect,
  GetHomeDirectory: () => GetHomeDirectory,
  GetLanguage: () => GetLanguage2,
  GetLocale: () => GetLocale2,
  GetPlatformHome: () => GetPlatformHome,
  GetTempDirectory: () => GetTempDirectory,
  GetUserDataDirectory: () => GetUserDataDirectory,
  GetVSCodePath: () => GetVSCodePath,
  GetValidatedEnvironmentVariable: () => GetValidatedEnvironmentVariable,
  IsCI: () => IsCI2,
  IsDevelopment: () => IsDevelopment,
  IsProduction: () => IsProduction,
  IsVSCode: () => IsVSCode,
  SanitizeName: () => SanitizeName,
  SanitizeValue: () => SanitizeValue,
  SetEnvironmentVariable: () => SetEnvironmentVariable,
  SetEnvironmentVariableEffect: () => SetEnvironmentVariableEffect,
  ValidateEnvironmentVariable: () => ValidateEnvironmentVariable
});
import { Effect as Effect2, Option as Option2 } from "effect";
var DEFAULT_LANGUAGE2 = "en";
var DEFAULT_LOCALE2 = "en-US";
var EnvironmentCache = /* @__PURE__ */ new Map();
var CacheTimestamp = 0;
var CACHE_TTL = 6e4;
function GetProcessEnvironment() {
  if (typeof process === "object" && typeof process.env === "object") {
    return process.env;
  }
  return {};
}
__name(GetProcessEnvironment, "GetProcessEnvironment");
function ClearCache() {
  EnvironmentCache.clear();
  CacheTimestamp = Date.now();
}
__name(ClearCache, "ClearCache");
function InvalidateCacheIfNeeded() {
  if (Date.now() - CacheTimestamp > CACHE_TTL) {
    ClearCache();
  }
}
__name(InvalidateCacheIfNeeded, "InvalidateCacheIfNeeded");
function GetEnvironmentVariable(name) {
  if (!name || typeof name !== "string") {
    return Option2.none();
  }
  InvalidateCacheIfNeeded();
  const cached = EnvironmentCache.get(name);
  if (cached !== void 0) {
    return Option2.some(cached);
  }
  const env = GetProcessEnvironment();
  const value = env[name];
  if (value !== void 0) {
    EnvironmentCache.set(name, value);
    return Option2.some(value);
  }
  return Option2.none();
}
__name(GetEnvironmentVariable, "GetEnvironmentVariable");
function GetEnvironmentVariableOr(name, defaultValue) {
  return Option2.getOrElse(GetEnvironmentVariable(name), () => defaultValue);
}
__name(GetEnvironmentVariableOr, "GetEnvironmentVariableOr");
function SetEnvironmentVariable(name, value) {
  if (!name || typeof name !== "string") {
    return false;
  }
  if (value === void 0 || value === null) {
    return false;
  }
  const env = GetProcessEnvironment();
  env[name] = value;
  EnvironmentCache.set(name, value);
  return true;
}
__name(SetEnvironmentVariable, "SetEnvironmentVariable");
function DeleteEnvironmentVariable(name) {
  if (!name || typeof name !== "string") {
    return false;
  }
  const env = GetProcessEnvironment();
  delete env[name];
  EnvironmentCache.delete(name);
  return true;
}
__name(DeleteEnvironmentVariable, "DeleteEnvironmentVariable");
function GetAllEnvironmentVariables() {
  InvalidateCacheIfNeeded();
  return GetProcessEnvironment();
}
__name(GetAllEnvironmentVariables, "GetAllEnvironmentVariables");
function ValidateEnvironmentVariable(name, value, rule) {
  if (rule.required && (!value || value.trim() === "")) {
    return {
      isValid: false,
      value: "",
      error: `Environment variable ${name} is required but empty`
    };
  }
  if (rule.type) {
    switch (rule.type) {
      case "number":
        if (isNaN(Number(value))) {
          return {
            isValid: false,
            value,
            error: `Environment variable ${name} must be a number`
          };
        }
        break;
      case "boolean":
        if (!["true", "false", "1", "0", "yes", "no"].includes(
          value.toLowerCase()
        )) {
          return {
            isValid: false,
            value,
            error: `Environment variable ${name} must be a boolean value`
          };
        }
        break;
      case "path":
        if (!value || value.trim() === "" || !/^[a-zA-Z0-9_\-\.\s\\\/]+$/.test(value)) {
          return {
            isValid: false,
            value,
            error: `Environment variable ${name} must be a valid path`
          };
        }
        break;
      case "url":
        try {
          new URL(value);
        } catch {
          return {
            isValid: false,
            value,
            error: `Environment variable ${name} must be a valid URL`
          };
        }
        break;
    }
  }
  if (rule.pattern && !rule.pattern.test(value)) {
    return {
      isValid: false,
      value,
      error: `Environment variable ${name} does not match required pattern`
    };
  }
  if (rule.min && value.length < rule.min) {
    return {
      isValid: false,
      value,
      error: `Environment variable ${name} must be at least ${rule.min} characters`
    };
  }
  if (rule.max && value.length > rule.max) {
    return {
      isValid: false,
      value,
      error: `Environment variable ${name} must be at most ${rule.max} characters`
    };
  }
  if (rule.allowedValues && !rule.allowedValues.includes(value)) {
    return {
      isValid: false,
      value,
      error: `Environment variable ${name} must be one of: ${rule.allowedValues.join(", ")}`
    };
  }
  let sanitizedValue = value;
  if (rule.sanitize) {
    sanitizedValue = rule.sanitize(value);
  }
  return {
    isValid: true,
    value: sanitizedValue
  };
}
__name(ValidateEnvironmentVariable, "ValidateEnvironmentVariable");
function GetValidatedEnvironmentVariable(name, rule) {
  const valueOption = GetEnvironmentVariable(name);
  if (Option2.isNone(valueOption)) {
    if (rule.required) {
      return {
        isValid: false,
        value: "",
        error: `Environment variable ${name} is required but not set`
      };
    }
    return {
      isValid: true,
      value: ""
    };
  }
  return ValidateEnvironmentVariable(name, valueOption.value, rule);
}
__name(GetValidatedEnvironmentVariable, "GetValidatedEnvironmentVariable");
function GetLanguage2() {
  const nlsConfig = GetEnvironmentVariable("VSCODE_NLS_CONFIG");
  if (Option2.isSome(nlsConfig)) {
    try {
      const config = JSON.parse(nlsConfig.value);
      if (config.resolvedLanguage) {
        return config.resolvedLanguage;
      }
      if (config.language) {
        return config.language;
      }
    } catch {
    }
  }
  const lcAll = GetEnvironmentVariable("LC_ALL");
  if (Option2.isSome(lcAll) && lcAll.value) {
    const parts = lcAll.value.split(".");
    if (parts.length > 0) {
      const locale = parts[0].replace("_", "-");
      return locale.split("-")[0] || DEFAULT_LANGUAGE2;
    }
  }
  const lang = GetEnvironmentVariable("LANG");
  if (Option2.isSome(lang) && lang.value) {
    const parts = lang.value.split(".");
    if (parts.length > 0) {
      const locale = parts[0].replace("_", "-");
      return locale.split("-")[0] || DEFAULT_LANGUAGE2;
    }
  }
  const language = GetEnvironmentVariable("LANGUAGE");
  if (Option2.isSome(language) && language.value) {
    const parts = language.value.split(":")[0];
    return parts.replace("_", "-").split("-")[0] || DEFAULT_LANGUAGE2;
  }
  return DEFAULT_LANGUAGE2;
}
__name(GetLanguage2, "GetLanguage");
function GetLocale2() {
  const nlsConfig = GetEnvironmentVariable("VSCODE_NLS_CONFIG");
  if (Option2.isSome(nlsConfig)) {
    try {
      const config = JSON.parse(nlsConfig.value);
      if (config.userLocale && typeof config.userLocale === "string") {
        return config.userLocale;
      }
      if (config.osLocale && typeof config.osLocale === "string") {
        return config.osLocale;
      }
    } catch {
    }
  }
  const lcAll = GetEnvironmentVariable("LC_ALL");
  if (Option2.isSome(lcAll) && lcAll.value) {
    const parts = lcAll.value.split(".");
    if (parts && parts.length > 0) {
      return parts[0].replace("_", "-");
    }
  }
  const lang = GetEnvironmentVariable("LANG");
  if (Option2.isSome(lang) && lang.value) {
    const parts = lang.value.split(".");
    if (parts && parts.length > 0) {
      return parts[0].replace("_", "-");
    }
  }
  return DEFAULT_LOCALE2;
}
__name(GetLocale2, "GetLocale");
function GetHomeDirectory() {
  const env = GetProcessEnvironment();
  if (env.HOME) {
    return env.HOME;
  }
  if (env.USERPROFILE) {
    return env.USERPROFILE;
  }
  if (env.HOMEPATH && env.HOMEDRIVE) {
    return env.HOMEDRIVE + env.HOMEPATH;
  }
  return "/tmp";
}
__name(GetHomeDirectory, "GetHomeDirectory");
function GetTempDirectory() {
  const env = GetProcessEnvironment();
  if (env.TEMP) {
    return env.TEMP;
  }
  if (env.TMP) {
    return env.TMP;
  }
  if (env.TMPDIR) {
    return env.TMPDIR;
  }
  const platform = GetPlatformType();
  if (platform === "windows") {
    return "	emp";
  }
  return "/tmp";
}
__name(GetTempDirectory, "GetTempDirectory");
function GetUserDataDirectory() {
  const xdgDataHome = GetEnvironmentVariable("XDG_DATA_HOME");
  if (Option2.isSome(xdgDataHome) && xdgDataHome.value) {
    return xdgDataHome.value;
  }
  const home = GetHomeDirectory();
  const platform = GetPlatformType();
  switch (platform) {
    case "mac":
      return `${home}/Library/Application Support`;
    case "windows":
      const localAppData = GetEnvironmentVariable("LOCALAPPDATA");
      if (Option2.isSome(localAppData) && localAppData.value) {
        return localAppData.value;
      }
      return `${home}/AppData/Local`;
    case "linux":
    default:
      return `${home}/.local/share`;
  }
}
__name(GetUserDataDirectory, "GetUserDataDirectory");
function GetPlatformHome() {
  const home = GetHomeDirectory();
  const platform = GetPlatformType();
  switch (platform) {
    case "mac":
      return `${home}/Library`;
    case "windows":
      return GetEnvironmentVariableOr(
        "APPDATA",
        `${home}/AppData/Roaming`
      );
    case "linux":
    default:
      return home;
  }
}
__name(GetPlatformHome, "GetPlatformHome");
function GetPlatformType() {
  const currentProcess = typeof process !== "undefined" ? process : void 0;
  const platform = currentProcess && "platform" in currentProcess ? currentProcess.platform : "";
  if (platform === "win32") {
    return "windows";
  }
  if (platform === "darwin") {
    return "mac";
  }
  return "linux";
}
__name(GetPlatformType, "GetPlatformType");
function GetEnvironmentInfo() {
  const envVars = GetAllEnvironmentVariables();
  const safeEnvVars = {};
  for (const [key, value] of Object.entries(envVars)) {
    if (value !== void 0) {
      safeEnvVars[key] = value;
    }
  }
  return {
    variables: safeEnvVars,
    language: GetLanguage2(),
    locale: GetLocale2(),
    homeDirectory: GetHomeDirectory(),
    tempDirectory: GetTempDirectory(),
    userDataDirectory: GetUserDataDirectory(),
    platformHome: GetPlatformHome()
  };
}
__name(GetEnvironmentInfo, "GetEnvironmentInfo");
function IsDevelopment() {
  const nodeEnv = GetEnvironmentVariable("NODE_ENV");
  if (Option2.isNone(nodeEnv)) {
    return false;
  }
  return ["development", "dev", "test"].includes(nodeEnv.value.toLowerCase());
}
__name(IsDevelopment, "IsDevelopment");
function IsProduction() {
  const nodeEnv = GetEnvironmentVariable("NODE_ENV");
  if (Option2.isNone(nodeEnv)) {
    return true;
  }
  return nodeEnv.value.toLowerCase() === "production";
}
__name(IsProduction, "IsProduction");
function IsCI2() {
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
    "GITHUB_WORKSPACE"
  ];
  for (const variable of ciVariables) {
    const value = GetEnvironmentVariable(variable);
    if (Option2.isSome(value) && value.value) {
      return true;
    }
  }
  return false;
}
__name(IsCI2, "IsCI");
function IsVSCode() {
  const codeEnv = GetEnvironmentVariable("VSCODE_PID");
  const vscodeEnv = GetEnvironmentVariable("VSCODE_CWD");
  return Option2.isSome(codeEnv) || Option2.isSome(vscodeEnv);
}
__name(IsVSCode, "IsVSCode");
function GetVSCodePath() {
  return GetEnvironmentVariable("VSCODE_PATH");
}
__name(GetVSCodePath, "GetVSCodePath");
function SanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9_]/g, "").toUpperCase();
}
__name(SanitizeName, "SanitizeName");
function SanitizeValue(value) {
  return value.replace(/[\x00-\x1F\x7F]/g, "").trim();
}
__name(SanitizeValue, "SanitizeValue");
function GetEnvironmentVariableEffect(name) {
  return Effect2.sync(() => GetEnvironmentVariable(name));
}
__name(GetEnvironmentVariableEffect, "GetEnvironmentVariableEffect");
function GetEnvironmentVariableOrEffect(name, defaultValue) {
  return Effect2.sync(() => GetEnvironmentVariableOr(name, defaultValue));
}
__name(GetEnvironmentVariableOrEffect, "GetEnvironmentVariableOrEffect");
function SetEnvironmentVariableEffect(name, value) {
  if (!name) {
    return Effect2.fail(
      new Error("Environment variable name cannot be empty")
    );
  }
  return Effect2.sync(() => {
    SetEnvironmentVariable(name, value);
  });
}
__name(SetEnvironmentVariableEffect, "SetEnvironmentVariableEffect");
function GetEnvironmentInfoEffect() {
  return Effect2.sync(() => GetEnvironmentInfo());
}
__name(GetEnvironmentInfoEffect, "GetEnvironmentInfoEffect");
var Environment = {
  GetEnvironmentVariable,
  GetEnvironmentVariableOr,
  SetEnvironmentVariable,
  DeleteEnvironmentVariable,
  GetAllEnvironmentVariables,
  ValidateEnvironmentVariable,
  GetValidatedEnvironmentVariable,
  GetLanguage: GetLanguage2,
  GetLocale: GetLocale2,
  GetHomeDirectory,
  GetTempDirectory,
  GetUserDataDirectory,
  GetPlatformHome,
  GetEnvironmentInfo,
  IsDevelopment,
  IsProduction,
  IsCI: IsCI2,
  IsVSCode,
  GetVSCodePath,
  SanitizeName,
  SanitizeValue,
  ClearCache
};

// Source/Platform/Process.ts
var Process_exports = {};
__export(Process_exports, {
  CleanupAllProcesses: () => CleanupAllProcesses,
  DEFAULT_HEARTBEAT_INTERVAL: () => DEFAULT_HEARTBEAT_INTERVAL,
  DEFAULT_KILL_TIMEOUT: () => DEFAULT_KILL_TIMEOUT,
  DEFAULT_MAX_BUFFER: () => DEFAULT_MAX_BUFFER,
  DEFAULT_MAX_RESTARTS: () => DEFAULT_MAX_RESTARTS,
  DEFAULT_RESTART_DELAY: () => DEFAULT_RESTART_DELAY,
  DEFAULT_TIMEOUT: () => DEFAULT_TIMEOUT,
  ExecuteCommand: () => ExecuteCommand,
  ExecuteCommandEffect: () => ExecuteCommandEffect,
  ForkProcess: () => ForkProcess,
  GetAllProcesses: () => GetAllProcesses,
  GetCurrentPid: () => GetCurrentPid,
  GetParentPid: () => GetParentPid,
  GetProcess: () => GetProcess,
  GetProcessEffect: () => GetProcessEffect,
  GetRunningProcesses: () => GetRunningProcesses,
  GetStoppedProcesses: () => GetStoppedProcesses,
  IsProcessRunning: () => IsProcessRunning,
  KillProcess: () => KillProcess,
  MonitorProcess: () => MonitorProcess,
  Process: () => Process,
  ProcessConstants: () => ProcessConstants,
  ProcessSignal: () => ProcessSignal,
  SendSignal: () => SendSignal,
  SendSignalEffect: () => SendSignalEffect,
  SpawnProcess: () => SpawnProcess,
  SpawnProcessEffect: () => SpawnProcessEffect,
  TerminateProcess: () => TerminateProcess,
  UnregisterProcess: () => UnregisterProcess,
  ValidateArgs: () => ValidateArgs,
  ValidateCommand: () => ValidateCommand
});
import { Effect as Effect3, Option as Option3 } from "effect";
var ProcessSignal = /* @__PURE__ */ ((ProcessSignal2) => {
  ProcessSignal2["SIGHUP"] = "SIGHUP";
  ProcessSignal2["SIGINT"] = "SIGINT";
  ProcessSignal2["SIGQUIT"] = "SIGQUIT";
  ProcessSignal2["SIGILL"] = "SIGILL";
  ProcessSignal2["SIGTRAP"] = "SIGTRAP";
  ProcessSignal2["SIGABRT"] = "SIGABRT";
  ProcessSignal2["SIGBUS"] = "SIGBUS";
  ProcessSignal2["SIGFPE"] = "SIGFPE";
  ProcessSignal2["SIGKILL"] = "SIGKILL";
  ProcessSignal2["SIGUSR1"] = "SIGUSR1";
  ProcessSignal2["SIGSEGV"] = "SIGSEGV";
  ProcessSignal2["SIGUSR2"] = "SIGUSR2";
  ProcessSignal2["SIGPIPE"] = "SIGPIPE";
  ProcessSignal2["SIGALRM"] = "SIGALRM";
  ProcessSignal2["SIGTERM"] = "SIGTERM";
  ProcessSignal2["SIGCHLD"] = "SIGCHLD";
  ProcessSignal2["SIGCONT"] = "SIGCONT";
  ProcessSignal2["SIGSTOP"] = "SIGSTOP";
  ProcessSignal2["SIGTSTP"] = "SIGTSTP";
  ProcessSignal2["SIGTTIN"] = "SIGTTIN";
  ProcessSignal2["SIGTTOU"] = "SIGTTOU";
  ProcessSignal2["SIGURG"] = "SIGURG";
  ProcessSignal2["SIGXCPU"] = "SIGXCPU";
  ProcessSignal2["SIGXFSZ"] = "SIGXFSZ";
  ProcessSignal2["SIGVTALRM"] = "SIGVTALRM";
  ProcessSignal2["SIGPROF"] = "SIGPROF";
  ProcessSignal2["SIGWINCH"] = "SIGWINCH";
  ProcessSignal2["SIGIO"] = "SIGIO";
  ProcessSignal2["SIGPOLL"] = "SIGPOLL";
  ProcessSignal2["SIGPWR"] = "SIGPWR";
  ProcessSignal2["SIGSYS"] = "SIGSYS";
  ProcessSignal2["SIGSTKFLT"] = "SIGSTKFLT";
  ProcessSignal2["SIGUNUSED"] = "SIGUNUSED";
  return ProcessSignal2;
})(ProcessSignal || {});
var DEFAULT_TIMEOUT = 3e4;
var DEFAULT_MAX_BUFFER = 1024 * 1024;
var DEFAULT_HEARTBEAT_INTERVAL = 5e3;
var DEFAULT_KILL_TIMEOUT = 5e3;
var DEFAULT_MAX_RESTARTS = 3;
var DEFAULT_RESTART_DELAY = 1e3;
var ProcessRegistry = /* @__PURE__ */ new Map();
function IsChildProcessAvailable() {
  try {
    return typeof __require === "function" && __require("child_process");
  } catch {
    return false;
  }
}
__name(IsChildProcessAvailable, "IsChildProcessAvailable");
function GetChildProcessModule() {
  if (!IsChildProcessAvailable()) {
    return null;
  }
  try {
    return __require("child_process");
  } catch {
    return null;
  }
}
__name(GetChildProcessModule, "GetChildProcessModule");
function ValidateCommand(command) {
  if (!command || typeof command !== "string") {
    return false;
  }
  const trimmed = command.trim();
  if (trimmed === "") {
    return false;
  }
  const dangerousPatterns = [
    /;\s*\w/,
    // Command chaining
    /\|\s*\w/,
    // Pipe chaining
    /&&\s*\w/,
    // AND operator
    /\|\|\s*\w/,
    // OR operator
    />\s*\/dev/,
    // Redirect output
    />\s*\/tmp/,
    // Write to temp
    /`[^`]*`/,
    // Command substitution
    /\$\(.*,?\)/,
    // Command substitution
    /\/\.\.\/|\\\\\\.\\/,
    // Path traversal
    /rm\s+-rf/
    // Dangerous command
  ];
  for (const pattern of dangerousPatterns) {
    if (pattern.test(command)) {
      return false;
    }
  }
  return true;
}
__name(ValidateCommand, "ValidateCommand");
function ValidateArgs(args) {
  if (!Array.isArray(args)) {
    return false;
  }
  const dangerousPatterns = [
    /;\s*\w/,
    /`\s*[^`]*`/,
    /\$\s*\(\s*[^)]*\)/,
    />\s*\//,
    />\s*\w/
  ];
  for (const arg of args) {
    if (!arg || typeof arg !== "string") {
      return false;
    }
    for (const pattern of dangerousPatterns) {
      if (pattern.test(arg)) {
        return false;
      }
    }
  }
  return true;
}
__name(ValidateArgs, "ValidateArgs");
async function SpawnProcess(command, args = [], options = {}) {
  if (!ValidateCommand(command)) {
    console.error("[Process] Invalid command:", command);
    return null;
  }
  if (!ValidateArgs(args)) {
    console.error("[Process] Invalid arguments:", args);
    return null;
  }
  const childProcess = GetChildProcessModule();
  if (!childProcess) {
    console.error("[Process] child_process module not available");
    return null;
  }
  try {
    const spawnOptions = {
      cwd: options.cwd,
      env: options.env || GetMergedEnvironment(options.env),
      detached: options.detached || false,
      shell: options.shell || false,
      windowsHide: options.windowsHide !== false,
      stdio: ["pipe", "pipe", "pipe"]
    };
    const childProc = childProcess.spawn(command, args, spawnOptions);
    const processInfo = {
      pid: childProc.pid,
      command,
      args,
      cwd: options.cwd || process.cwd(),
      env: options.env || {},
      startTime: Date.now(),
      status: "running",
      exitCode: null,
      signal: null,
      parentPid: process.pid
    };
    ProcessRegistry.set(childProc.pid, processInfo);
    childProc.on(
      "exit",
      (code, signal) => {
        processInfo.status = "stopped";
        processInfo.exitCode = code;
        processInfo.signal = signal;
        console.log(
          `[Process] Process ${childProc.pid} exited: code=${code}, signal=${signal}`
        );
      }
    );
    childProc.on("error", (error) => {
      processInfo.status = "error";
      console.error(`[Process] Process ${childProc.pid} error:`, error);
    });
    console.log(
      `[Process] Spawned process: pid=${childProc.pid}, command=${command}`
    );
    return processInfo;
  } catch (error) {
    console.error("[Process] Failed to spawn process:", error);
    return null;
  }
}
__name(SpawnProcess, "SpawnProcess");
async function ExecuteCommand(command, args = [], options = {}) {
  if (!ValidateCommand(command)) {
    throw new Error("Invalid command");
  }
  if (!ValidateArgs(args)) {
    throw new Error("Invalid arguments");
  }
  const childProcess = GetChildProcessModule();
  if (!childProcess) {
    throw new Error("child_process module not available");
  }
  return new Promise((resolve) => {
    const execOptions = {
      cwd: options.cwd,
      env: options.env || GetMergedEnvironment(options.env),
      timeout: options.timeout || DEFAULT_TIMEOUT,
      maxBuffer: options.maxBuffer || DEFAULT_MAX_BUFFER,
      windowsHide: options.windowsHide !== false,
      killSignal: "SIGTERM"
    };
    childProcess.execFile(
      command,
      args,
      execOptions,
      (error, stdout, stderr) => {
        if (error) {
          resolve({
            stdout: stdout || "",
            stderr: stderr || error.message || "",
            exitCode: error.code || null
          });
        } else {
          resolve({
            stdout: stdout || "",
            stderr: stderr || "",
            exitCode: 0
          });
        }
      }
    );
  });
}
__name(ExecuteCommand, "ExecuteCommand");
async function ForkProcess(modulePath, args = [], options = {}) {
  const childProcess = GetChildProcessModule();
  if (!childProcess) {
    console.error("[Process] child_process module not available");
    return null;
  }
  if (!modulePath || typeof modulePath !== "string" || modulePath.trim() === "") {
    console.error("[Process] Invalid module path");
    return null;
  }
  try {
    const forkOptions = {
      cwd: options.cwd,
      env: options.env || GetMergedEnvironment(options.env),
      silent: false,
      windowsHide: options.windowsHide !== false
    };
    const childProc = childProcess.fork(modulePath, args, forkOptions);
    const processInfo = {
      pid: childProc.pid,
      command: "node",
      args: [modulePath, ...args],
      cwd: options.cwd || process.cwd(),
      env: options.env || {},
      startTime: Date.now(),
      status: "running",
      exitCode: null,
      signal: null,
      parentPid: process.pid
    };
    ProcessRegistry.set(childProc.pid, processInfo);
    childProc.on(
      "exit",
      (code, signal) => {
        processInfo.status = "stopped";
        processInfo.exitCode = code;
        processInfo.signal = signal;
      }
    );
    console.log(
      `[Process] Forked process: pid=${childProc.pid}, module=${modulePath}`
    );
    return processInfo;
  } catch (error) {
    console.error("[Process] Failed to fork process:", error);
    return null;
  }
}
__name(ForkProcess, "ForkProcess");
function SendSignal(pid, signal) {
  try {
    process.kill(pid, signal);
    return true;
  } catch (error) {
    console.error(
      `[Process] Failed to send signal ${signal} to pid ${pid}:`,
      error
    );
    return false;
  }
}
__name(SendSignal, "SendSignal");
function TerminateProcess(pid, timeout = DEFAULT_KILL_TIMEOUT) {
  const processInfo = ProcessRegistry.get(pid);
  if (!processInfo) {
    console.warn(`[Process] Process ${pid} not found in registry`);
    return false;
  }
  if (processInfo.status !== "running") {
    console.warn(`[Process] Process ${pid} is not running`);
    return false;
  }
  try {
    if (!SendSignal(pid, "SIGTERM" /* SIGTERM */)) {
      return false;
    }
    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      const updatedInfo = ProcessRegistry.get(pid);
      if (!updatedInfo || updatedInfo.status !== "running") {
        clearInterval(checkInterval);
        return;
      }
      if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        SendSignal(pid, "SIGKILL" /* SIGKILL */);
      }
    }, 100);
    return true;
  } catch (error) {
    console.error(`[Process] Failed to terminate process ${pid}:`, error);
    return false;
  }
}
__name(TerminateProcess, "TerminateProcess");
function KillProcess(pid) {
  const processInfo = ProcessRegistry.get(pid);
  if (!processInfo) {
    console.warn(`[Process] Process ${pid} not found in registry`);
    return false;
  }
  if (!SendSignal(pid, "SIGKILL" /* SIGKILL */)) {
    return false;
  }
  console.log(`[Process] Killed process ${pid}`);
  return true;
}
__name(KillProcess, "KillProcess");
function GetProcess(pid) {
  const processInfo = ProcessRegistry.get(pid);
  return processInfo ? Option3.some(processInfo) : Option3.none();
}
__name(GetProcess, "GetProcess");
function GetAllProcesses() {
  return Array.from(ProcessRegistry.values());
}
__name(GetAllProcesses, "GetAllProcesses");
function GetRunningProcesses() {
  return Array.from(ProcessRegistry.values()).filter(
    (p) => p.status === "running"
  );
}
__name(GetRunningProcesses, "GetRunningProcesses");
function GetStoppedProcesses() {
  return Array.from(ProcessRegistry.values()).filter(
    (p) => p.status === "stopped" || p.status === "error"
  );
}
__name(GetStoppedProcesses, "GetStoppedProcesses");
function UnregisterProcess(pid) {
  return ProcessRegistry.delete(pid);
}
__name(UnregisterProcess, "UnregisterProcess");
function CleanupAllProcesses() {
  const processes = GetRunningProcesses();
  for (const procInfo of processes) {
    console.log(`[Process] Cleaning up process ${procInfo.pid}`);
    KillProcess(procInfo.pid);
  }
  ProcessRegistry.clear();
}
__name(CleanupAllProcesses, "CleanupAllProcesses");
function GetMergedEnvironment(additionalEnv) {
  const env = {};
  if (typeof process !== "undefined" && process.env) {
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== void 0) {
        env[key] = value;
      }
    }
  }
  if (additionalEnv) {
    for (const [key, value] of Object.entries(additionalEnv)) {
      if (value !== void 0) {
        env[key] = value;
      }
    }
  }
  return env;
}
__name(GetMergedEnvironment, "GetMergedEnvironment");
async function MonitorProcess(pid, options = {}) {
  const processInfo = ProcessRegistry.get(pid);
  if (!processInfo) {
    return false;
  }
  const heartbeatInterval = options.heartbeatInterval || DEFAULT_HEARTBEAT_INTERVAL;
  const killTimeout = options.killTimeout || DEFAULT_KILL_TIMEOUT;
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const updatedInfo = ProcessRegistry.get(pid);
      if (!updatedInfo) {
        clearInterval(interval);
        resolve(false);
        return;
      }
      if (updatedInfo.status !== "running") {
        clearInterval(interval);
        resolve(updatedInfo.status === "stopped");
        return;
      }
    }, heartbeatInterval);
    setTimeout(() => {
      clearInterval(interval);
      if (ProcessRegistry.has(pid)) {
        TerminateProcess(pid, killTimeout);
      }
      resolve(false);
    }, killTimeout * 10);
  });
}
__name(MonitorProcess, "MonitorProcess");
function IsProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
__name(IsProcessRunning, "IsProcessRunning");
function GetCurrentPid() {
  return process.pid;
}
__name(GetCurrentPid, "GetCurrentPid");
function GetParentPid() {
  return process.ppid;
}
__name(GetParentPid, "GetParentPid");
function SpawnProcessEffect(command, args, options) {
  return Effect3.tryPromise({
    try: /* @__PURE__ */ __name(() => SpawnProcess(command, args, options), "try"),
    catch: /* @__PURE__ */ __name((error) => new Error(`Failed to spawn process: ${error}`), "catch")
  });
}
__name(SpawnProcessEffect, "SpawnProcessEffect");
function ExecuteCommandEffect(command, args, options = {}) {
  return Effect3.tryPromise({
    try: /* @__PURE__ */ __name(() => ExecuteCommand(command, args, options), "try"),
    catch: /* @__PURE__ */ __name((error) => new Error(`Failed to execute command: ${error}`), "catch")
  });
}
__name(ExecuteCommandEffect, "ExecuteCommandEffect");
function SendSignalEffect(pid, signal) {
  return Effect3.try(() => {
    if (!SendSignal(pid, signal)) {
      throw new Error(
        `Failed to send signal ${signal} to process ${pid}`
      );
    }
  });
}
__name(SendSignalEffect, "SendSignalEffect");
function GetProcessEffect(pid) {
  return Effect3.sync(() => GetProcess(pid));
}
__name(GetProcessEffect, "GetProcessEffect");
var Process = {
  ValidateCommand,
  ValidateArgs,
  SpawnProcess,
  ExecuteCommand,
  ForkProcess,
  SendSignal,
  TerminateProcess,
  KillProcess,
  GetProcess,
  GetAllProcesses,
  GetRunningProcesses,
  GetStoppedProcesses,
  UnregisterProcess,
  CleanupAllProcesses,
  MonitorProcess,
  IsProcessRunning,
  GetCurrentPid,
  GetParentPid
};
var ProcessConstants = {
  DEFAULT_TIMEOUT,
  DEFAULT_MAX_BUFFER,
  DEFAULT_HEARTBEAT_INTERVAL,
  DEFAULT_KILL_TIMEOUT,
  DEFAULT_MAX_RESTARTS,
  DEFAULT_RESTART_DELAY
};

// Source/Platform/Type/Converter.ts
var Converter_exports = {};
__export(Converter_exports, {
  ConvertArchitectureToString: () => ConvertArchitectureToString,
  ConvertDTOToEnvironmentInfo: () => ConvertDTOToEnvironmentInfo,
  ConvertDTOToEnvironmentVariable: () => ConvertDTOToEnvironmentVariable,
  ConvertDTOToOSInfo: () => ConvertDTOToOSInfo,
  ConvertDTOToPlatformNumber: () => ConvertDTOToPlatformNumber,
  ConvertDTOToProcessInfo: () => ConvertDTOToProcessInfo,
  ConvertDTOToProcessSignal: () => ConvertDTOToProcessSignal,
  ConvertDTOToProcessSpawnOptions: () => ConvertDTOToProcessSpawnOptions,
  ConvertEnvironmentInfoToDTO: () => ConvertEnvironmentInfoToDTO,
  ConvertEnvironmentVariableToDTO: () => ConvertEnvironmentVariableToDTO,
  ConvertNumberToOperatingSystem: () => ConvertNumberToOperatingSystem,
  ConvertOSInfoToDTO: () => ConvertOSInfoToDTO,
  ConvertOSInfoToDTOEffect: () => ConvertOSInfoToDTOEffect,
  ConvertOperatingSystemToNumber: () => ConvertOperatingSystemToNumber,
  ConvertPlatformNumberToDTO: () => ConvertPlatformNumberToDTO,
  ConvertProcessInfoToDTO: () => ConvertProcessInfoToDTO,
  ConvertProcessSignalToDTO: () => ConvertProcessSignalToDTO,
  ConvertProcessSpawnOptionsToDTO: () => ConvertProcessSpawnOptionsToDTO,
  DeserializeDTO: () => DeserializeDTO,
  DeserializeDTOEffect: () => DeserializeDTOEffect,
  SerializeDTO: () => SerializeDTO,
  TypeConverter: () => TypeConverter,
  ValidateEnvironmentVariableDTO: () => ValidateEnvironmentVariableDTO,
  ValidatePlatformInfoDTO: () => ValidatePlatformInfoDTO,
  ValidateProcessInfoDTO: () => ValidateProcessInfoDTO
});
import { Option as Option4 } from "effect";
function ConvertPlatformNumberToDTO(platformNumber) {
  if (platformNumber < 0 || platformNumber > 3) {
    console.warn(
      `[TypeConverter] Invalid platform number: ${platformNumber}, using default`
    );
    return 0;
  }
  return platformNumber;
}
__name(ConvertPlatformNumberToDTO, "ConvertPlatformNumberToDTO");
function ConvertDTOToPlatformNumber(dtoNumber) {
  return ConvertPlatformNumberToDTO(dtoNumber);
}
__name(ConvertDTOToPlatformNumber, "ConvertDTOToPlatformNumber");
function ConvertArchitectureToString(architecture) {
  const validArchitectures = ["x64", "arm64", "arm", "ia32", "unknown"];
  if (validArchitectures.includes(architecture)) {
    return architecture;
  }
  return "unknown";
}
__name(ConvertArchitectureToString, "ConvertArchitectureToString");
function ConvertOperatingSystemToNumber(os) {
  if (os < 1 || os > 3) {
    console.warn(
      `[TypeConverter] Invalid operating system: ${os}, using default`
    );
    return 3;
  }
  return os;
}
__name(ConvertOperatingSystemToNumber, "ConvertOperatingSystemToNumber");
function ConvertNumberToOperatingSystem(number) {
  return ConvertOperatingSystemToNumber(number);
}
__name(ConvertNumberToOperatingSystem, "ConvertNumberToOperatingSystem");
function ConvertOSInfoToDTO(osInfo) {
  const timestamp = Date.now();
  return {
    platform_number: ConvertPlatformNumberToDTO(
      osInfo.platformNumber || osInfo.platform
    ),
    platform_name: String(osInfo.platform || osInfo.platformName),
    operating_system: ConvertOperatingSystemToNumber(
      osInfo.operatingSystem || osInfo.OS
    ),
    architecture: ConvertArchitectureToString(
      osInfo.architecture || "unknown"
    ),
    path_separator: String(osInfo.pathSeparator || "/"),
    line_ending: String(osInfo.lineEnding || "\n"),
    locale: String(osInfo.locale || "en-US"),
    language: String(osInfo.language || "en"),
    is_little_endian: Boolean(osInfo.isLittleEndian),
    is_web: Boolean(osInfo.isWeb),
    is_electron: Boolean(osInfo.isElectron),
    is_ci: Boolean(osInfo.isCI),
    user_agent: osInfo.userAgent ? String(osInfo.userAgent) : void 0,
    timestamp
  };
}
__name(ConvertOSInfoToDTO, "ConvertOSInfoToDTO");
function ConvertDTOToOSInfo(dto) {
  return {
    platformNumber: ConvertPlatformNumberToDTO(dto.platform_number),
    platform: dto.platform_name,
    operatingSystem: ConvertNumberToOperatingSystem(dto.operating_system),
    architecture: ConvertArchitectureToString(dto.architecture),
    pathSeparator: dto.path_separator,
    lineEnding: dto.line_ending,
    locale: dto.locale,
    language: dto.language,
    isLittleEndian: dto.is_little_endian,
    isWeb: dto.is_web,
    isElectron: dto.is_electron,
    isCI: dto.is_ci,
    userAgent: dto.user_agent
  };
}
__name(ConvertDTOToOSInfo, "ConvertDTOToOSInfo");
function IsSensitiveVariable(name) {
  const sensitivePrefixes = [
    "PASSWORD",
    "TOKEN",
    "SECRET",
    "KEY",
    "AUTH",
    "CREDENTIAL",
    "PRIVATE",
    "API_KEY",
    "ACCESS_KEY"
  ];
  const upperName = name.toUpperCase();
  return sensitivePrefixes.some((prefix) => upperName.startsWith(prefix));
}
__name(IsSensitiveVariable, "IsSensitiveVariable");
function IsReadonlyVariable(name) {
  const readonlyVariables = [
    "PATH",
    "HOME",
    "USERPROFILE",
    "TEMP",
    "TMP",
    "TMPDIR",
    "APPDATA",
    "LOCALAPPDATA",
    "PROGRAMFILES",
    "SYSTEMROOT",
    "WINDIR"
  ];
  return readonlyVariables.includes(name.toUpperCase());
}
__name(IsReadonlyVariable, "IsReadonlyVariable");
function DetectVariableSource(name) {
  if (name.startsWith("VSCODE_")) {
    return "system";
  }
  if (name.startsWith("NODE_ENV")) {
    return "process";
  }
  if (["PATH", "HOME", "USERPROFILE"].includes(name.toUpperCase())) {
    return "system";
  }
  return "user";
}
__name(DetectVariableSource, "DetectVariableSource");
function ConvertEnvironmentVariableToDTO(name, value) {
  return {
    name: String(name),
    value: String(value),
    is_sensitive: IsSensitiveVariable(name),
    is_readonly: IsReadonlyVariable(name),
    source: DetectVariableSource(name)
  };
}
__name(ConvertEnvironmentVariableToDTO, "ConvertEnvironmentVariableToDTO");
function ConvertDTOToEnvironmentVariable(dto) {
  return {
    name: dto.name,
    value: dto.value
  };
}
__name(ConvertDTOToEnvironmentVariable, "ConvertDTOToEnvironmentVariable");
function ConvertEnvironmentInfoToDTO(envInfo) {
  return {
    language: String(envInfo.language ?? "en"),
    locale: String(envInfo.locale ?? "en-US"),
    home_directory: String(envInfo.homeDirectory ?? ""),
    temp_directory: String(envInfo.tempDirectory ?? ""),
    user_data_directory: String(envInfo.userDataDirectory ?? ""),
    platform_home: String(envInfo.platformHome ?? ""),
    variable_count: Number(
      envInfo.variables ? Object.keys(envInfo.variables).length : 0
    ),
    is_development: Boolean(envInfo.isDevelopment),
    is_production: Boolean(envInfo.isProduction),
    is_ci: Boolean(envInfo.isCI),
    is_vscode: Boolean(envInfo.isVSCode),
    timestamp: Date.now()
  };
}
__name(ConvertEnvironmentInfoToDTO, "ConvertEnvironmentInfoToDTO");
function ConvertDTOToEnvironmentInfo(dto) {
  return {
    language: dto.language,
    locale: dto.locale,
    homeDirectory: dto.home_directory,
    tempDirectory: dto.temp_directory,
    userDataDirectory: dto.user_data_directory,
    platformHome: dto.platform_home,
    isDevelopment: dto.is_development,
    isProduction: dto.is_production,
    isCI: dto.is_ci,
    isVSCode: dto.is_vscode
  };
}
__name(ConvertDTOToEnvironmentInfo, "ConvertDTOToEnvironmentInfo");
function ConvertProcessInfoToDTO(procInfo) {
  const now = Date.now();
  const startTime = procInfo.startTime ?? now;
  return {
    pid: Number(procInfo.pid),
    command: String(procInfo.command ?? ""),
    args: Array.isArray(procInfo.args) ? procInfo.args.map(String) : [],
    cwd: String(procInfo.cwd ?? ""),
    parent_pid: procInfo.parentPid ? Number(procInfo.parentPid) : void 0,
    start_time: Number(startTime),
    end_time: procInfo.status === "stopped" ? procInfo.endTime ?? now : void 0,
    status: ["running", "stopped", "error"].includes(procInfo.status) ? procInfo.status : "error",
    exit_code: procInfo.exitCode !== null ? Number(procInfo.exitCode) : null,
    signal: procInfo.signal ? String(procInfo.signal) : null,
    uptime: Number(now - startTime),
    is_detached: Boolean(procInfo.detached),
    timestamp: now
  };
}
__name(ConvertProcessInfoToDTO, "ConvertProcessInfoToDTO");
function ConvertDTOToProcessInfo(dto) {
  return {
    pid: dto.pid,
    command: dto.command,
    args: dto.args,
    cwd: dto.cwd,
    parentPid: dto.parent_pid,
    startTime: dto.start_time,
    endTime: dto.end_time,
    status: dto.status,
    exitCode: dto.exit_code,
    signal: dto.signal,
    detached: dto.is_detached
  };
}
__name(ConvertDTOToProcessInfo, "ConvertDTOToProcessInfo");
function ConvertProcessSpawnOptionsToDTO(options) {
  return {
    cwd: options.cwd ? String(options.cwd) : void 0,
    env_variables: options.env ? { ...options.env } : {},
    detached: Boolean(options.detached),
    shell: Boolean(options.shell),
    windows_hide: options.windowsHide !== false,
    timeout: options.timeout ? Number(options.timeout) : void 0,
    max_buffer: Number(options.maxBuffer ?? 1048576),
    // 1MB default
    uid: options.uid ? Number(options.uid) : void 0,
    gid: options.gid ? Number(options.gid) : void 0
  };
}
__name(ConvertProcessSpawnOptionsToDTO, "ConvertProcessSpawnOptionsToDTO");
function ConvertDTOToProcessSpawnOptions(dto) {
  return {
    cwd: dto.cwd,
    env: dto.env_variables,
    detached: dto.detached,
    shell: dto.shell,
    windowsHide: dto.windows_hide,
    timeout: dto.timeout,
    maxBuffer: dto.max_buffer,
    uid: dto.uid,
    gid: dto.gid
  };
}
__name(ConvertDTOToProcessSpawnOptions, "ConvertDTOToProcessSpawnOptions");
function ConvertProcessSignalToDTO(pid, signal, timeout = 5e3, force = false) {
  return {
    pid: Number(pid),
    signal: String(signal),
    timeout: Number(timeout),
    force: Boolean(force)
  };
}
__name(ConvertProcessSignalToDTO, "ConvertProcessSignalToDTO");
function ConvertDTOToProcessSignal(dto) {
  return {
    pid: dto.pid,
    signal: dto.signal,
    timeout: dto.timeout,
    force: dto.force
  };
}
__name(ConvertDTOToProcessSignal, "ConvertDTOToProcessSignal");
function SerializeDTO(dto) {
  try {
    return JSON.stringify(dto);
  } catch (error) {
    console.error("[TypeConverter] Failed to serialize DTO:", error);
    throw new Error(`DTO serialization failed: ${error}`);
  }
}
__name(SerializeDTO, "SerializeDTO");
function DeserializeDTO(json, validator) {
  try {
    const parsed = JSON.parse(json);
    if (validator && !validator(parsed)) {
      console.warn("[TypeConverter] DTO validation failed");
      return null;
    }
    return parsed;
  } catch (error) {
    console.error("[TypeConverter] Failed to deserialize DTO:", error);
    return null;
  }
}
__name(DeserializeDTO, "DeserializeDTO");
function ValidatePlatformInfoDTO(dto) {
  return typeof dto === "object" && typeof dto.platform_number === "number" && typeof dto.platform_name === "string" && typeof dto.operating_system === "number" && typeof dto.architecture === "string" && typeof dto.path_separator === "string" && typeof dto.line_ending === "string" && typeof dto.locale === "string" && typeof dto.language === "string" && typeof dto.is_little_endian === "boolean" && typeof dto.is_web === "boolean" && typeof dto.is_electron === "boolean" && typeof dto.is_ci === "boolean" && typeof dto.timestamp === "number";
}
__name(ValidatePlatformInfoDTO, "ValidatePlatformInfoDTO");
function ValidateEnvironmentVariableDTO(dto) {
  return typeof dto === "object" && typeof dto.name === "string" && typeof dto.value === "string" && typeof dto.is_sensitive === "boolean" && typeof dto.is_readonly === "boolean" && typeof dto.source === "string";
}
__name(ValidateEnvironmentVariableDTO, "ValidateEnvironmentVariableDTO");
function ValidateProcessInfoDTO(dto) {
  return typeof dto === "object" && typeof dto.pid === "number" && typeof dto.command === "string" && Array.isArray(dto.args) && typeof dto.cwd === "string" && typeof dto.start_time === "number" && ["running", "stopped", "error"].includes(dto.status) && typeof dto.timestamp === "number";
}
__name(ValidateProcessInfoDTO, "ValidateProcessInfoDTO");
function ConvertOSInfoToDTOEffect(osInfo) {
  return {
    dto: ConvertOSInfoToDTO(osInfo),
    json: SerializeDTO(ConvertOSInfoToDTO(osInfo))
  };
}
__name(ConvertOSInfoToDTOEffect, "ConvertOSInfoToDTOEffect");
function DeserializeDTOEffect(json, validator) {
  const parsed = DeserializeDTO(json, validator);
  return parsed ? Option4.some(parsed) : Option4.none();
}
__name(DeserializeDTOEffect, "DeserializeDTOEffect");
var TypeConverter = {
  // Platform converters
  ConvertPlatformNumberToDTO,
  ConvertDTOToPlatformNumber,
  ConvertArchitectureToString,
  ConvertOperatingSystemToNumber,
  ConvertNumberToOperatingSystem,
  ConvertOSInfoToDTO,
  ConvertDTOToOSInfo,
  // Environment converters
  ConvertEnvironmentVariableToDTO,
  ConvertDTOToEnvironmentVariable,
  ConvertEnvironmentInfoToDTO,
  ConvertDTOToEnvironmentInfo,
  // Process converters
  ConvertProcessInfoToDTO,
  ConvertDTOToProcessInfo,
  ConvertProcessSpawnOptionsToDTO,
  ConvertDTOToProcessSpawnOptions,
  ConvertProcessSignalToDTO,
  ConvertDTOToProcessSignal,
  // Serialization
  SerializeDTO,
  DeserializeDTO,
  // Validation
  ValidatePlatformInfoDTO,
  ValidateEnvironmentVariableDTO,
  ValidateProcessInfoDTO
};

// Source/Platform/Service.ts
var Service_exports = {};
__export(Service_exports, {
  DetectPlatform: () => DetectPlatform,
  Environment: () => Environment_exports,
  ExecuteCommand: () => ExecuteCommand2,
  GetEnvironmentVariable: () => GetEnvironmentVariable2,
  GetHealthStatus: () => GetHealthStatus,
  GetOSInfo: () => GetOSInfo2,
  InitializePlatformService: () => InitializePlatformService,
  LivePlatformService: () => LivePlatformService,
  NormalizePath: () => NormalizePath2,
  OS: () => OS_exports,
  PlatformService: () => PlatformService,
  PlatformServiceLayer: () => PlatformServiceLayer,
  PlatformServiceModule: () => PlatformServiceModule,
  PlatformServiceTag: () => PlatformServiceTag,
  Process: () => Process_exports,
  SetEnvironmentVariable: () => SetEnvironmentVariable2,
  SpawnProcess: () => SpawnProcess2,
  TestPlatformService: () => TestPlatformService,
  TypeConverter: () => Converter_exports
});
import { Context, Effect as Effect4, Layer } from "effect";
var PlatformService = class {
  static {
    __name(this, "PlatformService");
  }
  _serviceBrand;
  startTime = 0;
  initialized = false;
  cache = /* @__PURE__ */ new Map();
  CACHE_TTL = 6e4;
  // 60 seconds
  constructor() {
    this._serviceBrand = void 0;
  }
  /**
   * Initialize platform service
   */
  initialize() {
    return Effect4.sync(() => {
      if (this.initialized) {
        console.log("[PlatformService] Already initialized");
        return;
      }
      this.startTime = Date.now();
      const platform = GetPlatformNumber();
      const osInfo = GetOSInfo();
      const envInfo = GetEnvironmentInfo();
      this.cache.set("platform", {
        value: platform,
        timestamp: Date.now()
      });
      this.cache.set("osInfo", { value: osInfo, timestamp: Date.now() });
      this.cache.set("envInfo", {
        value: envInfo,
        timestamp: Date.now()
      });
      this.initialized = true;
      console.log("[PlatformService] Initialized successfully", {
        platform,
        osInfo,
        envInfo
      });
    });
  }
  /**
   * Get cached value or compute new one
   */
  getCached(key, compute) {
    const cached = this.cache.get(key);
    const now = Date.now();
    if (cached && now - cached.timestamp < this.CACHE_TTL) {
      return cached.value;
    }
    const value = compute();
    this.cache.set(key, { value, timestamp: now });
    return value;
  }
  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
  /**
   * Detect platform
   */
  detectPlatform() {
    return Effect4.sync(() => {
      return this.getCached(
        "platform",
        () => GetPlatformNumber()
      );
    });
  }
  /**
   * Get OS information
   */
  getOSInfo() {
    return Effect4.sync(() => {
      return this.getCached("osInfo", () => GetOSInfo());
    });
  }
  /**
   * Check if Windows
   */
  isWindows() {
    return Effect4.sync(() => IsWindows());
  }
  /**
   * Check if Macintosh
   */
  isMacintosh() {
    return Effect4.sync(() => IsMacintosh());
  }
  /**
   * Check if Linux
   */
  isLinux() {
    return Effect4.sync(() => IsLinux());
  }
  /**
   * Normalize path for current platform
   */
  normalizePath(path) {
    return Effect4.sync(() => NormalizePath(path));
  }
  /**
   * Join path segments
   */
  joinPath(...segments) {
    return Effect4.sync(() => JoinPath(...segments));
  }
  /**
   * Get environment variable
   */
  getEnvironmentVariable(name) {
    return Effect4.sync(
      () => GetEnvironmentVariable(name)
    );
  }
  /**
   * Set environment variable
   */
  setEnvironmentVariable(name, value) {
    return Effect4.sync(() => {
      if (!SetEnvironmentVariable(name, value)) {
        throw new Error(`Failed to set environment variable: ${name}`);
      }
      this.cache.delete("envInfo");
    });
  }
  /**
   * Get environment information
   */
  getEnvironmentInfo() {
    return Effect4.sync(() => {
      return this.getCached(
        "envInfo",
        () => GetEnvironmentInfo()
      );
    });
  }
  /**
   * Get language
   */
  getLanguage() {
    return Effect4.sync(() => GetLanguage2());
  }
  /**
   * Get locale
   */
  getLocale() {
    return Effect4.sync(() => GetLocale2());
  }
  /**
   * Get home directory
   */
  getHomeDirectory() {
    return Effect4.sync(() => GetHomeDirectory());
  }
  /**
   * Get temp directory
   */
  getTempDirectory() {
    return Effect4.sync(() => GetTempDirectory());
  }
  /**
   * Spawn process
   */
  spawnProcess(command, args, options) {
    return Effect4.tryPromise({
      try: /* @__PURE__ */ __name(() => SpawnProcess(command, args, options), "try"),
      catch: /* @__PURE__ */ __name((error) => new Error(`Failed to spawn process: ${error}`), "catch")
    });
  }
  /**
   * Execute command
   */
  executeCommand(command, args, options) {
    return Effect4.tryPromise({
      try: /* @__PURE__ */ __name(() => ExecuteCommand(command, args, options || {}), "try"),
      catch: /* @__PURE__ */ __name((error) => new Error(`Failed to execute command: ${error}`), "catch")
    });
  }
  /**
   * Kill process
   */
  killProcess(pid) {
    return Effect4.sync(() => KillProcess(pid));
  }
  /**
   * Get process info
   */
  getProcess(pid) {
    return Effect4.sync(() => GetProcess(pid));
  }
  /**
   * Convert OS info to Mountain DTO
   */
  convertOSInfoToDTO(osInfo) {
    return Effect4.sync(
      () => ConvertOSInfoToDTO(osInfo)
    );
  }
  /**
   * Convert environment info to Mountain DTO
   */
  convertEnvironmentInfoToDTO(envInfo) {
    return Effect4.sync(
      () => ConvertEnvironmentInfoToDTO(envInfo)
    );
  }
  /**
   * Convert process info to Mountain DTO
   */
  convertProcessInfoToDTO(procInfo) {
    return Effect4.sync(
      () => ConvertProcessInfoToDTO(procInfo)
    );
  }
  /**
   * Get health status
   */
  getHealthStatus() {
    return Effect4.sync(() => {
      const uptime = Date.now() - this.startTime;
      const lastUpdate = Math.max(
        this.getCacheTimestamp("osInfo"),
        this.getCacheTimestamp("envInfo"),
        this.getCacheTimestamp("platform")
      );
      let status = "healthy";
      if (!this.initialized) {
        status = "unhealthy";
      } else if (Date.now() - lastUpdate > 12e4) {
        status = "degraded";
      }
      return {
        status,
        uptime,
        lastUpdate
      };
    });
  }
  /**
   * Get cache timestamp by key
   */
  getCacheTimestamp(key) {
    const cached = this.cache.get(key);
    return cached ? cached.timestamp : 0;
  }
  /**
   * Dispose platform service
   */
  dispose() {
    return Effect4.sync(() => {
      console.log("[PlatformService] Disposing...");
      CleanupAllProcesses();
      this.clearCache();
      console.log("[PlatformService] Disposed");
    });
  }
};
var PlatformServiceTag = Context.GenericTag("PlatformService");
var PlatformServiceLayer = Layer.sync(
  PlatformServiceTag,
  () => new PlatformService()
);
var LivePlatformService = PlatformServiceLayer;
var TestPlatformService = Layer.succeed(
  PlatformServiceTag,
  new PlatformService()
);
function DetectPlatform() {
  return Effect4.flatMap(
    Effect4.service(PlatformServiceTag),
    (service) => service.detectPlatform()
  );
}
__name(DetectPlatform, "DetectPlatform");
function GetOSInfo2() {
  return Effect4.flatMap(
    Effect4.service(PlatformServiceTag),
    (service) => service.getOSInfo()
  );
}
__name(GetOSInfo2, "GetOSInfo");
function NormalizePath2(path) {
  return Effect4.flatMap(
    Effect4.service(PlatformServiceTag),
    (service) => service.normalizePath(path)
  );
}
__name(NormalizePath2, "NormalizePath");
function GetEnvironmentVariable2(name) {
  return Effect4.flatMap(
    Effect4.service(PlatformServiceTag),
    (service) => service.getEnvironmentVariable(name)
  );
}
__name(GetEnvironmentVariable2, "GetEnvironmentVariable");
function SetEnvironmentVariable2(name, value) {
  return Effect4.flatMap(
    Effect4.service(PlatformServiceTag),
    (service) => service.setEnvironmentVariable(name, value)
  );
}
__name(SetEnvironmentVariable2, "SetEnvironmentVariable");
function ExecuteCommand2(command, args, options) {
  return Effect4.flatMap(
    Effect4.service(PlatformServiceTag),
    (service) => service.executeCommand(command, args || [], options)
  );
}
__name(ExecuteCommand2, "ExecuteCommand");
function SpawnProcess2(command, args, options) {
  return Effect4.flatMap(
    Effect4.service(PlatformServiceTag),
    (service) => service.spawnProcess(command, args, options)
  );
}
__name(SpawnProcess2, "SpawnProcess");
function GetHealthStatus() {
  return Effect4.flatMap(
    Effect4.service(PlatformServiceTag),
    (service) => service.getHealthStatus()
  );
}
__name(GetHealthStatus, "GetHealthStatus");
function InitializePlatformService() {
  return Effect4.sync(() => {
    const service = new PlatformService();
    return Effect4.runPromise(service.initialize());
  }).pipe(Effect4.flatMap(() => Effect4.void));
}
__name(InitializePlatformService, "InitializePlatformService");
var PlatformServiceModule = {
  IPlatformService,
  PlatformService,
  PlatformServiceTag,
  PlatformServiceLayer,
  LivePlatformService,
  TestPlatformService,
  DetectPlatform,
  GetOSInfo: GetOSInfo2,
  NormalizePath: NormalizePath2,
  GetEnvironmentVariable: GetEnvironmentVariable2,
  SetEnvironmentVariable: SetEnvironmentVariable2,
  ExecuteCommand: ExecuteCommand2,
  SpawnProcess: SpawnProcess2,
  GetHealthStatus,
  InitializePlatformService
};
export {
  CleanupAllProcesses,
  ClearCache as ClearEnvironmentCache,
  ConvertArchitectureToString,
  ConvertDTOToEnvironmentInfo,
  ConvertDTOToEnvironmentVariable,
  ConvertDTOToOSInfo,
  ConvertDTOToPlatformNumber,
  ConvertDTOToProcessInfo,
  ConvertDTOToProcessSignal,
  ConvertDTOToProcessSpawnOptions,
  ConvertEnvironmentInfoToDTO,
  ConvertEnvironmentVariableToDTO,
  ConvertNumberToOperatingSystem,
  ConvertOSInfoToDTO,
  ConvertOSInfoToDTOEffect,
  ConvertOperatingSystemToNumber,
  ConvertPlatformNumberToDTO,
  ConvertProcessInfoToDTO,
  ConvertProcessSignalToDTO,
  ConvertProcessSpawnOptionsToDTO,
  DEFAULT_HEARTBEAT_INTERVAL,
  DEFAULT_KILL_TIMEOUT,
  DEFAULT_LANGUAGE,
  DEFAULT_LANGUAGE2 as DEFAULT_LANGUAGE_ENV,
  DEFAULT_LOCALE,
  DEFAULT_LOCALE2 as DEFAULT_LOCALE_ENV,
  DEFAULT_MAX_BUFFER,
  DEFAULT_MAX_RESTARTS,
  DEFAULT_RESTART_DELAY,
  DEFAULT_TIMEOUT,
  DeleteEnvironmentVariable,
  DeserializeDTO,
  DeserializeDTOEffect,
  DetectPlatform,
  Environment_exports as Environment,
  Environment as EnvironmentModule,
  ExecuteCommand2 as ExecuteCommand,
  ExecuteCommand as ExecuteCommandDirect,
  ExecuteCommandEffect,
  ForkProcess,
  GetAllEnvironmentVariables,
  GetAllProcesses,
  GetArchitecture,
  GetCurrentPid,
  GetEnvironmentInfo as GetEnvironmentInfoDirect,
  GetEnvironmentInfoEffect,
  GetEnvironmentVariable2 as GetEnvironmentVariable,
  GetEnvironmentVariable as GetEnvironmentVariableDirect,
  GetEnvironmentVariableEffect,
  GetEnvironmentVariableOr,
  GetEnvironmentVariableOrEffect,
  GetHealthStatus,
  GetHomeDirectory,
  GetLanguage2 as GetLanguageDirect,
  GetLanguage as GetLanguageOS,
  GetLineEnding,
  GetLocale2 as GetLocaleDirect,
  GetLocale as GetLocaleOS,
  GetOSInfo2 as GetOSInfo,
  GetOSInfo as GetOSInfoDirect,
  GetOperatingSystem,
  GetParentPid,
  GetPathSeparator,
  GetPlatformHome,
  GetPlatformName,
  GetPlatformNumber,
  GetProcess as GetProcessDirect,
  GetProcessEffect,
  GetRunningProcesses,
  GetStoppedProcesses,
  GetTempDirectory,
  GetUserAgent,
  GetUserDataDirectory,
  GetVSCodePath,
  GetValidatedEnvironmentVariable,
  InitializePlatformService,
  IsAbsolutePath,
  IsCI,
  IsCI2 as IsCIEnv,
  IsDefaultLanguage,
  IsDevelopment,
  IsElectron,
  IsEnglishVariant,
  IsLinux,
  IsLittleEndian,
  IsMacintosh,
  IsProcessRunning,
  IsProduction,
  IsVSCode,
  IsWeb,
  IsWindows,
  JoinPath,
  KillProcess as KillProcessDirect,
  LINE_ENDING_UNIX,
  LINE_ENDING_WINDOWS,
  LivePlatformService,
  MonitorProcess,
  NormalizePath2 as NormalizePath,
  NormalizePath as NormalizePathOS,
  NormalizePathToUnix,
  NormalizePathToWindows,
  OS_exports as OS,
  OSArchitecture,
  OS as OSModule,
  OperatingSystem,
  PATH_SEPARATOR_UNIX,
  PATH_SEPARATOR_WINDOWS,
  Platform,
  PlatformConstants,
  PlatformNumber,
  PlatformService,
  PlatformServiceLayer,
  PlatformServiceTag,
  PlatformToString,
  Process_exports as Process,
  ProcessConstants,
  Process as ProcessModule,
  ProcessSignal,
  SanitizeName,
  SanitizeValue,
  SendSignal,
  SendSignalEffect,
  SerializeDTO,
  Service_exports as Service,
  SetEnvironmentVariable2 as SetEnvironmentVariable,
  SetEnvironmentVariable as SetEnvironmentVariableDirect,
  SetEnvironmentVariableEffect,
  SpawnProcess2 as SpawnProcess,
  SpawnProcess as SpawnProcessDirect,
  SpawnProcessEffect,
  StringToPlatform,
  TerminateProcess,
  TestPlatformService,
  Converter_exports as TypeConverter,
  TypeConverter as TypeConverterModule,
  UnregisterProcess,
  ValidateArgs,
  ValidateCommand,
  ValidateEnvironmentVariable,
  ValidateEnvironmentVariableDTO,
  ValidatePlatformInfoDTO,
  ValidateProcessInfoDTO
};
//# sourceMappingURL=index.js.map
