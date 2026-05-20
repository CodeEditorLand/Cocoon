var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Performance/Monitoring/Service.ts
import { Layer } from "effect";
var PerformanceMonitoringService = class {
  static {
    __name(this, "PerformanceMonitoringService");
  }
  monitoringActive = false;
  constructor() {
  }
  async initialize() {
    this.monitoringActive = true;
  }
  async getMetrics() {
    return {
      extensionLoadTime: 0,
      apiCallLatency: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      concurrentExtensions: 0,
      errorRate: 0,
      cacheHitRate: 0,
      requestThroughput: 0
    };
  }
  async getAlerts() {
    return [];
  }
  async getOptimizationSuggestions() {
    return [];
  }
  async startMonitoring() {
    this.monitoringActive = true;
  }
  async stopMonitoring() {
    this.monitoringActive = false;
  }
  async resetMetrics() {
  }
};
var PerformanceMonitoringServiceLive = Layer.sync(
  "PerformanceMonitoringService",
  () => new PerformanceMonitoringService()
);
var Service_default = PerformanceMonitoringService;
export {
  PerformanceMonitoringService,
  PerformanceMonitoringServiceLive,
  Service_default as default
};
//# sourceMappingURL=Service.js.map
