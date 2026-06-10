var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Platform/Environment.ts
import { Effect, Option } from "effect";
var DEFAULT_LANGUAGE = "en";
var DEFAULT_LOCALE = "en-US";
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
    return Option.none();
  }
  InvalidateCacheIfNeeded();
  const cached = EnvironmentCache.get(name);
  if (cached !== void 0) {
    return Option.some(cached);
  }
  const env = GetProcessEnvironment();
  const value = env[name];
  if (value !== void 0) {
    EnvironmentCache.set(name, value);
    return Option.some(value);
  }
  return Option.none();
}
__name(GetEnvironmentVariable, "GetEnvironmentVariable");
function GetEnvironmentVariableOr(name, defaultValue) {
  return Option.getOrElse(GetEnvironmentVariable(name), () => defaultValue);
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
  if (Option.isNone(valueOption)) {
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
function GetLanguage() {
  const nlsConfig = GetEnvironmentVariable("VSCODE_NLS_CONFIG");
  if (Option.isSome(nlsConfig)) {
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
  if (Option.isSome(lcAll) && lcAll.value) {
    const parts = lcAll.value.split(".");
    if (parts.length > 0) {
      const locale = parts[0].replace("_", "-");
      return locale.split("-")[0] || DEFAULT_LANGUAGE;
    }
  }
  const lang = GetEnvironmentVariable("LANG");
  if (Option.isSome(lang) && lang.value) {
    const parts = lang.value.split(".");
    if (parts.length > 0) {
      const locale = parts[0].replace("_", "-");
      return locale.split("-")[0] || DEFAULT_LANGUAGE;
    }
  }
  const language = GetEnvironmentVariable("LANGUAGE");
  if (Option.isSome(language) && language.value) {
    const parts = language.value.split(":")[0];
    return parts.replace("_", "-").split("-")[0] || DEFAULT_LANGUAGE;
  }
  return DEFAULT_LANGUAGE;
}
__name(GetLanguage, "GetLanguage");
function GetLocale() {
  const nlsConfig = GetEnvironmentVariable("VSCODE_NLS_CONFIG");
  if (Option.isSome(nlsConfig)) {
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
  if (Option.isSome(lcAll) && lcAll.value) {
    const parts = lcAll.value.split(".");
    if (parts && parts.length > 0) {
      return parts[0].replace("_", "-");
    }
  }
  const lang = GetEnvironmentVariable("LANG");
  if (Option.isSome(lang) && lang.value) {
    const parts = lang.value.split(".");
    if (parts && parts.length > 0) {
      return parts[0].replace("_", "-");
    }
  }
  return DEFAULT_LOCALE;
}
__name(GetLocale, "GetLocale");
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
  if (Option.isSome(xdgDataHome) && xdgDataHome.value) {
    return xdgDataHome.value;
  }
  const home = GetHomeDirectory();
  const platform = GetPlatformType();
  switch (platform) {
    case "mac":
      return `${home}/Library/Application Support`;
    case "windows":
      const localAppData = GetEnvironmentVariable("LOCALAPPDATA");
      if (Option.isSome(localAppData) && localAppData.value) {
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
    language: GetLanguage(),
    locale: GetLocale(),
    homeDirectory: GetHomeDirectory(),
    tempDirectory: GetTempDirectory(),
    userDataDirectory: GetUserDataDirectory(),
    platformHome: GetPlatformHome()
  };
}
__name(GetEnvironmentInfo, "GetEnvironmentInfo");
function IsDevelopment() {
  const nodeEnv = GetEnvironmentVariable("NODE_ENV");
  if (Option.isNone(nodeEnv)) {
    return false;
  }
  return ["development", "dev", "test"].includes(nodeEnv.value.toLowerCase());
}
__name(IsDevelopment, "IsDevelopment");
function IsProduction() {
  const nodeEnv = GetEnvironmentVariable("NODE_ENV");
  if (Option.isNone(nodeEnv)) {
    return true;
  }
  return nodeEnv.value.toLowerCase() === "production";
}
__name(IsProduction, "IsProduction");
function IsCI() {
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
    if (Option.isSome(value) && value.value) {
      return true;
    }
  }
  return false;
}
__name(IsCI, "IsCI");
function IsVSCode() {
  const codeEnv = GetEnvironmentVariable("VSCODE_PID");
  const vscodeEnv = GetEnvironmentVariable("VSCODE_CWD");
  return Option.isSome(codeEnv) || Option.isSome(vscodeEnv);
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
  return Effect.sync(() => GetEnvironmentVariable(name));
}
__name(GetEnvironmentVariableEffect, "GetEnvironmentVariableEffect");
function GetEnvironmentVariableOrEffect(name, defaultValue) {
  return Effect.sync(() => GetEnvironmentVariableOr(name, defaultValue));
}
__name(GetEnvironmentVariableOrEffect, "GetEnvironmentVariableOrEffect");
function SetEnvironmentVariableEffect(name, value) {
  if (!name) {
    return Effect.fail(
      new Error("Environment variable name cannot be empty")
    );
  }
  return Effect.sync(() => {
    SetEnvironmentVariable(name, value);
  });
}
__name(SetEnvironmentVariableEffect, "SetEnvironmentVariableEffect");
function GetEnvironmentInfoEffect() {
  return Effect.sync(() => GetEnvironmentInfo());
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
  ClearCache
};
export {
  ClearCache,
  DEFAULT_LANGUAGE,
  DEFAULT_LOCALE,
  DeleteEnvironmentVariable,
  Environment,
  GetAllEnvironmentVariables,
  GetEnvironmentInfo,
  GetEnvironmentInfoEffect,
  GetEnvironmentVariable,
  GetEnvironmentVariableEffect,
  GetEnvironmentVariableOr,
  GetEnvironmentVariableOrEffect,
  GetHomeDirectory,
  GetLanguage,
  GetLocale,
  GetPlatformHome,
  GetTempDirectory,
  GetUserDataDirectory,
  GetVSCodePath,
  GetValidatedEnvironmentVariable,
  IsCI,
  IsDevelopment,
  IsProduction,
  IsVSCode,
  SanitizeName,
  SanitizeValue,
  SetEnvironmentVariable,
  SetEnvironmentVariableEffect,
  ValidateEnvironmentVariable
};
//# sourceMappingURL=Environment.js.map
