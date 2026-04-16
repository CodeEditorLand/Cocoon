var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../Output/Target/Microsoft/VSCode/vs/nls.js
function getNLSMessages() {
  return globalThis._VSCODE_NLS_MESSAGES;
}
function getNLSLanguage() {
  return globalThis._VSCODE_NLS_LANGUAGE;
}
function _format(message, args) {
  let result;
  if (args.length === 0) {
    result = message;
  } else {
    result = message.replace(/\{(\d+)\}/g, (match, rest) => {
      const index = rest[0];
      const arg = args[index];
      let result2 = match;
      if (typeof arg === "string") {
        result2 = arg;
      } else if (typeof arg === "number" || typeof arg === "boolean" || arg === void 0 || arg === null) {
        result2 = String(arg);
      }
      return result2;
    });
  }
  if (isPseudo) {
    result = "\uFF3B" + result.replace(/[aouei]/g, "$&$&") + "\uFF3D";
  }
  return result;
}
function localize(data, message, ...args) {
  if (typeof data === "number") {
    return _format(lookupMessage(data, message), args);
  }
  return _format(message, args);
}
function lookupMessage(index, fallback) {
  const message = getNLSMessages()?.[index];
  if (typeof message !== "string") {
    if (typeof fallback === "string") {
      return fallback;
    }
    throw new Error(`!!! NLS MISSING: ${index} !!!`);
  }
  return message;
}
function localize2(data, originalMessage, ...args) {
  let message;
  if (typeof data === "number") {
    message = lookupMessage(data, originalMessage);
  } else {
    message = originalMessage;
  }
  const value = _format(message, args);
  return {
    value,
    original: originalMessage === message ? value : _format(originalMessage, args)
  };
}
var __defProp2, __name2, isPseudo;
var init_nls = __esm({
  "../Output/Target/Microsoft/VSCode/vs/nls.js"() {
    "use strict";
    __defProp2 = Object.defineProperty;
    __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
    __name(getNLSMessages, "getNLSMessages");
    __name2(getNLSMessages, "getNLSMessages");
    __name(getNLSLanguage, "getNLSLanguage");
    __name2(getNLSLanguage, "getNLSLanguage");
    isPseudo = getNLSLanguage() === "pseudo" || typeof document !== "undefined" && document.location && typeof document.location.hash === "string" && document.location.hash.indexOf("pseudo=true") >= 0;
    __name(_format, "_format");
    __name2(_format, "_format");
    __name(localize, "localize");
    __name2(localize, "localize");
    __name(lookupMessage, "lookupMessage");
    __name2(lookupMessage, "lookupMessage");
    __name(localize2, "localize2");
    __name2(localize2, "localize2");
  }
});

// ../Output/Target/Microsoft/VSCode/vs/base/common/platform.js
function PlatformToString(platform22) {
  switch (platform22) {
    case 0:
      return "Web";
    case 1:
      return "Mac";
    case 2:
      return "Linux";
    case 3:
      return "Windows";
  }
}
function isLittleEndian() {
  if (!_isLittleEndianComputed) {
    _isLittleEndianComputed = true;
    const test = new Uint8Array(2);
    test[0] = 1;
    test[1] = 2;
    const view = new Uint16Array(test.buffer);
    _isLittleEndian = view[0] === (2 << 8) + 1;
  }
  return _isLittleEndian;
}
function isTahoeOrNewer(osVersion) {
  return parseFloat(osVersion) >= 25;
}
var __defProp3, __name3, LANGUAGE_DEFAULT, _isWindows, _isMacintosh, _isLinux, _isLinuxSnap, _isNative, _isWeb, _isElectron, _isIOS, _isCI, _isMobile, _locale, _language, _platformLocale, _translationsConfigFile, _userAgent, $globalThis, nodeProcess, isElectronProcess, isElectronRenderer, Platform, _platform, isWindows, isMacintosh, isLinux, isLinuxSnap, isNative, isElectron, isWeb, isWebWorker, webWorkerOrigin, isIOS, isMobile, isCI, platform, userAgent, language, Language, locale, platformLocale, translationsConfigFile, setTimeout0IsFaster, setTimeout0, OperatingSystem, OS, _isLittleEndian, _isLittleEndianComputed, isChrome, isFirefox, isSafari, isEdge, isAndroid;
var init_platform = __esm({
  "../Output/Target/Microsoft/VSCode/vs/base/common/platform.js"() {
    "use strict";
    init_nls();
    __defProp3 = Object.defineProperty;
    __name3 = /* @__PURE__ */ __name((target, value) => __defProp3(target, "name", { value, configurable: true }), "__name");
    LANGUAGE_DEFAULT = "en";
    _isWindows = false;
    _isMacintosh = false;
    _isLinux = false;
    _isLinuxSnap = false;
    _isNative = false;
    _isWeb = false;
    _isElectron = false;
    _isIOS = false;
    _isCI = false;
    _isMobile = false;
    _locale = void 0;
    _language = LANGUAGE_DEFAULT;
    _platformLocale = LANGUAGE_DEFAULT;
    _translationsConfigFile = void 0;
    _userAgent = void 0;
    $globalThis = globalThis;
    nodeProcess = void 0;
    if (typeof $globalThis.vscode !== "undefined" && typeof $globalThis.vscode.process !== "undefined") {
      nodeProcess = $globalThis.vscode.process;
    } else if (typeof process !== "undefined" && typeof process?.versions?.node === "string") {
      nodeProcess = process;
    }
    isElectronProcess = typeof nodeProcess?.versions?.electron === "string";
    isElectronRenderer = isElectronProcess && nodeProcess?.type === "renderer";
    if (typeof nodeProcess === "object") {
      _isWindows = nodeProcess.platform === "win32";
      _isMacintosh = nodeProcess.platform === "darwin";
      _isLinux = nodeProcess.platform === "linux";
      _isLinuxSnap = _isLinux && !!nodeProcess.env["SNAP"] && !!nodeProcess.env["SNAP_REVISION"];
      _isElectron = isElectronProcess;
      _isCI = !!nodeProcess.env["CI"] || !!nodeProcess.env["BUILD_ARTIFACTSTAGINGDIRECTORY"] || !!nodeProcess.env["GITHUB_WORKSPACE"];
      _locale = LANGUAGE_DEFAULT;
      _language = LANGUAGE_DEFAULT;
      const rawNlsConfig = nodeProcess.env["VSCODE_NLS_CONFIG"];
      if (rawNlsConfig) {
        try {
          const nlsConfig = JSON.parse(rawNlsConfig);
          _locale = nlsConfig.userLocale;
          _platformLocale = nlsConfig.osLocale;
          _language = nlsConfig.resolvedLanguage || LANGUAGE_DEFAULT;
          _translationsConfigFile = nlsConfig.languagePack?.translationsConfigFile;
        } catch (e) {
        }
      }
      _isNative = true;
    } else if (typeof navigator === "object" && !isElectronRenderer) {
      _userAgent = navigator.userAgent;
      _isWindows = _userAgent.indexOf("Windows") >= 0;
      _isMacintosh = _userAgent.indexOf("Macintosh") >= 0;
      _isIOS = (_userAgent.indexOf("Macintosh") >= 0 || _userAgent.indexOf("iPad") >= 0 || _userAgent.indexOf("iPhone") >= 0) && !!navigator.maxTouchPoints && navigator.maxTouchPoints > 0;
      _isLinux = _userAgent.indexOf("Linux") >= 0;
      _isMobile = _userAgent?.indexOf("Mobi") >= 0;
      _isWeb = true;
      _language = getNLSLanguage() || LANGUAGE_DEFAULT;
      _locale = navigator.language.toLowerCase();
      _platformLocale = _locale;
    } else {
      console.error("Unable to resolve platform.");
    }
    (function(Platform2) {
      Platform2[Platform2["Web"] = 0] = "Web";
      Platform2[Platform2["Mac"] = 1] = "Mac";
      Platform2[Platform2["Linux"] = 2] = "Linux";
      Platform2[Platform2["Windows"] = 3] = "Windows";
    })(Platform || (Platform = {}));
    __name(PlatformToString, "PlatformToString");
    __name3(PlatformToString, "PlatformToString");
    _platform = 0;
    if (_isMacintosh) {
      _platform = 1;
    } else if (_isWindows) {
      _platform = 3;
    } else if (_isLinux) {
      _platform = 2;
    }
    isWindows = _isWindows;
    isMacintosh = _isMacintosh;
    isLinux = _isLinux;
    isLinuxSnap = _isLinuxSnap;
    isNative = _isNative;
    isElectron = _isElectron;
    isWeb = _isWeb;
    isWebWorker = _isWeb && typeof $globalThis.importScripts === "function";
    webWorkerOrigin = isWebWorker ? $globalThis.origin : void 0;
    isIOS = _isIOS;
    isMobile = _isMobile;
    isCI = _isCI;
    platform = _platform;
    userAgent = _userAgent;
    language = _language;
    (function(Language2) {
      function value() {
        return language;
      }
      __name(value, "value");
      __name3(value, "value");
      Language2.value = value;
      function isDefaultVariant() {
        if (language.length === 2) {
          return language === "en";
        } else if (language.length >= 3) {
          return language[0] === "e" && language[1] === "n" && language[2] === "-";
        } else {
          return false;
        }
      }
      __name(isDefaultVariant, "isDefaultVariant");
      __name3(isDefaultVariant, "isDefaultVariant");
      Language2.isDefaultVariant = isDefaultVariant;
      function isDefault() {
        return language === "en";
      }
      __name(isDefault, "isDefault");
      __name3(isDefault, "isDefault");
      Language2.isDefault = isDefault;
    })(Language || (Language = {}));
    locale = _locale;
    platformLocale = _platformLocale;
    translationsConfigFile = _translationsConfigFile;
    setTimeout0IsFaster = typeof $globalThis.postMessage === "function" && !$globalThis.importScripts;
    setTimeout0 = (() => {
      if (setTimeout0IsFaster) {
        const pending = [];
        $globalThis.addEventListener("message", (e) => {
          if (e.data && e.data.vscodeScheduleAsyncWork) {
            for (let i = 0, len = pending.length; i < len; i++) {
              const candidate = pending[i];
              if (candidate.id === e.data.vscodeScheduleAsyncWork) {
                pending.splice(i, 1);
                candidate.callback();
                return;
              }
            }
          }
        });
        let lastId = 0;
        return (callback) => {
          const myId = ++lastId;
          pending.push({
            id: myId,
            callback
          });
          $globalThis.postMessage({ vscodeScheduleAsyncWork: myId }, "*");
        };
      }
      return (callback) => setTimeout(callback);
    })();
    (function(OperatingSystem2) {
      OperatingSystem2[OperatingSystem2["Windows"] = 1] = "Windows";
      OperatingSystem2[OperatingSystem2["Macintosh"] = 2] = "Macintosh";
      OperatingSystem2[OperatingSystem2["Linux"] = 3] = "Linux";
    })(OperatingSystem || (OperatingSystem = {}));
    OS = _isMacintosh || _isIOS ? 2 : _isWindows ? 1 : 3;
    _isLittleEndian = true;
    _isLittleEndianComputed = false;
    __name(isLittleEndian, "isLittleEndian");
    __name3(isLittleEndian, "isLittleEndian");
    isChrome = !!(userAgent && userAgent.indexOf("Chrome") >= 0);
    isFirefox = !!(userAgent && userAgent.indexOf("Firefox") >= 0);
    isSafari = !!(!isChrome && (userAgent && userAgent.indexOf("Safari") >= 0));
    isEdge = !!(userAgent && userAgent.indexOf("Edg/") >= 0);
    isAndroid = !!(userAgent && userAgent.indexOf("Android") >= 0);
    __name(isTahoeOrNewer, "isTahoeOrNewer");
    __name3(isTahoeOrNewer, "isTahoeOrNewer");
  }
});

