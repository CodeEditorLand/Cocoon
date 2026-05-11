var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Metrics/Collector.ts
var MetricsCollector = class {
  static {
    __name(this, "MetricsCollector");
  }
  Metrics = /* @__PURE__ */ new Map();
  Record(Name, Value) {
    this.Metrics.set(Name, (this.Metrics.get(Name) || 0) + Value);
  }
  Get(Name) {
    return this.Metrics.get(Name) || 0;
  }
  GetAll() {
    return Object.fromEntries(this.Metrics);
  }
  Reset() {
    this.Metrics.clear();
  }
};
export {
  MetricsCollector
};
//# sourceMappingURL=Collector.js.map
