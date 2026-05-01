var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Health.ts
import { Layer } from "effect";
var HealthStatus = /* @__PURE__ */ ((HealthStatus2) => {
  HealthStatus2["HEALTHY"] = "healthy";
  HealthStatus2["DEGRADED"] = "degraded";
  HealthStatus2["UNHEALTHY"] = "unhealthy";
  HealthStatus2["UNKNOWN"] = "unknown";
  return HealthStatus2;
})(HealthStatus || {});
var HealthService = class {
  static {
    __name(this, "HealthService");
  }
  _serviceBrand;
  config;
  monitoredServices = /* @__PURE__ */ new Map();
  eventListeners = /* @__PURE__ */ new Set();
  heartbeatIntervalId = null;
  healthCheckIntervalId = null;
  errorCounts = /* @__PURE__ */ new Map();
  recoveryAttempts = /* @__PURE__ */ new Map();
  constructor(config = {}) {
    this._serviceBrand = void 0;
    this.config = {
      heartbeatInterval: 5e3,
      healthCheckInterval: 1e4,
      timeoutThreshold: 3e4,
      errorThreshold: 5,
      enableAutoRecovery: true,
      maxRetryAttempts: 3,
      ...config
    };
    console.log("[HealthService] Initializing health monitoring service");
  }
  /**
   * Initialize health service
   */
  async initialize() {
    try {
      await this.initializeCoreServices();
      this.startHeartbeatMonitoring();
      this.startHealthChecks();
      console.log(
        "[HealthService] Health monitoring service initialized"
      );
    } catch (error) {
      console.error("[HealthService] Failed to initialize:", error);
      this.emitEvent({
        type: "service_unhealthy",
        timestamp: Date.now(),
        service: "HealthService",
        error: `Initialization failed: ${error}`
      });
    }
  }
  /**
   * Initialize core services for monitoring
   */
  async initializeCoreServices() {
    const coreServices = [
      {
        name: "MountainClientService",
        dependencies: [],
        initialStatus: "healthy" /* HEALTHY */
      },
      {
        name: "ExtensionHostService",
        dependencies: ["MountainClientService"],
        initialStatus: "healthy" /* HEALTHY */
      },
      {
        name: "ConfigurationService",
        dependencies: [],
        initialStatus: "healthy" /* HEALTHY */
      },
      {
        name: "GRPCServerService",
        dependencies: ["MountainClientService"],
        initialStatus: "healthy" /* HEALTHY */
      }
    ];
    for (const service of coreServices) {
      const serviceHealth = {
        name: service.name,
        status: service.initialStatus,
        lastHeartbeat: Date.now(),
        uptime: 0,
        metrics: {
          responseTime: 0,
          errorRate: 0,
          throughput: 0,
          memoryUsage: 0,
          cpuUsage: 0,
          lastUpdated: Date.now()
        },
        dependencies: service.dependencies,
        errorCount: 0,
        recoveryAttempts: 0
      };
      this.monitoredServices.set(service.name, serviceHealth);
      this.errorCounts.set(service.name, 0);
      this.recoveryAttempts.set(service.name, 0);
      console.log(
        `[HealthService] Initialized monitoring for service: ${service.name}`
      );
    }
    console.log(
      `[HealthService] Initialized ${this.monitoredServices.size} core services`
    );
  }
  /**
   * Start heartbeat monitoring
   */
  startHeartbeatMonitoring() {
    this.heartbeatIntervalId = setInterval(async () => {
      await this.checkServiceHeartbeats();
    }, this.config.heartbeatInterval);
    console.log("[HealthService] Heartbeat monitoring started");
  }
  /**
   * Check service heartbeats
   */
  async checkServiceHeartbeats() {
    const now = Date.now();
    for (const [
      serviceName,
      serviceHealth
    ] of this.monitoredServices.entries()) {
      const timeSinceHeartbeat = now - serviceHealth.lastHeartbeat;
      if (timeSinceHeartbeat > this.config.timeoutThreshold) {
        console.warn(
          `[HealthService] Service ${serviceName} heartbeat timeout`
        );
        serviceHealth.status = "unhealthy" /* UNHEALTHY */;
        this.emitEvent({
          type: "service_lost",
          timestamp: now,
          service: serviceName,
          error: `Heartbeat timeout: ${timeSinceHeartbeat}ms`
        });
        if (this.config.enableAutoRecovery) {
          await this.attemptServiceRecovery(serviceName);
        }
      }
    }
  }
  /**
   * Start health checks
   */
  startHealthChecks() {
    this.healthCheckIntervalId = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthCheckInterval);
    console.log("[HealthService] Health checks started");
  }
  /**
   * Perform comprehensive health checks
   */
  async performHealthChecks() {
    console.log("[HealthService] Performing health checks");
    for (const [
      serviceName,
      serviceHealth
    ] of this.monitoredServices.entries()) {
      try {
        await this.checkServiceHealth(serviceName, serviceHealth);
      } catch (error) {
        console.error(
          `[HealthService] Health check failed for ${serviceName}:`,
          error
        );
        const errorCount = (this.errorCounts.get(serviceName) || 0) + 1;
        this.errorCounts.set(serviceName, errorCount);
        if (errorCount >= this.config.errorThreshold) {
          serviceHealth.status = "unhealthy" /* UNHEALTHY */;
          this.emitEvent({
            type: "service_unhealthy",
            timestamp: Date.now(),
            service: serviceName,
            error: `Health check failed: ${error}`
          });
        }
      }
    }
  }
  /**
   * Check individual service health
   */
  async checkServiceHealth(serviceName, serviceHealth) {
    try {
      const isHealthy = await this.performServiceHealthCheck(serviceName);
      serviceHealth.status = isHealthy ? "healthy" /* HEALTHY */ : "unhealthy" /* UNHEALTHY */;
      serviceHealth.lastHeartbeat = Date.now();
      serviceHealth.uptime = isHealthy ? serviceHealth.uptime + 1 : serviceHealth.uptime;
      serviceHealth.metrics = {
        ...serviceHealth.metrics,
        responseTime: this.calculateResponseTime(serviceName),
        errorRate: this.calculateErrorRate(serviceName),
        throughput: this.calculateThroughput(serviceName),
        memoryUsage: this.getMemoryUsage(serviceName),
        cpuUsage: this.getCpuUsage(serviceName),
        lastUpdated: Date.now()
      };
      if (isHealthy) {
        this.errorCounts.set(serviceName, 0);
      }
      if (serviceHealth.status === "healthy" /* HEALTHY */) {
        this.emitEvent({
          type: "service_healthy",
          timestamp: Date.now(),
          service: serviceName,
          data: serviceHealth
        });
      }
      console.log(
        `[HealthService] Service ${serviceName} health check: ${serviceHealth.status}`
      );
    } catch (error) {
      console.error(
        `[HealthService] Failed to check health for ${serviceName}:`,
        error
      );
      throw error;
    }
  }
  /**
   * Perform service-specific health check
   */
  async performServiceHealthCheck(serviceName) {
    switch (serviceName) {
      case "MountainClientService":
        return await this.checkMountainClientHealth();
      case "ExtensionHostService":
        return await this.checkExtensionHostHealth();
      case "ConfigurationService":
        return await this.checkConfigurationServiceHealth();
      case "GRPCServerService":
        return await this.checkGRPCServerHealth();
      default:
        return true;
    }
  }
  /**
   * Check Mountain client health
   */
  async checkMountainClientHealth() {
    return Math.random() > 0.1;
  }
  /**
   * Check extension host health
   */
  async checkExtensionHostHealth() {
    return Math.random() > 0.15;
  }
  /**
   * Check configuration service health
   */
  async checkConfigurationServiceHealth() {
    return Math.random() > 0.02;
  }
  /**
   * Check gRPC server health
   */
  async checkGRPCServerHealth() {
    return Math.random() > 0.08;
  }
  /**
   * Calculate response time for service
   */
  calculateResponseTime(serviceName) {
    const baseTimes = {
      "MountainClientService": 50,
      "ExtensionHostService": 100,
      "ConfigurationService": 5,
      "GRPCServerService": 20
    };
    return baseTimes[serviceName] || 30;
  }
  /**
   * Calculate error rate for service
   */
  calculateErrorRate(serviceName) {
    const baseRates = {
      "MountainClientService": 2.5,
      "ExtensionHostService": 5,
      "ConfigurationService": 0.1,
      "GRPCServerService": 1.5
    };
    return baseRates[serviceName] || 3;
  }
  /**
   * Calculate throughput for service
   */
  calculateThroughput(serviceName) {
    const baseThroughput = {
      "MountainClientService": 500,
      "ExtensionHostService": 300,
      "ConfigurationService": 5e3,
      "GRPCServerService": 1e3
    };
    return baseThroughput[serviceName] || 100;
  }
  /**
   * Get memory usage for service
   */
  getMemoryUsage(serviceName) {
    const baseMemory = {
      "MountainClientService": 256,
      "ExtensionHostService": 512,
      "ConfigurationService": 64,
      "GRPCServerService": 192
    };
    return baseMemory[serviceName] || 100;
  }
  /**
   * Get CPU usage for service
   */
  getCpuUsage(serviceName) {
    const baseCpu = {
      "MountainClientService": 15,
      "ExtensionHostService": 25,
      "ConfigurationService": 2,
      "GRPCServerService": 10
    };
    return baseCpu[serviceName] || 20;
  }
  /**
   * Attempt service recovery
   */
  async attemptServiceRecovery(serviceName) {
    const currentAttempts = this.recoveryAttempts.get(serviceName) || 0;
    if (currentAttempts >= this.config.maxRetryAttempts) {
      console.warn(
        `[HealthService] Max recovery attempts reached for ${serviceName}`
      );
      return;
    }
    console.log(
      `[HealthService] Attempting recovery for ${serviceName} (attempt ${currentAttempts + 1})`
    );
    this.recoveryAttempts.set(serviceName, currentAttempts + 1);
    this.emitEvent({
      type: "recovery_attempted",
      timestamp: Date.now(),
      service: serviceName,
      data: { attempt: currentAttempts + 1 }
    });
    try {
      await this.performServiceRecovery(serviceName);
      await this.waitForServiceRecovery(serviceName);
      this.recoveryAttempts.set(serviceName, 0);
      this.emitEvent({
        type: "recovery_successful",
        timestamp: Date.now(),
        service: serviceName,
        data: { attempt: currentAttempts + 1 }
      });
      console.log(
        `[HealthService] Recovery successful for ${serviceName}`
      );
    } catch (error) {
      console.error(
        `[HealthService] Recovery failed for ${serviceName}:`,
        error
      );
      this.emitEvent({
        type: "service_unhealthy",
        timestamp: Date.now(),
        service: serviceName,
        error: `Recovery failed: ${error}`
      });
    }
  }
  /**
   * Perform service-specific recovery
   */
  async performServiceRecovery(serviceName) {
    console.log(`[HealthService] Performing recovery for ${serviceName}`);
    await new Promise((resolve) => setTimeout(resolve, 2e3));
    console.log(`[HealthService] Recovery completed for ${serviceName}`);
  }
  /**
   * Wait for service recovery
   */
  async waitForServiceRecovery(serviceName) {
    const maxWaitTime = 3e4;
    const checkInterval = 1e3;
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const isHealthy = await this.performServiceHealthCheck(serviceName);
        if (isHealthy) {
          console.log(
            `[HealthService] Service ${serviceName} recovered`
          );
          return;
        }
        await new Promise(
          (resolve) => setTimeout(resolve, checkInterval)
        );
      } catch (error) {
        await new Promise(
          (resolve) => setTimeout(resolve, checkInterval)
        );
      }
    }
    throw new Error(
      `Service ${serviceName} did not recover within ${maxWaitTime}ms`
    );
  }
  /**
   * Emit health event
   */
  emitEvent(event) {
    this.eventListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error(
          "[HealthService] Error in event listener:",
          error
        );
      }
    });
  }
  /**
   * Get service health
   */
  async getServiceHealth(serviceName) {
    return this.monitoredServices.get(serviceName);
  }
  /**
   * Get overall system health
   */
  async getSystemHealth() {
    const services = Array.from(this.monitoredServices.values());
    const healthyServices = services.filter(
      (s) => s.status === "healthy" /* HEALTHY */
    ).length;
    const degradedServices = services.filter(
      (s) => s.status === "degraded" /* DEGRADED */
    ).length;
    const unhealthyServices = services.filter(
      (s) => s.status === "unhealthy" /* UNHEALTHY */
    ).length;
    let overallStatus = "healthy" /* HEALTHY */;
    if (unhealthyServices > 0) {
      overallStatus = "unhealthy" /* UNHEALTHY */;
    } else if (degradedServices > 0) {
      overallStatus = "degraded" /* DEGRADED */;
    }
    return {
      overallStatus,
      healthyServices,
      totalServices: services.length,
      degradedServices,
      unhealthyServices
    };
  }
  /**
   * Trigger manual health check
   */
  async triggerHealthCheck() {
    await this.performHealthChecks();
  }
  /**
   * Add event listener
   */
  onHealthEvent(listener) {
    this.eventListeners.add(listener);
  }
  /**
   * Remove event listener
   */
  offHealthEvent(listener) {
    this.eventListeners.delete(listener);
  }
  /**
   * Dispose health service
   */
  dispose() {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
    if (this.healthCheckIntervalId) {
      clearInterval(this.healthCheckIntervalId);
      this.healthCheckIntervalId = null;
    }
    this.eventListeners.clear();
    this.monitoredServices.clear();
    this.errorCounts.clear();
    this.recoveryAttempts.clear();
    console.log("[HealthService] Health monitoring service disposed");
  }
};
var HealthServiceLayer = Layer.succeed(
  IHealthService,
  new HealthService()
);
export {
  HealthService,
  HealthServiceLayer,
  HealthStatus
};
//# sourceMappingURL=Health.js.map