// ../Output/Target/Microsoft/VSCode/vs/base/common/process.js
var safeProcess, vscodeGlobal, cwd, env, platform2, arch;
var init_process = __esm({
  "../Output/Target/Microsoft/VSCode/vs/base/common/process.js"() {
    "use strict";
    init_platform();
    vscodeGlobal = globalThis.vscode;
    if (typeof vscodeGlobal !== "undefined" && typeof vscodeGlobal.process !== "undefined") {
      const sandboxProcess = vscodeGlobal.process;
      safeProcess = {
        get platform() {
          return sandboxProcess.platform;
        },
        get arch() {
          return sandboxProcess.arch;
        },
        get env() {
          return sandboxProcess.env;
        },
        cwd() {
          return sandboxProcess.cwd();
        }
      };
    } else if (typeof process !== "undefined" && typeof process?.versions?.node === "string") {
      safeProcess = {
        get platform() {
          return process.platform;
        },
        get arch() {
          return process.arch;
        },
        get env() {
          return process.env;
        },
        cwd() {
          return process.env["VSCODE_CWD"] || process.cwd();
        }
      };
    } else {
      safeProcess = {
        // Supported
        get platform() {
          return isWindows ? "win32" : isMacintosh ? "darwin" : "linux";
        },
        get arch() {
          return void 0;
        },
        // Unsupported
        get env() {
          return {};
        },
        cwd() {
          return "/";
        }
      };
    }
    cwd = safeProcess.cwd;
    env = safeProcess.env;
    platform2 = safeProcess.platform;
    arch = safeProcess.arch;
  }
});

