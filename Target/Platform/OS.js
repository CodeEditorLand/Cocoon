var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Platform/OS.ts
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
  if (typeof navigator === "object" && "userAgentData" in navigator) {
    const userAgentData = navigator.userAgentData;
    if (userAgentData && typeof userAgentData.getHighEntropyValues === "function") {
      try {
        return "unknown" /* Unknown */;
      } catch {
        return "unknown" /* Unknown */;
      }
    }
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
export {
  DEFAULT_LANGUAGE,
  DEFAULT_LOCALE,
  DetectPlatformEffect,
  GetArchitecture,
  GetLanguage,
  GetLineEnding,
  GetLocale,
  GetOSInfo,
  GetOSInfoEffect,
  GetOperatingSystem,
  GetPathSeparator,
  GetPlatformName,
  GetPlatformNumber,
  GetUserAgent,
  IsAbsolutePath,
  IsCI,
  IsDefaultLanguage,
  IsElectron,
  IsEnglishVariant,
  IsLinux,
  IsLittleEndian,
  IsMacintosh,
  IsWeb,
  IsWindows,
  JoinPath,
  LINE_ENDING_UNIX,
  LINE_ENDING_WINDOWS,
  NormalizePath,
  NormalizePathEffect,
  NormalizePathToUnix,
  NormalizePathToWindows,
  OS,
  OSArchitecture,
  OperatingSystem,
  PATH_SEPARATOR_UNIX,
  PATH_SEPARATOR_WINDOWS,
  Platform,
  PlatformConstants,
  PlatformNumber,
  PlatformToString,
  StringToPlatform
};
//# sourceMappingURL=OS.js.map
