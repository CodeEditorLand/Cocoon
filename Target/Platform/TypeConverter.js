var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Platform/TypeConverter.ts
import { Option } from "effect";
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
  return parsed ? Option.some(parsed) : Option.none();
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
export {
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
  DeserializeDTO,
  DeserializeDTOEffect,
  SerializeDTO,
  TypeConverter,
  ValidateEnvironmentVariableDTO,
  ValidatePlatformInfoDTO,
  ValidateProcessInfoDTO
};
//# sourceMappingURL=TypeConverter.js.map