// ../Output/Target/Microsoft/VSCode/vs/base/common/path.js
function validateObject(pathObject, name) {
  if (pathObject === null || typeof pathObject !== "object") {
    throw new ErrorInvalidArgType(name, "Object", pathObject);
  }
}
function validateString(value, name) {
  if (typeof value !== "string") {
    throw new ErrorInvalidArgType(name, "string", value);
  }
}
function isPathSeparator(code) {
  return code === CHAR_FORWARD_SLASH || code === CHAR_BACKWARD_SLASH;
}
function isPosixPathSeparator(code) {
  return code === CHAR_FORWARD_SLASH;
}
function isWindowsDeviceRoot(code) {
  return code >= CHAR_UPPERCASE_A && code <= CHAR_UPPERCASE_Z || code >= CHAR_LOWERCASE_A && code <= CHAR_LOWERCASE_Z;
}
function normalizeString(path, allowAboveRoot, separator, isPathSeparator2) {
  let res = "";
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let code = 0;
  for (let i = 0; i <= path.length; ++i) {
    if (i < path.length) {
      code = path.charCodeAt(i);
    } else if (isPathSeparator2(code)) {
      break;
    } else {
      code = CHAR_FORWARD_SLASH;
    }
    if (isPathSeparator2(code)) {
      if (lastSlash === i - 1 || dots === 1) {
      } else if (dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== CHAR_DOT || res.charCodeAt(res.length - 2) !== CHAR_DOT) {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf(separator);
            if (lastSlashIndex === -1) {
              res = "";
              lastSegmentLength = 0;
            } else {
              res = res.slice(0, lastSlashIndex);
              lastSegmentLength = res.length - 1 - res.lastIndexOf(separator);
            }
            lastSlash = i;
            dots = 0;
            continue;
          } else if (res.length !== 0) {
            res = "";
            lastSegmentLength = 0;
            lastSlash = i;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          res += res.length > 0 ? `${separator}..` : "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) {
          res += `${separator}${path.slice(lastSlash + 1, i)}`;
        } else {
          res = path.slice(lastSlash + 1, i);
        }
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i;
      dots = 0;
    } else if (code === CHAR_DOT && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}
function formatExt(ext) {
  return ext ? `${ext[0] === "." ? "" : "."}${ext}` : "";
}
function _format2(sep2, pathObject) {
  validateObject(pathObject, "pathObject");
  const dir = pathObject.dir || pathObject.root;
  const base = pathObject.base || `${pathObject.name || ""}${formatExt(pathObject.ext)}`;
  if (!dir) {
    return base;
  }
  return dir === pathObject.root ? `${dir}${base}` : `${dir}${sep2}${base}`;
}
var __defProp4, __name4, CHAR_UPPERCASE_A, CHAR_LOWERCASE_A, CHAR_UPPERCASE_Z, CHAR_LOWERCASE_Z, CHAR_DOT, CHAR_FORWARD_SLASH, CHAR_BACKWARD_SLASH, CHAR_COLON, CHAR_QUESTION_MARK, ErrorInvalidArgType, platformIsWin32, win32, posixCwd, posix, normalize, isAbsolute, join, resolve, relative, dirname, basename, extname, format, parse, toNamespacedPath, sep, delimiter;
var init_path = __esm({
  "../Output/Target/Microsoft/VSCode/vs/base/common/path.js"() {
    "use strict";
    init_process();
    __defProp4 = Object.defineProperty;
    __name4 = /* @__PURE__ */ __name((target, value) => __defProp4(target, "name", { value, configurable: true }), "__name");
    CHAR_UPPERCASE_A = 65;
    CHAR_LOWERCASE_A = 97;
    CHAR_UPPERCASE_Z = 90;
    CHAR_LOWERCASE_Z = 122;
    CHAR_DOT = 46;
    CHAR_FORWARD_SLASH = 47;
    CHAR_BACKWARD_SLASH = 92;
    CHAR_COLON = 58;
    CHAR_QUESTION_MARK = 63;
    ErrorInvalidArgType = class extends Error {
      static {
        __name(this, "ErrorInvalidArgType");
      }
      static {
        __name4(this, "ErrorInvalidArgType");
      }
      constructor(name, expected, actual) {
        let determiner;
        if (typeof expected === "string" && expected.indexOf("not ") === 0) {
          determiner = "must not be";
          expected = expected.replace(/^not /, "");
        } else {
          determiner = "must be";
        }
        const type = name.indexOf(".") !== -1 ? "property" : "argument";
        let msg = `The "${name}" ${type} ${determiner} of type ${expected}`;
        msg += `. Received type ${typeof actual}`;
        super(msg);
        this.code = "ERR_INVALID_ARG_TYPE";
      }
    };
    __name(validateObject, "validateObject");
    __name4(validateObject, "validateObject");
    __name(validateString, "validateString");
    __name4(validateString, "validateString");
    platformIsWin32 = platform2 === "win32";
    __name(isPathSeparator, "isPathSeparator");
    __name4(isPathSeparator, "isPathSeparator");
    __name(isPosixPathSeparator, "isPosixPathSeparator");
    __name4(isPosixPathSeparator, "isPosixPathSeparator");
    __name(isWindowsDeviceRoot, "isWindowsDeviceRoot");
    __name4(isWindowsDeviceRoot, "isWindowsDeviceRoot");
    __name(normalizeString, "normalizeString");
    __name4(normalizeString, "normalizeString");
    __name(formatExt, "formatExt");
    __name4(formatExt, "formatExt");
    __name(_format2, "_format");
    __name4(_format2, "_format");
    win32 = {
      // path.resolve([from ...], to)
      resolve(...pathSegments) {
        let resolvedDevice = "";
        let resolvedTail = "";
        let resolvedAbsolute = false;
        for (let i = pathSegments.length - 1; i >= -1; i--) {
          let path;
          if (i >= 0) {
            path = pathSegments[i];
            validateString(path, `paths[${i}]`);
            if (path.length === 0) {
              continue;
            }
          } else if (resolvedDevice.length === 0) {
            path = cwd();
          } else {
            path = env[`=${resolvedDevice}`] || cwd();
            if (path === void 0 || path.slice(0, 2).toLowerCase() !== resolvedDevice.toLowerCase() && path.charCodeAt(2) === CHAR_BACKWARD_SLASH) {
              path = `${resolvedDevice}\\`;
            }
          }
          const len = path.length;
          let rootEnd = 0;
          let device = "";
          let isAbsolute2 = false;
          const code = path.charCodeAt(0);
          if (len === 1) {
            if (isPathSeparator(code)) {
              rootEnd = 1;
              isAbsolute2 = true;
            }
          } else if (isPathSeparator(code)) {
            isAbsolute2 = true;
            if (isPathSeparator(path.charCodeAt(1))) {
              let j = 2;
              let last = j;
              while (j < len && !isPathSeparator(path.charCodeAt(j))) {
                j++;
              }
              if (j < len && j !== last) {
                const firstPart = path.slice(last, j);
                last = j;
                while (j < len && isPathSeparator(path.charCodeAt(j))) {
                  j++;
                }
                if (j < len && j !== last) {
                  last = j;
                  while (j < len && !isPathSeparator(path.charCodeAt(j))) {
                    j++;
                  }
                  if (j === len || j !== last) {
                    device = `\\\\${firstPart}\\${path.slice(last, j)}`;
                    rootEnd = j;
                  }
                }
              }
            } else {
              rootEnd = 1;
            }
          } else if (isWindowsDeviceRoot(code) && path.charCodeAt(1) === CHAR_COLON) {
            device = path.slice(0, 2);
            rootEnd = 2;
            if (len > 2 && isPathSeparator(path.charCodeAt(2))) {
              isAbsolute2 = true;
              rootEnd = 3;
            }
          }
          if (device.length > 0) {
            if (resolvedDevice.length > 0) {
              if (device.toLowerCase() !== resolvedDevice.toLowerCase()) {
                continue;
              }
            } else {
              resolvedDevice = device;
            }
          }
          if (resolvedAbsolute) {
            if (resolvedDevice.length > 0) {
              break;
            }
          } else {
            resolvedTail = `${path.slice(rootEnd)}\\${resolvedTail}`;
            resolvedAbsolute = isAbsolute2;
            if (isAbsolute2 && resolvedDevice.length > 0) {
              break;
            }
          }
        }
        resolvedTail = normalizeString(resolvedTail, !resolvedAbsolute, "\\", isPathSeparator);
        return resolvedAbsolute ? `${resolvedDevice}\\${resolvedTail}` : `${resolvedDevice}${resolvedTail}` || ".";
      },
      normalize(path) {
        validateString(path, "path");
        const len = path.length;
        if (len === 0) {
          return ".";
        }
        let rootEnd = 0;
        let device;
        let isAbsolute2 = false;
        const code = path.charCodeAt(0);
        if (len === 1) {
          return isPosixPathSeparator(code) ? "\\" : path;
        }
        if (isPathSeparator(code)) {
          isAbsolute2 = true;
          if (isPathSeparator(path.charCodeAt(1))) {
            let j = 2;
            let last = j;
            while (j < len && !isPathSeparator(path.charCodeAt(j))) {
              j++;
            }
            if (j < len && j !== last) {
              const firstPart = path.slice(last, j);
              last = j;
              while (j < len && isPathSeparator(path.charCodeAt(j))) {
                j++;
              }
              if (j < len && j !== last) {
                last = j;
                while (j < len && !isPathSeparator(path.charCodeAt(j))) {
                  j++;
                }
                if (j === len) {
                  return `\\\\${firstPart}\\${path.slice(last)}\\`;
                }
                if (j !== last) {
                  device = `\\\\${firstPart}\\${path.slice(last, j)}`;
                  rootEnd = j;
                }
              }
            }
          } else {
            rootEnd = 1;
          }
        } else if (isWindowsDeviceRoot(code) && path.charCodeAt(1) === CHAR_COLON) {
          device = path.slice(0, 2);
          rootEnd = 2;
          if (len > 2 && isPathSeparator(path.charCodeAt(2))) {
            isAbsolute2 = true;
            rootEnd = 3;
          }
        }
        let tail = rootEnd < len ? normalizeString(path.slice(rootEnd), !isAbsolute2, "\\", isPathSeparator) : "";
        if (tail.length === 0 && !isAbsolute2) {
          tail = ".";
        }
        if (tail.length > 0 && isPathSeparator(path.charCodeAt(len - 1))) {
          tail += "\\";
        }
        if (!isAbsolute2 && device === void 0 && path.includes(":")) {
          if (tail.length >= 2 && isWindowsDeviceRoot(tail.charCodeAt(0)) && tail.charCodeAt(1) === CHAR_COLON) {
            return `.\\${tail}`;
          }
          let index = path.indexOf(":");
          do {
            if (index === len - 1 || isPathSeparator(path.charCodeAt(index + 1))) {
              return `.\\${tail}`;
            }
          } while ((index = path.indexOf(":", index + 1)) !== -1);
        }
        if (device === void 0) {
          return isAbsolute2 ? `\\${tail}` : tail;
        }
        return isAbsolute2 ? `${device}\\${tail}` : `${device}${tail}`;
      },
      isAbsolute(path) {
        validateString(path, "path");
        const len = path.length;
        if (len === 0) {
          return false;
        }
        const code = path.charCodeAt(0);
        return isPathSeparator(code) || // Possible device root
        len > 2 && isWindowsDeviceRoot(code) && path.charCodeAt(1) === CHAR_COLON && isPathSeparator(path.charCodeAt(2));
      },
      join(...paths) {
        if (paths.length === 0) {
          return ".";
        }
        let joined;
        let firstPart;
        for (let i = 0; i < paths.length; ++i) {
          const arg = paths[i];
          validateString(arg, "path");
          if (arg.length > 0) {
            if (joined === void 0) {
              joined = firstPart = arg;
            } else {
              joined += `\\${arg}`;
            }
          }
        }
        if (joined === void 0) {
          return ".";
        }
        let needsReplace = true;
        let slashCount = 0;
        if (typeof firstPart === "string" && isPathSeparator(firstPart.charCodeAt(0))) {
          ++slashCount;
          const firstLen = firstPart.length;
          if (firstLen > 1 && isPathSeparator(firstPart.charCodeAt(1))) {
            ++slashCount;
            if (firstLen > 2) {
              if (isPathSeparator(firstPart.charCodeAt(2))) {
                ++slashCount;
              } else {
                needsReplace = false;
              }
            }
          }
        }
        if (needsReplace) {
          while (slashCount < joined.length && isPathSeparator(joined.charCodeAt(slashCount))) {
            slashCount++;
          }
          if (slashCount >= 2) {
            joined = `\\${joined.slice(slashCount)}`;
          }
        }
        return win32.normalize(joined);
      },
      // It will solve the relative path from `from` to `to`, for instance:
      //  from = 'C:\\orandea\\test\\aaa'
      //  to = 'C:\\orandea\\impl\\bbb'
      // The output of the function should be: '..\\..\\impl\\bbb'
      relative(from, to) {
        validateString(from, "from");
        validateString(to, "to");
        if (from === to) {
          return "";
        }
        const fromOrig = win32.resolve(from);
        const toOrig = win32.resolve(to);
        if (fromOrig === toOrig) {
          return "";
        }
        from = fromOrig.toLowerCase();
        to = toOrig.toLowerCase();
        if (from === to) {
          return "";
        }
        if (fromOrig.length !== from.length || toOrig.length !== to.length) {
          const fromSplit = fromOrig.split("\\");
          const toSplit = toOrig.split("\\");
          if (fromSplit[fromSplit.length - 1] === "") {
            fromSplit.pop();
          }
          if (toSplit[toSplit.length - 1] === "") {
            toSplit.pop();
          }
          const fromLen2 = fromSplit.length;
          const toLen2 = toSplit.length;
          const length2 = fromLen2 < toLen2 ? fromLen2 : toLen2;
          let i2;
          for (i2 = 0; i2 < length2; i2++) {
            if (fromSplit[i2].toLowerCase() !== toSplit[i2].toLowerCase()) {
              break;
            }
          }
          if (i2 === 0) {
            return toOrig;
          } else if (i2 === length2) {
            if (toLen2 > length2) {
              return toSplit.slice(i2).join("\\");
            }
            if (fromLen2 > length2) {
              return "..\\".repeat(fromLen2 - 1 - i2) + "..";
            }
            return "";
          }
          return "..\\".repeat(fromLen2 - i2) + toSplit.slice(i2).join("\\");
        }
        let fromStart = 0;
        while (fromStart < from.length && from.charCodeAt(fromStart) === CHAR_BACKWARD_SLASH) {
          fromStart++;
        }
        let fromEnd = from.length;
        while (fromEnd - 1 > fromStart && from.charCodeAt(fromEnd - 1) === CHAR_BACKWARD_SLASH) {
          fromEnd--;
        }
        const fromLen = fromEnd - fromStart;
        let toStart = 0;
        while (toStart < to.length && to.charCodeAt(toStart) === CHAR_BACKWARD_SLASH) {
          toStart++;
        }
        let toEnd = to.length;
        while (toEnd - 1 > toStart && to.charCodeAt(toEnd - 1) === CHAR_BACKWARD_SLASH) {
          toEnd--;
        }
        const toLen = toEnd - toStart;
        const length = fromLen < toLen ? fromLen : toLen;
        let lastCommonSep = -1;
        let i = 0;
        for (; i < length; i++) {
          const fromCode = from.charCodeAt(fromStart + i);
          if (fromCode !== to.charCodeAt(toStart + i)) {
            break;
          } else if (fromCode === CHAR_BACKWARD_SLASH) {
            lastCommonSep = i;
          }
        }
        if (i !== length) {
          if (lastCommonSep === -1) {
            return toOrig;
          }
        } else {
          if (toLen > length) {
            if (to.charCodeAt(toStart + i) === CHAR_BACKWARD_SLASH) {
              return toOrig.slice(toStart + i + 1);
            }
            if (i === 2) {
              return toOrig.slice(toStart + i);
            }
          }
          if (fromLen > length) {
            if (from.charCodeAt(fromStart + i) === CHAR_BACKWARD_SLASH) {
              lastCommonSep = i;
            } else if (i === 2) {
              lastCommonSep = 3;
            }
          }
          if (lastCommonSep === -1) {
            lastCommonSep = 0;
          }
        }
        let out = "";
        for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
          if (i === fromEnd || from.charCodeAt(i) === CHAR_BACKWARD_SLASH) {
            out += out.length === 0 ? ".." : "\\..";
          }
        }
        toStart += lastCommonSep;
        if (out.length > 0) {
          return `${out}${toOrig.slice(toStart, toEnd)}`;
        }
        if (toOrig.charCodeAt(toStart) === CHAR_BACKWARD_SLASH) {
          ++toStart;
        }
        return toOrig.slice(toStart, toEnd);
      },
      toNamespacedPath(path) {
        if (typeof path !== "string" || path.length === 0) {
          return path;
        }
        const resolvedPath = win32.resolve(path);
        if (resolvedPath.length <= 2) {
          return path;
        }
        if (resolvedPath.charCodeAt(0) === CHAR_BACKWARD_SLASH) {
          if (resolvedPath.charCodeAt(1) === CHAR_BACKWARD_SLASH) {
            const code = resolvedPath.charCodeAt(2);
            if (code !== CHAR_QUESTION_MARK && code !== CHAR_DOT) {
              return `\\\\?\\UNC\\${resolvedPath.slice(2)}`;
            }
          }
        } else if (isWindowsDeviceRoot(resolvedPath.charCodeAt(0)) && resolvedPath.charCodeAt(1) === CHAR_COLON && resolvedPath.charCodeAt(2) === CHAR_BACKWARD_SLASH) {
          return `\\\\?\\${resolvedPath}`;
        }
        return resolvedPath;
      },
      dirname(path) {
        validateString(path, "path");
        const len = path.length;
        if (len === 0) {
          return ".";
        }
        let rootEnd = -1;
        let offset = 0;
        const code = path.charCodeAt(0);
        if (len === 1) {
          return isPathSeparator(code) ? path : ".";
        }
        if (isPathSeparator(code)) {
          rootEnd = offset = 1;
          if (isPathSeparator(path.charCodeAt(1))) {
            let j = 2;
            let last = j;
            while (j < len && !isPathSeparator(path.charCodeAt(j))) {
              j++;
            }
            if (j < len && j !== last) {
              last = j;
              while (j < len && isPathSeparator(path.charCodeAt(j))) {
                j++;
              }
              if (j < len && j !== last) {
                last = j;
                while (j < len && !isPathSeparator(path.charCodeAt(j))) {
                  j++;
                }
                if (j === len) {
                  return path;
                }
                if (j !== last) {
                  rootEnd = offset = j + 1;
                }
              }
            }
          }
        } else if (isWindowsDeviceRoot(code) && path.charCodeAt(1) === CHAR_COLON) {
          rootEnd = len > 2 && isPathSeparator(path.charCodeAt(2)) ? 3 : 2;
          offset = rootEnd;
        }
        let end = -1;
        let matchedSlash = true;
        for (let i = len - 1; i >= offset; --i) {
          if (isPathSeparator(path.charCodeAt(i))) {
            if (!matchedSlash) {
              end = i;
              break;
            }
          } else {
            matchedSlash = false;
          }
        }
        if (end === -1) {
          if (rootEnd === -1) {
            return ".";
          }
          end = rootEnd;
        }
        return path.slice(0, end);
      },
      basename(path, suffix) {
        if (suffix !== void 0) {
          validateString(suffix, "suffix");
        }
        validateString(path, "path");
        let start = 0;
        let end = -1;
        let matchedSlash = true;
        let i;
        if (path.length >= 2 && isWindowsDeviceRoot(path.charCodeAt(0)) && path.charCodeAt(1) === CHAR_COLON) {
          start = 2;
        }
        if (suffix !== void 0 && suffix.length > 0 && suffix.length <= path.length) {
          if (suffix === path) {
            return "";
          }
          let extIdx = suffix.length - 1;
          let firstNonSlashEnd = -1;
          for (i = path.length - 1; i >= start; --i) {
            const code = path.charCodeAt(i);
            if (isPathSeparator(code)) {
              if (!matchedSlash) {
                start = i + 1;
                break;
              }
            } else {
              if (firstNonSlashEnd === -1) {
                matchedSlash = false;
                firstNonSlashEnd = i + 1;
              }
              if (extIdx >= 0) {
                if (code === suffix.charCodeAt(extIdx)) {
                  if (--extIdx === -1) {
                    end = i;
                  }
                } else {
                  extIdx = -1;
                  end = firstNonSlashEnd;
                }
              }
            }
          }
          if (start === end) {
            end = firstNonSlashEnd;
          } else if (end === -1) {
            end = path.length;
          }
          return path.slice(start, end);
        }
        for (i = path.length - 1; i >= start; --i) {
          if (isPathSeparator(path.charCodeAt(i))) {
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else if (end === -1) {
            matchedSlash = false;
            end = i + 1;
          }
        }
        if (end === -1) {
          return "";
        }
        return path.slice(start, end);
      },
      extname(path) {
        validateString(path, "path");
        let start = 0;
        let startDot = -1;
        let startPart = 0;
        let end = -1;
        let matchedSlash = true;
        let preDotState = 0;
        if (path.length >= 2 && path.charCodeAt(1) === CHAR_COLON && isWindowsDeviceRoot(path.charCodeAt(0))) {
          start = startPart = 2;
        }
        for (let i = path.length - 1; i >= start; --i) {
          const code = path.charCodeAt(i);
          if (isPathSeparator(code)) {
            if (!matchedSlash) {
              startPart = i + 1;
              break;
            }
            continue;
          }
          if (end === -1) {
            matchedSlash = false;
            end = i + 1;
          }
          if (code === CHAR_DOT) {
            if (startDot === -1) {
              startDot = i;
            } else if (preDotState !== 1) {
              preDotState = 1;
            }
          } else if (startDot !== -1) {
            preDotState = -1;
          }
        }
        if (startDot === -1 || end === -1 || // We saw a non-dot character immediately before the dot
        preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
        preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
          return "";
        }
        return path.slice(startDot, end);
      },
      format: _format2.bind(null, "\\"),
      parse(path) {
        validateString(path, "path");
        const ret = { root: "", dir: "", base: "", ext: "", name: "" };
        if (path.length === 0) {
          return ret;
        }
        const len = path.length;
        let rootEnd = 0;
        let code = path.charCodeAt(0);
        if (len === 1) {
          if (isPathSeparator(code)) {
            ret.root = ret.dir = path;
            return ret;
          }
          ret.base = ret.name = path;
          return ret;
        }
        if (isPathSeparator(code)) {
          rootEnd = 1;
          if (isPathSeparator(path.charCodeAt(1))) {
            let j = 2;
            let last = j;
            while (j < len && !isPathSeparator(path.charCodeAt(j))) {
              j++;
            }
            if (j < len && j !== last) {
              last = j;
              while (j < len && isPathSeparator(path.charCodeAt(j))) {
                j++;
              }
              if (j < len && j !== last) {
                last = j;
                while (j < len && !isPathSeparator(path.charCodeAt(j))) {
                  j++;
                }
                if (j === len) {
                  rootEnd = j;
                } else if (j !== last) {
                  rootEnd = j + 1;
                }
              }
            }
          }
        } else if (isWindowsDeviceRoot(code) && path.charCodeAt(1) === CHAR_COLON) {
          if (len <= 2) {
            ret.root = ret.dir = path;
            return ret;
          }
          rootEnd = 2;
          if (isPathSeparator(path.charCodeAt(2))) {
            if (len === 3) {
              ret.root = ret.dir = path;
              return ret;
            }
            rootEnd = 3;
          }
        }
        if (rootEnd > 0) {
          ret.root = path.slice(0, rootEnd);
        }
        let startDot = -1;
        let startPart = rootEnd;
        let end = -1;
        let matchedSlash = true;
        let i = path.length - 1;
        let preDotState = 0;
        for (; i >= rootEnd; --i) {
          code = path.charCodeAt(i);
          if (isPathSeparator(code)) {
            if (!matchedSlash) {
              startPart = i + 1;
              break;
            }
            continue;
          }
          if (end === -1) {
            matchedSlash = false;
            end = i + 1;
          }
          if (code === CHAR_DOT) {
            if (startDot === -1) {
              startDot = i;
            } else if (preDotState !== 1) {
              preDotState = 1;
            }
          } else if (startDot !== -1) {
            preDotState = -1;
          }
        }
        if (end !== -1) {
          if (startDot === -1 || // We saw a non-dot character immediately before the dot
          preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
          preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
            ret.base = ret.name = path.slice(startPart, end);
          } else {
            ret.name = path.slice(startPart, startDot);
            ret.base = path.slice(startPart, end);
            ret.ext = path.slice(startDot, end);
          }
        }
        if (startPart > 0 && startPart !== rootEnd) {
          ret.dir = path.slice(0, startPart - 1);
        } else {
          ret.dir = ret.root;
        }
        return ret;
      },
      sep: "\\",
      delimiter: ";",
      win32: null,
      posix: null
    };
    posixCwd = (() => {
      if (platformIsWin32) {
        const regexp = /\\/g;
        return () => {
          const cwd2 = cwd().replace(regexp, "/");
          return cwd2.slice(cwd2.indexOf("/"));
        };
      }
      return () => cwd();
    })();
    posix = {
      // path.resolve([from ...], to)
      resolve(...pathSegments) {
        let resolvedPath = "";
        let resolvedAbsolute = false;
        for (let i = pathSegments.length - 1; i >= 0 && !resolvedAbsolute; i--) {
          const path = pathSegments[i];
          validateString(path, `paths[${i}]`);
          if (path.length === 0) {
            continue;
          }
          resolvedPath = `${path}/${resolvedPath}`;
          resolvedAbsolute = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
        }
        if (!resolvedAbsolute) {
          const cwd2 = posixCwd();
          resolvedPath = `${cwd2}/${resolvedPath}`;
          resolvedAbsolute = cwd2.charCodeAt(0) === CHAR_FORWARD_SLASH;
        }
        resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute, "/", isPosixPathSeparator);
        if (resolvedAbsolute) {
          return `/${resolvedPath}`;
        }
        return resolvedPath.length > 0 ? resolvedPath : ".";
      },
      normalize(path) {
        validateString(path, "path");
        if (path.length === 0) {
          return ".";
        }
        const isAbsolute2 = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
        const trailingSeparator = path.charCodeAt(path.length - 1) === CHAR_FORWARD_SLASH;
        path = normalizeString(path, !isAbsolute2, "/", isPosixPathSeparator);
        if (path.length === 0) {
          if (isAbsolute2) {
            return "/";
          }
          return trailingSeparator ? "./" : ".";
        }
        if (trailingSeparator) {
          path += "/";
        }
        return isAbsolute2 ? `/${path}` : path;
      },
      isAbsolute(path) {
        validateString(path, "path");
        return path.length > 0 && path.charCodeAt(0) === CHAR_FORWARD_SLASH;
      },
      join(...paths) {
        if (paths.length === 0) {
          return ".";
        }
        const path = [];
        for (let i = 0; i < paths.length; ++i) {
          const arg = paths[i];
          validateString(arg, "path");
          if (arg.length > 0) {
            path.push(arg);
          }
        }
        if (path.length === 0) {
          return ".";
        }
        return posix.normalize(path.join("/"));
      },
      relative(from, to) {
        validateString(from, "from");
        validateString(to, "to");
        if (from === to) {
          return "";
        }
        from = posix.resolve(from);
        to = posix.resolve(to);
        if (from === to) {
          return "";
        }
        const fromStart = 1;
        const fromEnd = from.length;
        const fromLen = fromEnd - fromStart;
        const toStart = 1;
        const toLen = to.length - toStart;
        const length = fromLen < toLen ? fromLen : toLen;
        let lastCommonSep = -1;
        let i = 0;
        for (; i < length; i++) {
          const fromCode = from.charCodeAt(fromStart + i);
          if (fromCode !== to.charCodeAt(toStart + i)) {
            break;
          } else if (fromCode === CHAR_FORWARD_SLASH) {
            lastCommonSep = i;
          }
        }
        if (i === length) {
          if (toLen > length) {
            if (to.charCodeAt(toStart + i) === CHAR_FORWARD_SLASH) {
              return to.slice(toStart + i + 1);
            }
            if (i === 0) {
              return to.slice(toStart + i);
            }
          } else if (fromLen > length) {
            if (from.charCodeAt(fromStart + i) === CHAR_FORWARD_SLASH) {
              lastCommonSep = i;
            } else if (i === 0) {
              lastCommonSep = 0;
            }
          }
        }
        let out = "";
        for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
          if (i === fromEnd || from.charCodeAt(i) === CHAR_FORWARD_SLASH) {
            out += out.length === 0 ? ".." : "/..";
          }
        }
        return `${out}${to.slice(toStart + lastCommonSep)}`;
      },
      toNamespacedPath(path) {
        return path;
      },
      dirname(path) {
        validateString(path, "path");
        if (path.length === 0) {
          return ".";
        }
        const hasRoot = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
        let end = -1;
        let matchedSlash = true;
        for (let i = path.length - 1; i >= 1; --i) {
          if (path.charCodeAt(i) === CHAR_FORWARD_SLASH) {
            if (!matchedSlash) {
              end = i;
              break;
            }
          } else {
            matchedSlash = false;
          }
        }
        if (end === -1) {
          return hasRoot ? "/" : ".";
        }
        if (hasRoot && end === 1) {
          return "//";
        }
        return path.slice(0, end);
      },
      basename(path, suffix) {
        if (suffix !== void 0) {
          validateString(suffix, "suffix");
        }
        validateString(path, "path");
        let start = 0;
        let end = -1;
        let matchedSlash = true;
        let i;
        if (suffix !== void 0 && suffix.length > 0 && suffix.length <= path.length) {
          if (suffix === path) {
            return "";
          }
          let extIdx = suffix.length - 1;
          let firstNonSlashEnd = -1;
          for (i = path.length - 1; i >= 0; --i) {
            const code = path.charCodeAt(i);
            if (code === CHAR_FORWARD_SLASH) {
              if (!matchedSlash) {
                start = i + 1;
                break;
              }
            } else {
              if (firstNonSlashEnd === -1) {
                matchedSlash = false;
                firstNonSlashEnd = i + 1;
              }
              if (extIdx >= 0) {
                if (code === suffix.charCodeAt(extIdx)) {
                  if (--extIdx === -1) {
                    end = i;
                  }
                } else {
                  extIdx = -1;
                  end = firstNonSlashEnd;
                }
              }
            }
          }
          if (start === end) {
            end = firstNonSlashEnd;
          } else if (end === -1) {
            end = path.length;
          }
          return path.slice(start, end);
        }
        for (i = path.length - 1; i >= 0; --i) {
          if (path.charCodeAt(i) === CHAR_FORWARD_SLASH) {
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else if (end === -1) {
            matchedSlash = false;
            end = i + 1;
          }
        }
        if (end === -1) {
          return "";
        }
        return path.slice(start, end);
      },
      extname(path) {
        validateString(path, "path");
        let startDot = -1;
        let startPart = 0;
        let end = -1;
        let matchedSlash = true;
        let preDotState = 0;
        for (let i = path.length - 1; i >= 0; --i) {
          const char = path[i];
          if (char === "/") {
            if (!matchedSlash) {
              startPart = i + 1;
              break;
            }
            continue;
          }
          if (end === -1) {
            matchedSlash = false;
            end = i + 1;
          }
          if (char === ".") {
            if (startDot === -1) {
              startDot = i;
            } else if (preDotState !== 1) {
              preDotState = 1;
            }
          } else if (startDot !== -1) {
            preDotState = -1;
          }
        }
        if (startDot === -1 || end === -1 || // We saw a non-dot character immediately before the dot
        preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
        preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
          return "";
        }
        return path.slice(startDot, end);
      },
      format: _format2.bind(null, "/"),
      parse(path) {
        validateString(path, "path");
        const ret = { root: "", dir: "", base: "", ext: "", name: "" };
        if (path.length === 0) {
          return ret;
        }
        const isAbsolute2 = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
        let start;
        if (isAbsolute2) {
          ret.root = "/";
          start = 1;
        } else {
          start = 0;
        }
        let startDot = -1;
        let startPart = 0;
        let end = -1;
        let matchedSlash = true;
        let i = path.length - 1;
        let preDotState = 0;
        for (; i >= start; --i) {
          const code = path.charCodeAt(i);
          if (code === CHAR_FORWARD_SLASH) {
            if (!matchedSlash) {
              startPart = i + 1;
              break;
            }
            continue;
          }
          if (end === -1) {
            matchedSlash = false;
            end = i + 1;
          }
          if (code === CHAR_DOT) {
            if (startDot === -1) {
              startDot = i;
            } else if (preDotState !== 1) {
              preDotState = 1;
            }
          } else if (startDot !== -1) {
            preDotState = -1;
          }
        }
        if (end !== -1) {
          const start2 = startPart === 0 && isAbsolute2 ? 1 : startPart;
          if (startDot === -1 || // We saw a non-dot character immediately before the dot
          preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
          preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
            ret.base = ret.name = path.slice(start2, end);
          } else {
            ret.name = path.slice(start2, startDot);
            ret.base = path.slice(start2, end);
            ret.ext = path.slice(startDot, end);
          }
        }
        if (startPart > 0) {
          ret.dir = path.slice(0, startPart - 1);
        } else if (isAbsolute2) {
          ret.dir = "/";
        }
        return ret;
      },
      sep: "/",
      delimiter: ":",
      win32: null,
      posix: null
    };
    posix.win32 = win32.win32 = win32;
    posix.posix = win32.posix = posix;
    normalize = platformIsWin32 ? win32.normalize : posix.normalize;
    isAbsolute = platformIsWin32 ? win32.isAbsolute : posix.isAbsolute;
    join = platformIsWin32 ? win32.join : posix.join;
    resolve = platformIsWin32 ? win32.resolve : posix.resolve;
    relative = platformIsWin32 ? win32.relative : posix.relative;
    dirname = platformIsWin32 ? win32.dirname : posix.dirname;
    basename = platformIsWin32 ? win32.basename : posix.basename;
    extname = platformIsWin32 ? win32.extname : posix.extname;
    format = platformIsWin32 ? win32.format : posix.format;
    parse = platformIsWin32 ? win32.parse : posix.parse;
    toNamespacedPath = platformIsWin32 ? win32.toNamespacedPath : posix.toNamespacedPath;
    sep = platformIsWin32 ? win32.sep : posix.sep;
    delimiter = platformIsWin32 ? win32.delimiter : posix.delimiter;
  }
});

// ../Output/Target/Microsoft/VSCode/vs/base/common/uri.js
var uri_exports = {};
__export(uri_exports, {
  URI: () => URI,
  isUriComponents: () => isUriComponents,
  uriToFsPath: () => uriToFsPath
});
function _validateUri(ret, _strict) {
  if (!ret.scheme && _strict) {
    throw new Error(`[UriError]: Scheme is missing: {scheme: "", authority: "${ret.authority}", path: "${ret.path}", query: "${ret.query}", fragment: "${ret.fragment}"}`);
  }
  if (ret.scheme && !_schemePattern.test(ret.scheme)) {
    const matches = [...ret.scheme.matchAll(/[^\w\d+.-]/gu)];
    const detail = matches.length > 0 ? ` Found '${matches[0][0]}' at index ${matches[0].index} (${matches.length} total)` : "";
    throw new Error(`[UriError]: Scheme contains illegal characters.${detail} (len:${ret.scheme.length})`);
  }
  if (ret.path) {
    if (ret.authority) {
      if (!_singleSlashStart.test(ret.path)) {
        throw new Error('[UriError]: If a URI contains an authority component, then the path component must either be empty or begin with a slash ("/") character');
      }
    } else {
      if (_doubleSlashStart.test(ret.path)) {
        throw new Error('[UriError]: If a URI does not contain an authority component, then the path cannot begin with two slash characters ("//")');
      }
    }
  }
}
function _schemeFix(scheme, _strict) {
  if (!scheme && !_strict) {
    return "file";
  }
  return scheme;
}
function _referenceResolution(scheme, path) {
  switch (scheme) {
    case "https":
    case "http":
    case "file":
      if (!path) {
        path = _slash;
      } else if (path[0] !== _slash) {
        path = _slash + path;
      }
      break;
  }
  return path;
}
function isUriComponents(thing) {
  if (!thing || typeof thing !== "object") {
    return false;
  }
  return typeof thing.scheme === "string" && (typeof thing.authority === "string" || typeof thing.authority === "undefined") && (typeof thing.path === "string" || typeof thing.path === "undefined") && (typeof thing.query === "string" || typeof thing.query === "undefined") && (typeof thing.fragment === "string" || typeof thing.fragment === "undefined");
}
function encodeURIComponentFast(uriComponent, isPath, isAuthority) {
  let res = void 0;
  let nativeEncodePos = -1;
  for (let pos = 0; pos < uriComponent.length; pos++) {
    const code = uriComponent.charCodeAt(pos);
    if (code >= 97 && code <= 122 || code >= 65 && code <= 90 || code >= 48 && code <= 57 || code === 45 || code === 46 || code === 95 || code === 126 || isPath && code === 47 || isAuthority && code === 91 || isAuthority && code === 93 || isAuthority && code === 58) {
      if (nativeEncodePos !== -1) {
        res += encodeURIComponent(uriComponent.substring(nativeEncodePos, pos));
        nativeEncodePos = -1;
      }
      if (res !== void 0) {
        res += uriComponent.charAt(pos);
      }
    } else {
      if (res === void 0) {
        res = uriComponent.substr(0, pos);
      }
      const escaped = encodeTable[code];
      if (escaped !== void 0) {
        if (nativeEncodePos !== -1) {
          res += encodeURIComponent(uriComponent.substring(nativeEncodePos, pos));
          nativeEncodePos = -1;
        }
        res += escaped;
      } else if (nativeEncodePos === -1) {
        nativeEncodePos = pos;
      }
    }
  }
  if (nativeEncodePos !== -1) {
    res += encodeURIComponent(uriComponent.substring(nativeEncodePos));
  }
  return res !== void 0 ? res : uriComponent;
}
function encodeURIComponentMinimal(path) {
  let res = void 0;
  for (let pos = 0; pos < path.length; pos++) {
    const code = path.charCodeAt(pos);
    if (code === 35 || code === 63) {
      if (res === void 0) {
        res = path.substr(0, pos);
      }
      res += encodeTable[code];
    } else {
      if (res !== void 0) {
        res += path[pos];
      }
    }
  }
  return res !== void 0 ? res : path;
}
function uriToFsPath(uri, keepDriveLetterCasing) {
  let value;
  if (uri.authority && uri.path.length > 1 && uri.scheme === "file") {
    value = `//${uri.authority}${uri.path}`;
  } else if (uri.path.charCodeAt(0) === 47 && (uri.path.charCodeAt(1) >= 65 && uri.path.charCodeAt(1) <= 90 || uri.path.charCodeAt(1) >= 97 && uri.path.charCodeAt(1) <= 122) && uri.path.charCodeAt(2) === 58) {
    if (!keepDriveLetterCasing) {
      value = uri.path[1].toLowerCase() + uri.path.substr(2);
    } else {
      value = uri.path.substr(1);
    }
  } else {
    value = uri.path;
  }
  if (isWindows) {
    value = value.replace(/\//g, "\\");
  }
  return value;
}
function _asFormatted(uri, skipEncoding) {
  const encoder = !skipEncoding ? encodeURIComponentFast : encodeURIComponentMinimal;
  let res = "";
  let { scheme, authority, path, query, fragment } = uri;
  if (scheme) {
    res += scheme;
    res += ":";
  }
  if (authority || scheme === "file") {
    res += _slash;
    res += _slash;
  }
  if (authority) {
    let idx = authority.indexOf("@");
    if (idx !== -1) {
      const userinfo = authority.substr(0, idx);
      authority = authority.substr(idx + 1);
      idx = userinfo.lastIndexOf(":");
      if (idx === -1) {
        res += encoder(userinfo, false, false);
      } else {
        res += encoder(userinfo.substr(0, idx), false, false);
        res += ":";
        res += encoder(userinfo.substr(idx + 1), false, true);
      }
      res += "@";
    }
    authority = authority.toLowerCase();
    idx = authority.lastIndexOf(":");
    if (idx === -1) {
      res += encoder(authority, false, true);
    } else {
      res += encoder(authority.substr(0, idx), false, true);
      res += authority.substr(idx);
    }
  }
  if (path) {
    if (path.length >= 3 && path.charCodeAt(0) === 47 && path.charCodeAt(2) === 58) {
      const code = path.charCodeAt(1);
      if (code >= 65 && code <= 90) {
        path = `/${String.fromCharCode(code + 32)}:${path.substr(3)}`;
      }
    } else if (path.length >= 2 && path.charCodeAt(1) === 58) {
      const code = path.charCodeAt(0);
      if (code >= 65 && code <= 90) {
        path = `${String.fromCharCode(code + 32)}:${path.substr(2)}`;
      }
    }
    res += encoder(path, true, false);
  }
  if (query) {
    res += "?";
    res += encoder(query, false, false);
  }
  if (fragment) {
    res += "#";
    res += !skipEncoding ? encodeURIComponentFast(fragment, false, false) : fragment;
  }
  return res;
}
function decodeURIComponentGraceful(str) {
  try {
    return decodeURIComponent(str);
  } catch {
    if (str.length > 3) {
      return str.substr(0, 3) + decodeURIComponentGraceful(str.substr(3));
    } else {
      return str;
    }
  }
}
function percentDecode(str) {
  if (!str.match(_rEncodedAsHex)) {
    return str;
  }
  return str.replace(_rEncodedAsHex, (match) => decodeURIComponentGraceful(match));
}
var __defProp5, __name5, _schemePattern, _singleSlashStart, _doubleSlashStart, _empty, _slash, _regexp, URI, _pathSepMarker, Uri, encodeTable, _rEncodedAsHex;
var init_uri = __esm({
  "../Output/Target/Microsoft/VSCode/vs/base/common/uri.js"() {
    "use strict";
    init_path();
    init_platform();
    __defProp5 = Object.defineProperty;
    __name5 = /* @__PURE__ */ __name((target, value) => __defProp5(target, "name", { value, configurable: true }), "__name");
    _schemePattern = /^\w[\w\d+.-]*$/;
    _singleSlashStart = /^\//;
    _doubleSlashStart = /^\/\//;
    __name(_validateUri, "_validateUri");
    __name5(_validateUri, "_validateUri");
    __name(_schemeFix, "_schemeFix");
    __name5(_schemeFix, "_schemeFix");
    __name(_referenceResolution, "_referenceResolution");
    __name5(_referenceResolution, "_referenceResolution");
    _empty = "";
    _slash = "/";
    _regexp = /^(([^:/?#]+?):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;
    URI = class _URI {
      static {
        __name(this, "URI");
      }
      static {
        __name5(this, "URI");
      }
      static isUri(thing) {
        if (thing instanceof _URI) {
          return true;
        }
        if (!thing || typeof thing !== "object") {
          return false;
        }
        return typeof thing.authority === "string" && typeof thing.fragment === "string" && typeof thing.path === "string" && typeof thing.query === "string" && typeof thing.scheme === "string" && typeof thing.fsPath === "string" && typeof thing.with === "function" && typeof thing.toString === "function";
      }
      /**
       * @internal
       */
      constructor(schemeOrData, authority, path, query, fragment, _strict = false) {
        if (typeof schemeOrData === "object") {
          this.scheme = schemeOrData.scheme || _empty;
          this.authority = schemeOrData.authority || _empty;
          this.path = schemeOrData.path || _empty;
          this.query = schemeOrData.query || _empty;
          this.fragment = schemeOrData.fragment || _empty;
        } else {
          this.scheme = _schemeFix(schemeOrData, _strict);
          this.authority = authority || _empty;
          this.path = _referenceResolution(this.scheme, path || _empty);
          this.query = query || _empty;
          this.fragment = fragment || _empty;
          _validateUri(this, _strict);
        }
      }
      // ---- filesystem path -----------------------
      /**
       * Returns a string representing the corresponding file system path of this URI.
       * Will handle UNC paths, normalizes windows drive letters to lower-case, and uses the
       * platform specific path separator.
       *
       * * Will *not* validate the path for invalid characters and semantics.
       * * Will *not* look at the scheme of this URI.
       * * The result shall *not* be used for display purposes but for accessing a file on disk.
       *
       *
       * The *difference* to `URI#path` is the use of the platform specific separator and the handling
       * of UNC paths. See the below sample of a file-uri with an authority (UNC path).
       *
       * ```ts
          const u = URI.parse('file://server/c$/folder/file.txt')
          u.authority === 'server'
          u.path === '/shares/c$/file.txt'
          u.fsPath === '\\server\c$\folder\file.txt'
      ```
       *
       * Using `URI#path` to read a file (using fs-apis) would not be enough because parts of the path,
       * namely the server name, would be missing. Therefore `URI#fsPath` exists - it's sugar to ease working
       * with URIs that represent files on disk (`file` scheme).
       */
      get fsPath() {
        return uriToFsPath(this, false);
      }
      // ---- modify to new -------------------------
      with(change) {
        if (!change) {
          return this;
        }
        let { scheme, authority, path, query, fragment } = change;
        if (scheme === void 0) {
          scheme = this.scheme;
        } else if (scheme === null) {
          scheme = _empty;
        }
        if (authority === void 0) {
          authority = this.authority;
        } else if (authority === null) {
          authority = _empty;
        }
        if (path === void 0) {
          path = this.path;
        } else if (path === null) {
          path = _empty;
        }
        if (query === void 0) {
          query = this.query;
        } else if (query === null) {
          query = _empty;
        }
        if (fragment === void 0) {
          fragment = this.fragment;
        } else if (fragment === null) {
          fragment = _empty;
        }
        if (scheme === this.scheme && authority === this.authority && path === this.path && query === this.query && fragment === this.fragment) {
          return this;
        }
        return new Uri(scheme, authority, path, query, fragment);
      }
      // ---- parse & validate ------------------------
      /**
       * Creates a new URI from a string, e.g. `http://www.example.com/some/path`,
       * `file:///usr/home`, or `scheme:with/path`.
       *
       * @param value A string which represents an URI (see `URI#toString`).
       */
      static parse(value, _strict = false) {
        const match = _regexp.exec(value);
        if (!match) {
          return new Uri(_empty, _empty, _empty, _empty, _empty);
        }
        return new Uri(match[2] || _empty, percentDecode(match[4] || _empty), percentDecode(match[5] || _empty), percentDecode(match[7] || _empty), percentDecode(match[9] || _empty), _strict);
      }
      /**
       * Creates a new URI from a file system path, e.g. `c:\my\files`,
       * `/usr/home`, or `\\server\share\some\path`.
       *
       * The *difference* between `URI#parse` and `URI#file` is that the latter treats the argument
       * as path, not as stringified-uri. E.g. `URI.file(path)` is **not the same as**
       * `URI.parse('file://' + path)` because the path might contain characters that are
       * interpreted (# and ?). See the following sample:
       * ```ts
      const good = URI.file('/coding/c#/project1');
      good.scheme === 'file';
      good.path === '/coding/c#/project1';
      good.fragment === '';
      const bad = URI.parse('file://' + '/coding/c#/project1');
      bad.scheme === 'file';
      bad.path === '/coding/c'; // path is now broken
      bad.fragment === '/project1';
      ```
       *
       * @param path A file system path (see `URI#fsPath`)
       */
      static file(path) {
        let authority = _empty;
        if (isWindows) {
          path = path.replace(/\\/g, _slash);
        }
        if (path[0] === _slash && path[1] === _slash) {
          const idx = path.indexOf(_slash, 2);
          if (idx === -1) {
            authority = path.substring(2);
            path = _slash;
          } else {
            authority = path.substring(2, idx);
            path = path.substring(idx) || _slash;
          }
        }
        return new Uri("file", authority, path, _empty, _empty);
      }
      /**
       * Creates new URI from uri components.
       *
       * Unless `strict` is `true` the scheme is defaults to be `file`. This function performs
       * validation and should be used for untrusted uri components retrieved from storage,
       * user input, command arguments etc
       */
      static from(components, strict) {
        const result = new Uri(components.scheme, components.authority, components.path, components.query, components.fragment, strict);
        return result;
      }
      /**
       * Join a URI path with path fragments and normalizes the resulting path.
       *
       * @param uri The input URI.
       * @param pathFragment The path fragment to add to the URI path.
       * @returns The resulting URI.
       */
      static joinPath(uri, ...pathFragment) {
        if (!uri.path) {
          throw new Error(`[UriError]: cannot call joinPath on URI without path: ${uri.toString()}`);
        }
        let newPath;
        if (isWindows && uri.scheme === "file") {
          newPath = _URI.file(win32.join(uriToFsPath(uri, true), ...pathFragment)).path;
        } else {
          newPath = posix.join(uri.path, ...pathFragment);
        }
        return uri.with({ path: newPath });
      }
      // ---- printing/externalize ---------------------------
      /**
       * Creates a string representation for this URI. It's guaranteed that calling
       * `URI.parse` with the result of this function creates an URI which is equal
       * to this URI.
       *
       * * The result shall *not* be used for display purposes but for externalization or transport.
       * * The result will be encoded using the percentage encoding and encoding happens mostly
       * ignore the scheme-specific encoding rules.
       *
       * @param skipEncoding Do not encode the result, default is `false`
       */
      toString(skipEncoding = false) {
        return _asFormatted(this, skipEncoding);
      }
      toJSON() {
        return this;
      }
      static revive(data) {
        if (!data) {
          return data;
        } else if (data instanceof _URI) {
          return data;
        } else {
          const result = new Uri(data);
          result._formatted = data.external ?? null;
          result._fsPath = data._sep === _pathSepMarker ? data.fsPath ?? null : null;
          return result;
        }
      }
      [/* @__PURE__ */ Symbol.for("debug.description")]() {
        return `URI(${this.toString()})`;
      }
    };
    __name(isUriComponents, "isUriComponents");
    __name5(isUriComponents, "isUriComponents");
    _pathSepMarker = isWindows ? 1 : void 0;
    Uri = class extends URI {
      static {
        __name(this, "Uri");
      }
      static {
        __name5(this, "Uri");
      }
      constructor() {
        super(...arguments);
        this._formatted = null;
        this._fsPath = null;
      }
      get fsPath() {
        if (!this._fsPath) {
          this._fsPath = uriToFsPath(this, false);
        }
        return this._fsPath;
      }
      toString(skipEncoding = false) {
        if (!skipEncoding) {
          if (!this._formatted) {
            this._formatted = _asFormatted(this, false);
          }
          return this._formatted;
        } else {
          return _asFormatted(this, true);
        }
      }
      toJSON() {
        const res = {
          $mid: 1
          /* MarshalledId.Uri */
        };
        if (this._fsPath) {
          res.fsPath = this._fsPath;
          res._sep = _pathSepMarker;
        }
        if (this._formatted) {
          res.external = this._formatted;
        }
        if (this.path) {
          res.path = this.path;
        }
        if (this.scheme) {
          res.scheme = this.scheme;
        }
        if (this.authority) {
          res.authority = this.authority;
        }
        if (this.query) {
          res.query = this.query;
        }
        if (this.fragment) {
          res.fragment = this.fragment;
        }
        return res;
      }
    };
    encodeTable = {
      [
        58
        /* CharCode.Colon */
      ]: "%3A",
      // gen-delims
      [
        47
        /* CharCode.Slash */
      ]: "%2F",
      [
        63
        /* CharCode.QuestionMark */
      ]: "%3F",
      [
        35
        /* CharCode.Hash */
      ]: "%23",
      [
        91
        /* CharCode.OpenSquareBracket */
      ]: "%5B",
      [
        93
        /* CharCode.CloseSquareBracket */
      ]: "%5D",
      [
        64
        /* CharCode.AtSign */
      ]: "%40",
      [
        33
        /* CharCode.ExclamationMark */
      ]: "%21",
      // sub-delims
      [
        36
        /* CharCode.DollarSign */
      ]: "%24",
      [
        38
        /* CharCode.Ampersand */
      ]: "%26",
      [
        39
        /* CharCode.SingleQuote */
      ]: "%27",
      [
        40
        /* CharCode.OpenParen */
      ]: "%28",
      [
        41
        /* CharCode.CloseParen */
      ]: "%29",
      [
        42
        /* CharCode.Asterisk */
      ]: "%2A",
      [
        43
        /* CharCode.Plus */
      ]: "%2B",
      [
        44
        /* CharCode.Comma */
      ]: "%2C",
      [
        59
        /* CharCode.Semicolon */
      ]: "%3B",
      [
        61
        /* CharCode.Equals */
      ]: "%3D",
      [
        32
        /* CharCode.Space */
      ]: "%20"
    };
    __name(encodeURIComponentFast, "encodeURIComponentFast");
    __name5(encodeURIComponentFast, "encodeURIComponentFast");
    __name(encodeURIComponentMinimal, "encodeURIComponentMinimal");
    __name5(encodeURIComponentMinimal, "encodeURIComponentMinimal");
    __name(uriToFsPath, "uriToFsPath");
    __name5(uriToFsPath, "uriToFsPath");
    __name(_asFormatted, "_asFormatted");
    __name5(_asFormatted, "_asFormatted");
    __name(decodeURIComponentGraceful, "decodeURIComponentGraceful");
    __name5(decodeURIComponentGraceful, "decodeURIComponentGraceful");
    _rEncodedAsHex = /(%[0-9A-Za-z][0-9A-Za-z])+/g;
    __name(percentDecode, "percentDecode");
    __name5(percentDecode, "percentDecode");
  }
});

// Source/IPC/TypeConverter.ts
import { Effect } from "effect";
var { URI: URI2 } = await Promise.resolve().then(() => (init_uri(), uri_exports));
var MIN_ZOOM_LEVEL = -20;
var MAX_ZOOM_LEVEL = 20;
var MAX_DOCUMENT_LINES = 1e6;
var MAX_LINE_LENGTH = 1e5;
var MAX_LANGUAGE_ID_LENGTH = 128;
var MAX_TERMINAL_NAME_LENGTH = 128;
var MAX_SHELL_PATH_LENGTH = 1024;
var MAX_SHELL_ARGUMENTS = 100;
var MAX_ARGUMENT_LENGTH = 4096;
var MAX_WEBVIEW_TITLE_LENGTH = 256;
var MAX_VIEW_TYPE_LENGTH = 128;
var MAX_HANDLE_LENGTH = 128;
var MAX_SIDECAR_IDENTIFIER_LENGTH = 128;
var MAX_EXTENSION_IDENTIFIER_LENGTH = 128;
var ValidateWindowStateDTO = /* @__PURE__ */ __name((dto) => Effect.gen(function* () {
  if (typeof dto.IsFocused !== "boolean") {
    return yield* Effect.fail(
      new Error("WindowStateDTO.IsFocused must be a boolean")
    );
  }
  if (typeof dto.IsFullScreen !== "boolean") {
    return yield* Effect.fail(
      new Error("WindowStateDTO.IsFullScreen must be a boolean")
    );
  }
  if (typeof dto.ZoomLevel !== "number") {
    return yield* Effect.fail(
      new Error("WindowStateDTO.ZoomLevel must be a number")
    );
  }
  if (dto.ZoomLevel < MIN_ZOOM_LEVEL || dto.ZoomLevel > MAX_ZOOM_LEVEL) {
    return yield* Effect.fail(
      new Error(
        `WindowStateDTO.ZoomLevel must be between ${MIN_ZOOM_LEVEL} and ${MAX_ZOOM_LEVEL}, got ${dto.ZoomLevel}`
      )
    );
  }
  return dto;
}), "ValidateWindowStateDTO");
var ValidateDocumentStateDTO = /* @__PURE__ */ __name((dto) => Effect.gen(function* () {
  if (typeof dto.URI !== "string" || dto.URI.trim().length === 0) {
    return yield* Effect.fail(
      new Error("DocumentStateDTO.URI cannot be empty")
    );
  }
  try {
    new URL(dto.URI);
  } catch {
    return yield* Effect.fail(
      new Error(
        `DocumentStateDTO.URI has invalid format: ${dto.URI}`
      )
    );
  }
  if (typeof dto.LanguageIdentifier !== "string") {
    return yield* Effect.fail(
      new Error(
        "DocumentStateDTO.LanguageIdentifier must be a string"
      )
    );
  }
  if (dto.LanguageIdentifier.length > MAX_LANGUAGE_ID_LENGTH) {
    return yield* Effect.fail(
      new Error(
        `DocumentStateDTO.LanguageIdentifier exceeds maximum length of ${MAX_LANGUAGE_ID_LENGTH} bytes`
      )
    );
  }
  if (typeof dto.Version !== "number" || dto.Version < 1) {
    return yield* Effect.fail(
      new Error("DocumentStateDTO.Version must be a positive number")
    );
  }
  if (!Array.isArray(dto.Lines)) {
    return yield* Effect.fail(
      new Error("DocumentStateDTO.Lines must be an array")
    );
  }
  if (dto.Lines.length > MAX_DOCUMENT_LINES) {
    return yield* Effect.fail(
      new Error(
        `DocumentStateDTO.Lines exceeds maximum line count of ${MAX_DOCUMENT_LINES}`
      )
    );
  }
  for (let i = 0; i < dto.Lines.length; i++) {
    const line = dto.Lines[i];
    if (typeof line !== "string") {
      return yield* Effect.fail(
        new Error(`DocumentStateDTO.Lines[${i}] must be a string`)
      );
    }
    if (line.length > MAX_LINE_LENGTH) {
      return yield* Effect.fail(
        new Error(
          `DocumentStateDTO.Lines[${i}] exceeds maximum length of ${MAX_LINE_LENGTH} bytes`
        )
      );
    }
  }
  if (dto.EOL !== "\n" && dto.EOL !== "\r\n") {
    return yield* Effect.fail(
      new Error(
        "DocumentStateDTO.EOL must be either '\\n' or '\\r\\n'"
      )
    );
  }
  if (typeof dto.IsDirty !== "boolean") {
    return yield* Effect.fail(
      new Error("DocumentStateDTO.IsDirty must be a boolean")
    );
  }
  if (typeof dto.Encoding !== "string" || dto.Encoding.length === 0) {
    return yield* Effect.fail(
      new Error("DocumentStateDTO.Encoding cannot be empty")
    );
  }
  return dto;
}), "ValidateDocumentStateDTO");
var ValidateWebviewStateDTO = /* @__PURE__ */ __name((dto) => Effect.gen(function* () {
  if (typeof dto.Handle !== "string" || dto.Handle.trim().length === 0) {
    return yield* Effect.fail(
      new Error("WebviewStateDTO.Handle cannot be empty")
    );
  }
  if (dto.Handle.length > MAX_HANDLE_LENGTH) {
    return yield* Effect.fail(
      new Error(
        `WebviewStateDTO.Handle exceeds maximum length of ${MAX_HANDLE_LENGTH} bytes`
      )
    );
  }
  if (typeof dto.ViewType !== "string") {
    return yield* Effect.fail(
      new Error("WebviewStateDTO.ViewType must be a string")
    );
  }
  if (dto.ViewType.length > MAX_VIEW_TYPE_LENGTH) {
    return yield* Effect.fail(
      new Error(
        `WebviewStateDTO.ViewType exceeds maximum length of ${MAX_VIEW_TYPE_LENGTH} bytes`
      )
    );
  }
  if (typeof dto.Title !== "string") {
    return yield* Effect.fail(
      new Error("WebviewStateDTO.Title must be a string")
    );
  }
  if (dto.Title.length > MAX_WEBVIEW_TITLE_LENGTH) {
    return yield* Effect.fail(
      new Error(
        `WebviewStateDTO.Title exceeds maximum length of ${MAX_WEBVIEW_TITLE_LENGTH} bytes`
      )
    );
  }
  if (!dto.ContentOptions || typeof dto.ContentOptions !== "object") {
    return yield* Effect.fail(
      new Error("WebviewStateDTO.ContentOptions must be an object")
    );
  }
  if (typeof dto.ContentOptions.EnableScripts !== "boolean") {
    return yield* Effect.fail(
      new Error(
        "WebviewStateDTO.ContentOptions.EnableScripts must be a boolean"
      )
    );
  }
  if (!Array.isArray(dto.ContentOptions.LocalResourceRoots)) {
    return yield* Effect.fail(
      new Error(
        "WebviewStateDTO.ContentOptions.LocalResourceRoots must be an array"
      )
    );
  }
  if (dto.PanelOptions !== null && typeof dto.PanelOptions !== "object") {
    return yield* Effect.fail(
      new Error(
        "WebviewStateDTO.PanelOptions must be an object or null"
      )
    );
  }
  if (typeof dto.SideCarIdentifier !== "string") {
    return yield* Effect.fail(
      new Error("WebviewStateDTO.SideCarIdentifier must be a string")
    );
  }
  if (dto.SideCarIdentifier.length > MAX_SIDECAR_IDENTIFIER_LENGTH) {
    return yield* Effect.fail(
      new Error(
        `WebviewStateDTO.SideCarIdentifier exceeds maximum length of ${MAX_SIDECAR_IDENTIFIER_LENGTH} bytes`
      )
    );
  }
  if (typeof dto.ExtensionIdentifier !== "string") {
    return yield* Effect.fail(
      new Error(
        "WebviewStateDTO.ExtensionIdentifier must be a string"
      )
    );
  }
  if (dto.ExtensionIdentifier.length > MAX_EXTENSION_IDENTIFIER_LENGTH) {
    return yield* Effect.fail(
      new Error(
        `WebviewStateDTO.ExtensionIdentifier exceeds maximum length of ${MAX_EXTENSION_IDENTIFIER_LENGTH} bytes`
      )
    );
  }
  if (typeof dto.IsActive !== "boolean") {
    return yield* Effect.fail(
      new Error("WebviewStateDTO.IsActive must be a boolean")
    );
  }
  if (typeof dto.IsVisible !== "boolean") {
    return yield* Effect.fail(
      new Error("WebviewStateDTO.IsVisible must be a boolean")
    );
  }
  return dto;
}), "ValidateWebviewStateDTO");
var ValidateTerminalStateDTO = /* @__PURE__ */ __name((dto) => Effect.gen(function* () {
  if (typeof dto.Identifier !== "number" || dto.Identifier <= 0) {
    return yield* Effect.fail(
      new Error(
        "TerminalStateDTO.Identifier must be a positive number"
      )
    );
  }
  if (typeof dto.Name !== "string") {
    return yield* Effect.fail(
      new Error("TerminalStateDTO.Name must be a string")
    );
  }
  if (dto.Name.length > MAX_TERMINAL_NAME_LENGTH) {
    return yield* Effect.fail(
      new Error(
        `TerminalStateDTO.Name exceeds maximum length of ${MAX_TERMINAL_NAME_LENGTH} bytes`
      )
    );
  }
  if (typeof dto.ShellPath !== "string") {
    return yield* Effect.fail(
      new Error("TerminalStateDTO.ShellPath must be a string")
    );
  }
  if (dto.ShellPath.length > MAX_SHELL_PATH_LENGTH) {
    return yield* Effect.fail(
      new Error(
        `TerminalStateDTO.ShellPath exceeds maximum length of ${MAX_SHELL_PATH_LENGTH} bytes`
      )
    );
  }
  if (!Array.isArray(dto.ShellArguments)) {
    return yield* Effect.fail(
      new Error("TerminalStateDTO.ShellArguments must be an array")
    );
  }
  if (dto.ShellArguments.length > MAX_SHELL_ARGUMENTS) {
    return yield* Effect.fail(
      new Error(
        `TerminalStateDTO.ShellArguments exceeds maximum count of ${MAX_SHELL_ARGUMENTS}`
      )
    );
  }
  for (let i = 0; i < dto.ShellArguments.length; i++) {
    const arg = dto.ShellArguments[i];
    if (typeof arg !== "string") {
      return yield* Effect.fail(
        new Error(
          `TerminalStateDTO.ShellArguments[${i}] must be a string`
        )
      );
    }
    if (arg.length > MAX_ARGUMENT_LENGTH) {
      return yield* Effect.fail(
        new Error(
          `TerminalStateDTO.ShellArguments[${i}] exceeds maximum length of ${MAX_ARGUMENT_LENGTH} bytes`
        )
      );
    }
  }
  if (typeof dto.IsPTY !== "boolean") {
    return yield* Effect.fail(
      new Error("TerminalStateDTO.IsPTY must be a boolean")
    );
  }
  return dto;
}), "ValidateTerminalStateDTO");
var WindowStateConvertToDTO = /* @__PURE__ */ __name((state) => Effect.gen(function* () {
  const dto = {
    IsFocused: state.isFocused,
    IsFullScreen: state.isFullScreen,
    ZoomLevel: state.zoomLevel
  };
  return yield* ValidateWindowStateDTO(dto);
}), "WindowStateConvertToDTO");
var DocumentStateConvertToDTO = /* @__PURE__ */ __name((state) => Effect.gen(function* () {
  const dto = {
    URI: state.uri.toString(),
    LanguageIdentifier: state.languageIdentifier,
    Version: state.version,
    Lines: state.lines,
    EOL: state.eol,
    IsDirty: state.isDirty,
    Encoding: state.encoding,
    VersionIdentifier: state.versionIdentifier
  };
  return yield* ValidateDocumentStateDTO(dto);
}), "DocumentStateConvertToDTO");
var WebviewStateConvertToDTO = /* @__PURE__ */ __name((state) => Effect.gen(function* () {
  const dto = {
    Handle: state.handle,
    ViewType: state.viewType,
    Title: state.title,
    ContentOptions: {
      EnableScripts: state.contentOptions.enableScripts,
      LocalResourceRoots: state.contentOptions.localResourceRoots
    },
    PanelOptions: state.panelOptions,
    SideCarIdentifier: state.sideCarIdentifier,
    ExtensionIdentifier: state.extensionIdentifier,
    IsActive: state.isActive,
    IsVisible: state.isVisible
  };
  return yield* ValidateWebviewStateDTO(dto);
}), "WebviewStateConvertToDTO");
var TerminalStateConvertToDTO = /* @__PURE__ */ __name((state) => Effect.gen(function* () {
  const dto = {
    Identifier: state.identifier,
    Name: state.name,
    OSProcessIdentifier: state.osProcessIdentifier,
    ShellPath: state.shellPath,
    ShellArguments: state.shellArguments,
    CurrentWorkingDirectory: state.currentWorkingDirectory,
    EnvironmentVariables: state.environmentVariables,
    IsPTY: state.isPTY
  };
  return yield* ValidateTerminalStateDTO(dto);
}), "TerminalStateConvertToDTO");
var WindowStateConvertFromDTO = /* @__PURE__ */ __name((dto) => Effect.gen(function* () {
  const validated = yield* ValidateWindowStateDTO(dto);
  return {
    isFocused: validated.IsFocused,
    isFullScreen: validated.IsFullScreen,
    zoomLevel: validated.ZoomLevel
  };
}), "WindowStateConvertFromDTO");
var DocumentStateConvertFromDTO = /* @__PURE__ */ __name((dto) => Effect.gen(function* () {
  const validated = yield* ValidateDocumentStateDTO(dto);
  const uri = URI2.parse(validated.URI);
  const eol = validated.EOL === "\r\n" ? "\r\n" : "\n";
  return {
    uri,
    languageIdentifier: validated.LanguageIdentifier,
    version: validated.Version,
    lines: validated.Lines,
    eol,
    isDirty: validated.IsDirty,
    encoding: validated.Encoding,
    versionIdentifier: validated.VersionIdentifier
  };
}), "DocumentStateConvertFromDTO");
var WebviewStateConvertFromDTO = /* @__PURE__ */ __name((dto) => Effect.gen(function* () {
  const validated = yield* ValidateWebviewStateDTO(dto);
  return {
    handle: validated.Handle,
    viewType: validated.ViewType,
    title: validated.Title,
    contentOptions: {
      enableScripts: validated.ContentOptions.EnableScripts,
      localResourceRoots: validated.ContentOptions.LocalResourceRoots
    },
    panelOptions: validated.PanelOptions,
    sideCarIdentifier: validated.SideCarIdentifier,
    extensionIdentifier: validated.ExtensionIdentifier,
    isActive: validated.IsActive,
    isVisible: validated.IsVisible
  };
}), "WebviewStateConvertFromDTO");
var TerminalStateConvertFromDTO = /* @__PURE__ */ __name((dto) => Effect.gen(function* () {
  const validated = yield* ValidateTerminalStateDTO(dto);
  return {
    identifier: validated.Identifier,
    name: validated.Name,
    osProcessIdentifier: validated.OSProcessIdentifier,
    shellPath: validated.ShellPath,
    shellArguments: validated.ShellArguments,
    currentWorkingDirectory: validated.CurrentWorkingDirectory,
    environmentVariables: validated.EnvironmentVariables,
    isPTY: validated.IsPTY
  };
}), "TerminalStateConvertFromDTO");
var ValidateDTO = /* @__PURE__ */ __name((dto) => Effect.gen(function* () {
  const typename = dto.__typename || dto.URI ? "DocumentStateDTO" : dto.Handle ? "WebviewStateDTO" : dto.IsFocused !== void 0 ? "WindowStateDTO" : dto.Identifier !== void 0 ? "TerminalStateDTO" : "Unknown";
  switch (typename) {
    case "WindowStateDTO":
      return yield* ValidateWindowStateDTO(
        dto
      );
    case "DocumentStateDTO":
      return yield* ValidateDocumentStateDTO(
        dto
      );
    case "WebviewStateDTO":
      return yield* ValidateWebviewStateDTO(
        dto
      );
    case "TerminalStateDTO":
      return yield* ValidateTerminalStateDTO(
        dto
      );
    default:
      return yield* Effect.fail(
        new Error(
          `Unknown DTO type: ${typename}. Cannot validate.`
        )
      );
  }
}), "ValidateDTO");
export {
  DocumentStateConvertFromDTO,
  DocumentStateConvertToDTO,
  TerminalStateConvertFromDTO,
  TerminalStateConvertToDTO,
  ValidateDTO,
  WebviewStateConvertFromDTO,
  WebviewStateConvertToDTO,
  WindowStateConvertFromDTO,
  WindowStateConvertToDTO
};
//# sourceMappingURL=TypeConverter.js.map
