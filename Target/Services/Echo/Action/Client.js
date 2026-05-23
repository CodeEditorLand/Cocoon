var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Proto/vine.ts
var EchoActionServiceClient = class {
  static {
    __name(this, "EchoActionServiceClient");
  }
};

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

// Source/Services/Echo/Action/Client.ts
import { credentials } from "@grpc/grpc-js";
import { v4 as uuidv4 } from "uuid";
var CocoonEchoClient = class {
  static {
    __name(this, "CocoonEchoClient");
  }
  /** Mountain gRPC URL */
  mountainUrl;
  /** Host identifier */
  hostId;
  /** gRPC client */
  client = null;
  /** Connection state */
  isConnected = false;
  /** Connection start time */
  connectionStartTime = null;
  /** Last heartbeat timestamp */
  lastHeartbeat = null;
  /** Heartbeat interval ID */
  heartbeatIntervalId = null;
  /** Logger */
  logger = Logger.create("CocoonEchoClient");
  /** Metrics */
  metrics = MetricsCollector.getInstance();
  /** Registered host information */
  hostInfo = null;
  /**
   * Create new Cocoon Echo client
   * ☀️ 🔴 MOUNTAIN_COCOON_ONLY
   *
   * @param mountainUrl - Mountain gRPC URL
   * @param hostId - Unique host identifier
   */
  constructor(mountainUrl, hostId) {
    this.mountainUrl = mountainUrl;
    this.hostId = hostId || `cocoon-${uuidv4()}`;
    this.logger.info(`Cocoon Echo Client created: ${this.hostId}`);
  }
  /**
   * Connect to Mountain
   * ☀️ 🔴 MOUNTAIN_COCOON_ONLY
   */
  async connect() {
    this.logger.info(`Connecting to Mountain at: ${this.mountainUrl}`);
    return new Promise((resolve, _reject) => {
      this.client = new EchoActionServiceClient(
        this.mountainUrl,
        credentials.createInsecure()
      );
      this.isConnected = true;
      this.connectionStartTime = /* @__PURE__ */ new Date();
      this.lastHeartbeat = /* @__PURE__ */ new Date();
      this.logger.info("Successfully connected to Mountain");
      this.metrics.increment("echo_client.connect_success");
      resolve();
    });
  }
  /**
   * Disconnect from Mountain
   * ☀️ 🔴 MOUNTAIN_COCOON_ONLY
   */
  async disconnect() {
    this.logger.info("Disconnecting from Mountain");
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
    this.client = null;
    this.isConnected = false;
    this.connectionStartTime = null;
    this.hostInfo = null;
    this.logger.info("Disconnected from Mountain");
    this.metrics.increment("echo_client.disconnect");
  }
  /**
   * Register Cocoon as an extension host
   * ☀️ 🔴 MOUNTAIN_COCOON_ONLY - Host registration with Mountain
   */
  async register() {
    if (!this.client) {
      throw new Error("Not connected to Mountain");
    }
    this.logger.info(`Registering Cocoon host: ${this.hostId}`);
    const request = {
      host_id: this.hostId,
      host_type: 1,
      // Cocoon
      capabilities: {
        supports_terminals: "true",
        supports_processes: "true",
        supports_debug: "true",
        supports_webviews: "true",
        supports_scm: "true",
        max_memory_mb: "4096"
      },
      metadata: {
        version: process.env.npm_package_version || "0.0.1",
        build_hash: process.env.BUILD_HASH || "unknown",
        supported_extensions: ["vsix"],
        max_memory_mb: 4096,
        enabled_features: [
          "nodejs",
          "terminals",
          "debug-protocol",
          "scm-support"
        ]
      }
    };
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error("Client not initialized"));
        return;
      }
      this.client.register_extension_host(request, (err, response) => {
        if (err) {
          this.logger.error(`Registration failed: ${err.message}`);
          this.metrics.increment("echo_client.register_failure");
          reject(new Error(`Failed to register: ${err.message}`));
          return;
        }
        if (response && response.registered) {
          this.hostInfo = {
            hostId: this.hostId,
            hostRegistryId: response.host_registry_id,
            heartbeatIntervalSec: response.heartbeat_interval_sec
          };
          this.logger.info(
            `Cocoon host registered: ${response.host_registry_id}`
          );
          this.metrics.increment("echo_client.register_success");
          this.startHeartbeatLoop();
          resolve(this.hostInfo);
        } else {
          this.logger.error("Registration returned false");
          this.metrics.increment("echo_client.register_failure");
          reject(new Error("Registration failed"));
        }
      });
    });
  }
  /**
   * Send EchoAction to Mountain
   * ☀️ 🔴 MOUNTAIN_COCOON_ONLY
   */
  async sendEchoAction(action) {
    if (!this.client) {
      throw new Error("Not connected to Mountain");
    }
    this.logger.debug(
      `Sending EchoAction: type=${action.actionType}, target=${action.target}`
    );
    const startTime = Date.now();
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error("Client not initialized"));
        return;
      }
      this.client.send_echo_action(action, (err, response) => {
        const duration = Date.now() - startTime;
        if (err) {
          this.logger.error(`EchoAction failed: ${err.message}`);
          this.metrics.recordTiming(
            "echo_action.duration_ms",
            duration,
            {
              success: "false",
              type: action.actionType
            }
          );
          reject(new Error(`EchoAction failed: ${err.message}`));
          return;
        }
        if (!response) {
          reject(new Error("No response received"));
          return;
        }
        this.logger.debug(
          `EchoAction response: success=${response.success}`
        );
        this.metrics.recordTiming("echo_action.duration_ms", duration, {
          success: response.success.toString(),
          type: action.actionType
        });
        if (!response.success) {
          reject(new Error(`EchoAction failed: ${response.error}`));
          return;
        }
        resolve(response);
      });
    });
  }
  /**
   * Send RPC via EchoAction
   * ☀️ 🔴 MOUNTAIN_COCOON_ONLY
   */
  async sendRpc(rpcMethod, payload, targetHost) {
    const headers = {
      rpc_method: rpcMethod,
      host_type: "cocoon",
      node_version: process.version,
      platform: process.platform
    };
    if (targetHost) {
      headers.target_host = targetHost;
    }
    const action = {
      actionId: uuidv4(),
      source: this.hostId,
      target: targetHost || "mountain",
      actionType: "rpc",
      payload,
      headers,
      timestamp: Date.now()
    };
    const response = await this.sendEchoAction(action);
    return Buffer.from(response.result);
  }
  /**
   * Send event via EchoAction
   * ☀️ 🔴 MOUNTAIN_COCOON_ONLY
   */
  async sendEvent(eventName, payload, metadata = {}) {
    const headers = {
      event_name: eventName,
      host_type: "cocoon",
      ...metadata
    };
    const action = {
      actionId: uuidv4(),
      source: this.hostId,
      target: "mountain",
      actionType: "event",
      payload,
      headers,
      timestamp: Date.now()
    };
    await this.sendEchoAction(action);
  }
  /**
   * Send state update via EchoAction
   * ☀️ 🔴 MOUNTAIN_COCOON_ONLY
   */
  async sendState(stateType, payload, metadata = {}) {
    const headers = {
      state_type: stateType,
      host_type: "cocoon",
      ...metadata
    };
    const action = {
      actionId: uuidv4(),
      source: this.hostId,
      target: "mountain",
      actionType: "state",
      payload,
      headers,
      timestamp: Date.now()
    };
    await this.sendEchoAction(action);
  }
  /**
   * Query service discovery
   * ☀️ 🔴 MOUNTAIN_COCOON_ONLY
   */
  async discoverServices(serviceName) {
    const headers = {
      host_type: "cocoon"
    };
    if (serviceName) {
      headers.service_name = serviceName;
    }
    const action = {
      actionId: uuidv4(),
      source: this.hostId,
      target: "mountain",
      actionType: "discovery",
      payload: Buffer.alloc(0),
      headers,
      timestamp: Date.now()
    };
    const response = await this.sendEchoAction(action);
    return JSON.parse(response.result.toString());
  }
  /**
   * Start heartbeat loop
   * ☀️ 🔴 MOUNTAIN_COCOON_ONLY
   */
  startHeartbeatLoop() {
    if (!this.hostInfo) {
      return;
    }
    const intervalMs = (this.hostInfo.heartbeatIntervalSec || 30) * 1e3;
    this.heartbeatIntervalId = setInterval(() => {
      this.lastHeartbeat = /* @__PURE__ */ new Date();
      this.logger.debug("Heartbeat sent");
      this.metrics.increment("echo_client.heartbeat");
    }, intervalMs);
  }
  /**
   * Get connection status
   * ☀️ 🔴 MOUNTAIN_COCOON_ONLY
   */
  getStatus() {
    let uptime = null;
    if (this.connectionStartTime) {
      uptime = Date.now() - this.connectionStartTime.getTime();
    }
    return {
      connected: this.isConnected,
      hostId: this.hostId,
      uptime,
      hostInfo: this.hostInfo,
      lastHeartbeat: this.lastHeartbeat
    };
  }
  /**
   * Reconnect to Mountain
   * ☀️ 🔴 MOUNTAIN_COCOON_ONLY
   */
  async reconnect() {
    this.logger.warn("Attempting to reconnect to Mountain");
    await this.disconnect();
    await this.connect();
    await this.register();
    this.logger.info("Successfully reconnected to Mountain");
  }
};
var CocoonEchoClientFactory = {
  /**
   * Create and connect EchoAction client
   * ☀️ 🔴 MOUNTAIN_COCOON_ONLY
   */
  async createAndConnect(mountainUrl, hostId) {
    const client = new CocoonEchoClient(mountainUrl, hostId);
    await client.connect();
    await client.register();
    return client;
  }
};
export {
  CocoonEchoClient,
  CocoonEchoClientFactory
};
//# sourceMappingURL=Client.js.map
