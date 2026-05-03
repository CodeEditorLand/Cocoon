var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Platform/Logger.ts
var Logger = class {
  static {
    __name(this, "Logger");
  }
  Prefix;
  constructor(Prefix = "Cocoon") {
    this.Prefix = Prefix;
  }
  Info(Message, ...Args) {
    console.log(`[${this.Prefix}] ${Message}`, ...Args);
  }
  Warn(Message, ...Args) {
    console.warn(`[${this.Prefix}] ${Message}`, ...Args);
  }
  Error(Message, ...Args) {
    console.error(`[${this.Prefix}] ${Message}`, ...Args);
  }
  Debug(Message, ...Args) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(`[${this.Prefix}] ${Message}`, ...Args);
    }
  }
};
var Logger_default = Logger;
export {
  Logger,
  Logger_default as default
};
//# sourceMappingURL=Logger.js.map
