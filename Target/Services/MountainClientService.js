var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Interfaces/IMountainClientService.ts
import * as Effect from "effect/Effect";
var IMountainClientService = Effect.Service()(
  "Service/MountainClient",
  {
    effect: Effect.gen(function* () {
      return {};
    })
  }
);

// Source/Services/DevLog.ts
var Raw = process.env["LAND_DEV_LOG"] ?? "";
var ParsedTags = Raw.split(",").map((Segment) => Segment.trim().toLowerCase()).filter((Segment) => Segment.length > 0);
var TagSet = new Set(ParsedTags);
var IsShort = TagSet.has("short");
var HasAll = TagSet.has("all");
var IsEnabled = /* @__PURE__ */ __name((Tag) => {
  if (TagSet.size === 0) return false;
  if (HasAll || IsShort) return true;
  return TagSet.has(Tag.toLowerCase());
}, "IsEnabled");
var CocoonDevLog = /* @__PURE__ */ __name((Tag, Message) => {
  if (!IsEnabled(Tag)) return;
  const TagUpper = Tag.toUpperCase();
  process.stdout.write(`[DEV:${TagUpper}] ${Message}
`);
}, "CocoonDevLog");
var DevLog_default = CocoonDevLog;

// Source/Services/MountainClientService.ts
import { createRequire } from "module";
import { dirname } from "path";
import { fileURLToPath } from "url";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { v4 as uuidv4 } from "uuid";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var require2 = createRequire(import.meta.url);
var CircuitBreakerState = /* @__PURE__ */ ((CircuitBreakerState2) => {
  CircuitBreakerState2["Closed"] = "CLOSED";
  CircuitBreakerState2["Open"] = "OPEN";
  CircuitBreakerState2["HalfOpen"] = "HALF_OPEN";
  return CircuitBreakerState2;
})(CircuitBreakerState || {});
var ConnectionState = /* @__PURE__ */ ((ConnectionState2) => {
  ConnectionState2["Disconnected"] = "DISCONNECTED";
  ConnectionState2["Connecting"] = "CONNECTING";
  ConnectionState2["Connected"] = "CONNECTED";
  ConnectionState2["Degraded"] = "DEGRADED";
  ConnectionState2["Failed"] = "FAILED";
  return ConnectionState2;
})(ConnectionState || {});
var MountainClientService = class {
  static {
    __name(this, "MountainClientService");
  }
  _serviceBrand;
  // Core gRPC client and connection state
  client = null;
  channel = null;
  mountainHost = "localhost";
  mountainPort = 50051;
  // Default Mountain gRPC port
  connectionState = "DISCONNECTED" /* Disconnected */;
  connectionStartTime = 0;
  errorCount = 0;
  requestCounter = 0;
  activeRequests = /* @__PURE__ */ new Map();
  // Circuit breaker configuration with enhanced tracking
  circuitBreakerState = "CLOSED" /* Closed */;
  circuitBreakerFailureCount = 0;
  circuitBreakerSuccessCount = 0;
  circuitBreakerThreshold = 5;
  // Consecutive failures before opening
  circuitBreakerSuccessThreshold = 3;
  // Consecutive successes to close
  circuitBreakerTimeout = 6e4;
  // 60 seconds recovery timeout
  circuitBreakerOpenTime = 0;
  circuitBreakerHalfOpenAttempts = 0;
  // Retry configuration with exponential backoff and jitter
  maxRetries = 3;
  baseRetryDelay = 1e3;
  // Base delay in milliseconds
  maxRetryDelay = 1e4;
  // Maximum delay in milliseconds
  retryJitterFactor = 0.2;
  // 20% jitter
  // Health monitoring with comprehensive tracking
  healthCheckInterval = null;
  healthCheckPeriod = 3e4;
  // 30 seconds
  lastHealthCheck = 0;
  consecutiveSuccessfulHealthChecks = 0;
  healthCheckFailures = 0;
  lastHealthCheckError = null;
  // Performance metrics
  totalRequests = 0;
  totalFailures = 0;
  totalSuccesses = 0;
  averageResponseTime = 0;
  maxResponseTime = 0;
  minResponseTime = Infinity;
  // Connection metadata
  clientVersion = "1.0.0";
  clientId = uuidv4();
  sessionId = uuidv4();
  constructor() {
    this._serviceBrand = void 0;
    console.log(
      `[MountainClientService] Initializing Mountain gRPC client (ID: ${this.clientId})`
    );
    this.parseEnvironment();
    console.log(
      `[MountainClientService] Configured for ${this.mountainHost}:${this.mountainPort}, Session: ${this.sessionId}`
    );
    this.registerShutdownHandlers();
  }
  /**
   * Parse environment variables with comprehensive configuration validation
   */
  parseEnvironment() {
    const mountainHost = process.env.MOUNTAIN_CONNECTION_HOST || "localhost";
    const mountainPort = process.env.MOUNTAIN_GRPC_PORT || "50051";
    const connectionTimeout = process.env.MOUNTAIN_CONNECTION_TIMEOUT || "30000";
    const maxRetries = process.env.MOUNTAIN_MAX_RETRIES || "3";
    const enableTLS = process.env.MOUNTAIN_ENABLE_TLS || "false";
    const healthCheckPeriod = process.env.MOUNTAIN_HEALTH_CHECK_PERIOD || "30000";
    this.mountainHost = mountainHost;
    this.mountainPort = parseInt(mountainPort, 10);
    if (maxRetries) {
      this.maxRetries = parseInt(maxRetries, 10);
    }
    if (healthCheckPeriod) {
      this.healthCheckPeriod = parseInt(healthCheckPeriod, 10);
    }
    console.log(
      `[MountainClientService] Environment parsed: MOUNTAIN_CONNECTION_HOST=${this.mountainHost}, MOUNTAIN_GRPC_PORT=${this.mountainPort}, MAX_RETRIES=${this.maxRetries}`
    );
    if (!this.isValidHost(this.mountainHost)) {
      throw new Error(`Invalid Mountain host: ${this.mountainHost}`);
    }
    if (this.mountainPort < 1 || this.mountainPort > 65535) {
      throw new Error(`Invalid Mountain port: ${this.mountainPort}`);
    }
    if (this.maxRetries < 0 || this.maxRetries > 10) {
      console.warn(
        `[MountainClientService] Invalid max retries: ${this.maxRetries}, using default: 3`
      );
      this.maxRetries = 3;
    }
    if (this.healthCheckPeriod < 5e3 || this.healthCheckPeriod > 12e4) {
      console.warn(
        `[MountainClientService] Invalid health check period: ${this.healthCheckPeriod}ms, using default: 30000ms`
      );
      this.healthCheckPeriod = 3e4;
    }
  }
  /**
   * Validate host configuration with comprehensive pattern matching
   */
  isValidHost(host) {
    if (!host || host.trim().length === 0) {
      return false;
    }
    const validHostPatterns = [
      /^localhost$/,
      // localhost
      /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
      // IPv4
      /^\[[0-9a-fA-F:]+\]$/,
      // IPv6 (bracketed)
      /^[0-9a-fA-F:]+$/,
      // IPv6 (unbracketed)
      /^[a-zA-Z0-9.-]+$/,
      // Domain name
      /^[a-zA-Z0-9_-]+$/,
      // Simple hostname
      /^unix:[\/\\].+$/
      // Unix domain socket
    ];
    return validHostPatterns.some((pattern) => pattern.test(host));
  }
  /**
   * Register graceful shutdown handlers for VS Code extension compatibility
   */
  registerShutdownHandlers() {
    process.on("SIGTERM", () => {
      console.log(
        "[MountainClientService] Received SIGTERM, shutting down gracefully"
      );
      this.disconnect().catch((error) => {
        console.error(
          "[MountainClientService] Graceful shutdown failed:",
          error
        );
      });
    });
    process.on("SIGINT", () => {
      console.log(
        "[MountainClientService] Received SIGINT, shutting down gracefully"
      );
      this.disconnect().catch((error) => {
        console.error(
          "[MountainClientService] Graceful shutdown failed:",
          error
        );
      });
    });
    if (typeof process !== "undefined" && process.env && process.env.VSCODE_PID) {
      console.log(
        "[MountainClientService] Running in VS Code extension context"
      );
    }
  }
  /**
   * Connect to Mountain gRPC server with comprehensive circuit breaker protection
   * and proper gRPC channel management
   */
  async connect() {
    this.CheckCircuitBreaker();
    if (this.connectionState === "CONNECTED" /* Connected */ || this.connectionState === "CONNECTING" /* Connecting */) {
      console.warn(
        `[MountainClientService] Already ${this.connectionState.toLowerCase()} to Mountain`
      );
      return;
    }
    console.log(
      `[MountainClientService] Connecting to Mountain at ${this.mountainHost}:${this.mountainPort} (Session: ${this.sessionId})`
    );
    this.connectionState = "CONNECTING" /* Connecting */;
    try {
      const packageDefinition = await this.loadProtocolDefinition();
      const protoDescriptor = grpc.loadPackageDefinition(
        packageDefinition
      );
      const target = `${this.mountainHost}:${this.mountainPort}`;
      const channelOptions = {
        "grpc.max_receive_message_length": 1024 * 1024 * 100,
        // 100MB max message size
        "grpc.max_send_message_length": 1024 * 1024 * 100,
        // 100MB max message size
        "grpc.keepalive_time_ms": 1e4,
        // 10s keepalive ping
        "grpc.keepalive_timeout_ms": 5e3,
        // 5s keepalive timeout
        "grpc.keepalive_permit_without_calls": 1,
        // Allow keepalive without calls
        "grpc.http2.max_pings_without_data": 0,
        // No pings without data
        "grpc.http2.min_time_between_pings_ms": 1e4,
        // 10s min between pings
        "grpc.http2.min_ping_interval_without_data_ms": 3e4,
        // 30s min ping interval
        "grpc.enable_retries": 1,
        // Enable gRPC built-in retries
        "grpc.max_retry_attempts": 3,
        // Max retry attempts
        "grpc.initial_reconnect_backoff_ms": 1e3,
        // Initial reconnect backoff
        "grpc.max_reconnect_backoff_ms": 3e4,
        // Max reconnect backoff
        "grpc.enable_channelz": 0
        // Disable channelz for perf
      };
      this.client = new (protoDescriptor.Vine?.MountainService || protoDescriptor.MountainService)(
        target,
        grpc.credentials.createInsecure(),
        channelOptions
      );
      await this.waitForConnection();
      this.connectionState = "CONNECTED" /* Connected */;
      this.connectionStartTime = Date.now();
      this.errorCount = 0;
      this.consecutiveSuccessfulHealthChecks = 0;
      this.healthCheckFailures = 0;
      this.startHealthMonitoring();
      console.log(
        `[MountainClientService] Successfully connected to Mountain (Session: ${this.sessionId})`
      );
      this.UpdateCircuitBreaker(true);
    } catch (error) {
      this.connectionState = "FAILED" /* Failed */;
      this.errorCount++;
      this.circuitBreakerFailureCount++;
      console.error(
        `[MountainClientService] Failed to connect to Mountain:`,
        error
      );
      this.UpdateCircuitBreaker(false, error);
      throw new Error(
        `Failed to connect to Mountain: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  /**
   * Load protocol definition with comprehensive error handling and fallback strategies
   */
  async loadProtocolDefinition() {
    console.log(
      "[MountainClientService] Loading Vine.proto protocol definition"
    );
    try {
      const fs = require2("fs");
      const path = require2("path");
      const SearchPaths = [
        path.resolve(
          __dirname,
          "../../../../Mountain/Proto/Vine.proto"
        ),
        path.resolve(
          process.cwd(),
          "Element/Mountain/Proto/Vine.proto"
        ),
        path.resolve(process.cwd(), "../Mountain/Proto/Vine.proto")
      ];
      let vineProtoPath = null;
      for (const P of SearchPaths) {
        if (fs.existsSync(P)) {
          vineProtoPath = P;
          break;
        }
      }
      if (vineProtoPath) {
        console.log(
          `[MountainClientService] Found Vine.proto at: ${vineProtoPath}`
        );
        return protoLoader.loadSync(vineProtoPath, {
          keepCase: true,
          // Preserve field names
          longs: String,
          // Use String for uint64 compatibility
          enums: String,
          // Use String for enum compatibility
          defaults: true,
          // Include default values
          oneofs: true,
          // Support oneof fields
          includeDirs: [path.dirname(vineProtoPath)],
          // Include proto directory
          arrays: true,
          // Support repeated fields
          objects: true,
          // Support message objects
          bytes: Buffer
          // Use Buffer for bytes fields
        });
      } else {
        console.warn(
          "[MountainClientService] Vine.proto not found at:",
          vineProtoPath
        );
        const fallbackProtoContent = `syntax = "proto3";

package Vine;

service MountainService {
    rpc ProcessCocoonRequest(GenericRequest) returns (GenericResponse);
    rpc SendCocoonNotification(GenericNotification) returns (Empty);
    rpc CancelOperation(CancelOperationRequest) returns (Empty);
}

service CocoonService {
    rpc ProcessMountainRequest(GenericRequest) returns (GenericResponse);
    rpc SendMountainNotification(GenericNotification) returns (Empty);
    rpc CancelOperation(CancelOperationRequest) returns (Empty);
}

message GenericRequest {
    uint64 RequestIdentifier = 1;
    string Method = 2;
    bytes Parameter = 3;
}

message GenericResponse {
    uint64 RequestIdentifier = 1;
    bytes Result = 2;
    optional RPCError error = 3;
}

message GenericNotification {
    string Method = 1;
    bytes Parameter = 2;
}

message RPCError {
    int32 Code = 1;
    string Message = 2;
    bytes Data = 3;
}

message CancelOperationRequest {
    uint64 RequestIdentifierToCancel = 1;
}

message Empty {}

message RPCDataPayload {
    bytes Data = 1;
}`;
        const tempDir = require2("os").tmpdir();
        const tempProtoPath = path.join(tempDir, "vine_fallback.proto");
        fs.writeFileSync(tempProtoPath, fallbackProtoContent);
        console.log(
          `[MountainClientService] Using fallback protocol at: ${tempProtoPath}`
        );
        return protoLoader.loadSync(tempProtoPath, {
          keepCase: true,
          longs: String,
          enums: String,
          defaults: true,
          oneofs: true,
          arrays: true,
          objects: true,
          bytes: Buffer
        });
      }
    } catch (error) {
      console.error(
        "[MountainClientService] Failed to load protocol definition:",
        error
      );
      throw new Error(
        `Failed to load Vine.proto: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  /**
   * Wait for connection with comprehensive timeout and readiness checking
   */
  waitForConnection() {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error("Client not initialized"));
        return;
      }
      const startTime = Date.now();
      const timeout = 3e3;
      const checkConnection = /* @__PURE__ */ __name(() => {
        const channel = this.client.getChannel();
        if (channel) {
          const state = channel.getConnectivityState(true);
          if (state === grpc.connectivityState.READY) {
            console.log(
              "[MountainClientService] Connection established and ready"
            );
            resolve();
            return;
          } else if (state === grpc.connectivityState.TRANSIENT_FAILURE || state === grpc.connectivityState.SHUTDOWN) {
            reject(
              new Error(
                `Connection failed with state: ${grpc.connectivityState[state]}`
              )
            );
            return;
          }
        }
        if (Date.now() - startTime > timeout) {
          reject(new Error("Connection timeout exceeded"));
          return;
        }
        setTimeout(checkConnection, 100);
      }, "checkConnection");
      setTimeout(checkConnection, 100);
    });
  }
  /**
   * Send request to Mountain with comprehensive circuit breaker, retry logic,
   * cancellation support, and VS Code extension compatibility
   */
  async sendRequest(method, parameters, cancellationToken) {
    this.CheckCircuitBreaker();
    if (this.connectionState !== "CONNECTED" /* Connected */ || !this.client) {
      throw new Error("Not connected to Mountain");
    }
    const requestIdentifier = this.generateRequestId();
    const startTime = Date.now();
    this.activeRequests.set(BigInt(requestIdentifier), {
      method,
      startTime
    });
    if (typeof process !== "undefined" && typeof process.env["LAND_DEV_LOG"] === "string" && process.env["LAND_DEV_LOG"].includes("grpc-verbose")) {
      console.log(
        `[MountainClientService] Sending request to Mountain: ${method}, ID: ${requestIdentifier}`
      );
    }
    try {
      if (cancellationToken?.isCancellationRequested) {
        throw new Error("Request cancelled before execution");
      }
      const request = {
        RequestIdentifier: BigInt(requestIdentifier),
        Method: method,
        Parameter: this.SerializeParameters(parameters)
      };
      if (method === "tree.register" && typeof process !== "undefined" && process.env["LAND_DEV_LOG"]?.includes("tree-latency")) {
        try {
          const Timestamp = process.hrtime.bigint().toString();
          const Correlation = parameters?.[0]?.viewId ?? `req-${requestIdentifier}`;
          process.stdout.write(
            `[LandFix:Tree] wire-send method=${method} correlation=${Correlation} t=${Timestamp}
`
          );
        } catch {
        }
      }
      const response = await this.SendRequestWithRetry(
        request,
        cancellationToken
      );
      const duration = Date.now() - startTime;
      if (response.error) {
        const rpcError = response.error;
        const RpcMessage = String(rpcError.Message ?? "");
        const IsBenignNotFound = (method === "FileSystem.ReadFile" || method === "FileSystem.Stat" || method === "FileSystem.ReadDirectory") && /resource not found|ENOENT|not found/i.test(RpcMessage);
        if (!IsBenignNotFound) {
          this.circuitBreakerFailureCount++;
          this.UpdateCircuitBreaker(
            false,
            new Error(
              `RPC Error: ${rpcError.Message} (Code: ${rpcError.Code})`
            )
          );
        }
        const error = new Error(
          `Mountain request failed: ${rpcError.Message}`
        );
        error.code = rpcError.Code;
        error.data = rpcError.Data ? this.DeserializeResponse(rpcError.Data) : void 0;
        throw error;
      }
      const responseData = this.DeserializeResponse(response.Result);
      if (typeof process !== "undefined" && typeof process.env["LAND_DEV_LOG"] === "string" && process.env["LAND_DEV_LOG"].includes("grpc-verbose")) {
        console.log(
          `[MountainClientService] Request ${method} completed successfully in ${duration}ms`
        );
      }
      this.trackRequestMetrics(method, duration, true);
      this.UpdateCircuitBreaker(true);
      return responseData;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.errorCount++;
      const ErrorMessage = error instanceof Error ? error.message : String(error);
      const IsBenignNotFound = (method === "FileSystem.ReadFile" || method === "FileSystem.Stat" || method === "FileSystem.ReadDirectory") && /resource not found|ENOENT|not found/i.test(ErrorMessage);
      const IsBenignMissingCommand = method === "Command.Execute" && /Command '[^']+' not found/i.test(ErrorMessage);
      const TraceMountainClient = process.env["LAND_DEV_LOG"]?.includes("mountain-client-verbose");
      if (IsBenignNotFound) {
        if (TraceMountainClient) {
          process.stdout.write(
            `[LandFix:MountainClient] ${method} 404 after ${duration}ms (benign) - ${ErrorMessage}
`
          );
        }
      } else if (IsBenignMissingCommand) {
        if (TraceMountainClient) {
          process.stdout.write(
            `[LandFix:MountainClient] ${method} missing-command after ${duration}ms (benign) - ${ErrorMessage}
`
          );
        }
      } else {
        this.circuitBreakerFailureCount++;
        this.UpdateCircuitBreaker(false, error);
        console.error(
          `[MountainClientService] Request ${method} failed after ${duration}ms:`,
          error
        );
      }
      if (cancellationToken?.isCancellationRequested) {
        console.log(
          `[MountainClientService] Request ${requestIdentifier} was cancelled`
        );
        throw new Error(`Request ${requestIdentifier} was cancelled`);
      }
      if (this.isConnectionError(error)) {
        console.log(
          "[MountainClientService] Connection error detected, attempting auto-reconnect"
        );
        try {
          await this.reconnect();
          console.log(
            "[MountainClientService] Auto-reconnect successful, retrying request"
          );
          return this.sendRequest(
            method,
            parameters,
            cancellationToken
          );
        } catch (reconnectError) {
          console.error(
            "[MountainClientService] Auto-reconnect failed:",
            reconnectError
          );
        }
      }
      throw error;
    } finally {
      this.activeRequests.delete(BigInt(requestIdentifier));
    }
  }
  /**
   * Track comprehensive request performance metrics for observability
   */
  trackRequestMetrics(method, duration, success) {
    this.totalRequests++;
    if (success) {
      this.totalSuccesses++;
    } else {
      this.totalFailures++;
    }
    this.averageResponseTime = (this.averageResponseTime * (this.totalRequests - 1) + duration) / this.totalRequests;
    this.maxResponseTime = Math.max(this.maxResponseTime, duration);
    this.minResponseTime = Math.min(this.minResponseTime, duration);
    if (typeof process !== "undefined" && typeof process.env["LAND_DEV_LOG"] === "string" && process.env["LAND_DEV_LOG"].includes("grpc-verbose")) {
      console.log(
        `[MountainClientService] Request metrics: ${method}, ${duration}ms, success: ${success}`
      );
    }
  }
  /**
   * Check if error is a connection error with comprehensive pattern matching
   */
  isConnectionError(error) {
    if (!error) return false;
    const connectionErrorPatterns = [
      // gRPC error codes
      error.code === "UNAVAILABLE",
      error.code === "DEADLINE_EXCEEDED",
      error.code === "CANCELLED",
      error.code === "UNKNOWN",
      // Numeric gRPC error codes
      error.code === 14,
      // UNAVAILABLE
      error.code === 4,
      // DEADLINE_EXCEEDED
      error.code === 1,
      // CANCELLED
      error.code === 2,
      // UNKNOWN
      // Error message patterns
      error.message?.includes("connect"),
      error.message?.includes("connection"),
      error.message?.includes("socket"),
      error.message?.includes("network"),
      error.message?.includes("ECONN"),
      error.message?.includes("ENOTFOUND"),
      error.message?.includes("ETIMEDOUT"),
      error.message?.includes("refused"),
      error.message?.includes("timeout"),
      error.message?.includes("channel"),
      // Node.js error codes
      error.code === "ECONNREFUSED",
      error.code === "ECONNRESET",
      error.code === "ETIMEDOUT",
      error.code === "ENOTFOUND"
    ];
    return connectionErrorPatterns.some((pattern) => pattern === true);
  }
  /**
   * Send request with exponential backoff retry logic
   */
  async SendRequestWithRetry(request) {
    if (!this.client) {
      throw new Error("Client not initialized");
    }
    let lastError = null;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await new Promise(
          (resolve, reject) => {
            this.client.ProcessCocoonRequest(
              request,
              (error, response2) => {
                if (error) reject(error);
                else resolve(response2);
              }
            );
          }
        );
        return response;
      } catch (error) {
        lastError = error;
        if (!this.isTransientError(error)) {
          throw error;
        }
        if (attempt < this.maxRetries - 1) {
          const delay = this.CalculateRetryDelay(attempt);
          console.warn(
            `[MountainClientService] Request ${request.RequestIdentifier} failed (attempt ${attempt + 1}/${this.maxRetries}), retrying in ${delay}ms:`,
            error
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError || new Error("Max retry attempts exceeded");
  }
  /**
   * Calculate retry delay with exponential backoff
   */
  CalculateRetryDelay(attempt) {
    const exponentialDelay = this.baseRetryDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay;
    return Math.min(exponentialDelay + jitter, this.maxRetryDelay);
  }
  /**
   * Check if error is transient and should be retried
   */
  isTransientError(error) {
    const transientCodes = [
      "UNAVAILABLE",
      "DEADLINE_EXCEEDED",
      "INTERNAL",
      "RESOURCE_EXHAUSTED"
    ];
    return error && (transientCodes.includes(error.code) || error.code === 14 || // UNAVAILABLE
    error.code === 4 || // DEADLINE_EXCEEDED
    this.isConnectionError(error));
  }
  /**
   * Serialize parameters to buffer with validation
   */
  SerializeParameters(parameters) {
    try {
      if (parameters === null || parameters === void 0) {
        return Buffer.from(JSON.stringify({}));
      }
      const serialized = JSON.stringify(parameters);
      return Buffer.from(serialized, "utf8");
    } catch (error) {
      console.error(
        "[MountainClientService] Failed to serialize parameters:",
        error
      );
      throw new Error(
        `Parameter serialization failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  /**
   * Deserialize response buffer with error handling
   */
  DeserializeResponse(buffer) {
    try {
      if (!buffer || buffer.length === 0) {
        return {};
      }
      const serialized = buffer.toString("utf8");
      return JSON.parse(serialized);
    } catch (error) {
      console.error(
        "[MountainClientService] Failed to deserialize response:",
        error
      );
      return {};
    }
  }
  /**
   * Update circuit breaker state based on operation result
   */
  UpdateCircuitBreaker(success) {
    if (success) {
      this.circuitBreakerFailureCount = 0;
      if (this.circuitBreakerState === "HALF_OPEN" /* HalfOpen */) {
        console.log(
          "[MountainClientService] Circuit breaker transitioning to CLOSED (service recovered)"
        );
        CocoonDevLog(
          "breaker",
          `[Breaker] transition from=HalfOpen to=Closed reason=service-recovered`
        );
        this.circuitBreakerState = "CLOSED" /* Closed */;
      }
    } else {
      this.circuitBreakerFailureCount++;
      if (this.circuitBreakerFailureCount >= this.circuitBreakerThreshold) {
        const PriorState = this.circuitBreakerState;
        this.circuitBreakerState = "OPEN" /* Open */;
        this.circuitBreakerOpenTime = Date.now();
        console.log(
          `[MountainClientService] Circuit breaker OPENED after ${this.circuitBreakerFailureCount} failures`
        );
        CocoonDevLog(
          "breaker",
          `[Breaker] transition from=${PriorState} to=Open failures=${this.circuitBreakerFailureCount} threshold=${this.circuitBreakerThreshold}`
        );
      }
    }
  }
  /**
   * Check circuit breaker state and throw if open
   */
  CheckCircuitBreaker() {
    if (this.circuitBreakerState === "OPEN" /* Open */) {
      if (Date.now() - this.circuitBreakerOpenTime >= this.circuitBreakerTimeout) {
        this.circuitBreakerState = "HALF_OPEN" /* HalfOpen */;
        console.log(
          "[MountainClientService] Circuit breaker transitioning to HALF_OPEN for recovery"
        );
        CocoonDevLog(
          "breaker",
          `[Breaker] transition from=Open to=HalfOpen reason=timeout-elapsed`
        );
      } else {
        throw new Error(
          `Circuit breaker is OPEN. Service unavailable. Time remaining until half-open: ${Math.round((this.circuitBreakerTimeout - (Date.now() - this.circuitBreakerOpenTime)) / 1e3)}s`
        );
      }
    }
  }
  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    if (this.healthCheckInterval) {
      return;
    }
    this.lastHealthCheck = Date.now();
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.healthCheckPeriod);
    console.log(
      `[MountainClientService] Health monitoring started (interval: ${this.healthCheckPeriod}ms)`
    );
  }
  /**
   * Stop health monitoring
   */
  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log("[MountainClientService] Health monitoring stopped");
    }
  }
  /**
   * Perform health check
   */
  async performHealthCheck() {
    this.lastHealthCheck = Date.now();
    try {
      const channel = this.client?.getChannel?.();
      if (channel) {
        const state = channel.getConnectivityState(false);
        if (state !== 2) {
          throw new Error(`Channel not ready (state: ${state})`);
        }
      }
      this.consecutiveSuccessfulHealthChecks++;
      console.log(
        `[MountainClientService] Health check passed (consecutive successes: ${this.consecutiveSuccessfulHealthChecks})`
      );
      if (this.consecutiveSuccessfulHealthChecks >= 3 && this.circuitBreakerState === "HALF_OPEN" /* HalfOpen */) {
        this.UpdateCircuitBreaker(true);
      }
    } catch (error) {
      this.consecutiveSuccessfulHealthChecks = 0;
      this.errorCount++;
      this.circuitBreakerFailureCount++;
      this.UpdateCircuitBreaker(false);
      console.error(
        "[MountainClientService] Health check failed:",
        error
      );
      if (this.connectionState !== "CONNECTED" /* Connected */) {
        console.log(
          "[MountainClientService] Connection lost, attempting reconnect"
        );
        this.reconnect().catch((err) => {
          console.error(
            "[MountainClientService] Auto-reconnect failed:",
            err
          );
        });
      }
    }
  }
  /**
   * Send notification to Mountain
   */
  async sendNotification(method, parameters) {
    if (this.connectionState !== "CONNECTED" /* Connected */ || !this.client) {
      throw new Error("Not connected to Mountain");
    }
    const TraceGrpcVerbose = typeof process !== "undefined" && typeof process.env["LAND_DEV_LOG"] === "string" && process.env["LAND_DEV_LOG"].includes("grpc-verbose");
    if (TraceGrpcVerbose) {
      console.log(
        `[MountainClientService] Sending notification to Mountain: ${method}`
      );
    }
    try {
      const notification = {
        Method: method,
        Parameter: Buffer.from(JSON.stringify(parameters))
      };
      await this.makeNotification(notification);
      if (TraceGrpcVerbose) {
        console.log(
          `[MountainClientService] Notification ${method} sent successfully`
        );
      }
    } catch (error) {
      this.errorCount++;
      console.error(
        `[MountainClientService] Notification ${method} failed:`,
        error
      );
      console.warn(
        `[MountainClientService] Notification ${method} failed, but continuing (fire-and-forget)`
      );
    }
  }
  /**
   * Make gRPC notification with promise interface
   */
  async makeNotification(notification) {
    if (!this.client) {
      throw new Error("Client not initialized");
    }
    try {
      await new Promise((resolve, reject) => {
        this.client.SendCocoonNotification(
          notification,
          (error) => {
            if (error) reject(error);
            else resolve();
          }
        );
      });
    } catch (error) {
      throw error;
    }
  }
  /**
   * Cancel operation
   */
  async cancelOperation(requestIdentifier, reason) {
    if (this.connectionState !== "CONNECTED" /* Connected */ || !this.client) {
      throw new Error("Not connected to Mountain");
    }
    console.log(
      `[MountainClientService] Canceling operation: ${requestIdentifier}, reason: ${reason}`
    );
    try {
      const cancelRequest = {
        RequestIdentifierToCancel: BigInt(requestIdentifier)
        // Use BigInt for uint64 compatibility
      };
      await this.makeCancelRequest(cancelRequest);
      console.log(
        `[MountainClientService] Operation ${requestIdentifier} canceled`
      );
    } catch (error) {
      this.errorCount++;
      console.error(
        `[MountainClientService] Cancel operation ${requestIdentifier} failed:`,
        error
      );
      console.warn(
        `[MountainClientService] Cancel operation ${requestIdentifier} failed, but continuing`
      );
    }
  }
  /**
   * Make gRPC cancel request with promise interface
   */
  async makeCancelRequest(cancelRequest) {
    if (!this.client) {
      throw new Error("Client not initialized");
    }
    try {
      await new Promise((resolve, reject) => {
        this.client.CancelOperation(cancelRequest, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    } catch (error) {
      throw error;
    }
  }
  /**
   * Generate unique request identifier
   */
  generateRequestId() {
    return ++this.requestCounter;
  }
  /**
   * Disconnect from Mountain
   */
  async disconnect() {
    if (this.connectionState !== "CONNECTED" /* Connected */ || !this.client) {
      console.warn(
        "[MountainClientService] Not connected to Mountain (already disconnected)"
      );
      return;
    }
    console.log("[MountainClientService] Disconnecting from Mountain");
    this.stopHealthMonitoring();
    this.client = null;
    this.connectionState = "DISCONNECTED" /* Disconnected */;
    console.log("[MountainClientService] Disconnected from Mountain");
  }
  /**
   * Reconnect to Mountain
   */
  async reconnect() {
    console.log("[MountainClientService] Reconnecting to Mountain");
    await this.disconnect();
    await this.connect();
    console.log("[MountainClientService] Reconnected to Mountain");
  }
  /**
   * Get connection status with circuit breaker information
   */
  getStatus() {
    const IsConnected = this.connectionState === "CONNECTED" /* Connected */;
    return {
      connected: IsConnected,
      mountainHost: this.mountainHost,
      mountainPort: this.mountainPort,
      errorCount: this.errorCount,
      ...IsConnected ? { uptime: Date.now() - this.connectionStartTime } : {},
      circuitBreakerState: this.circuitBreakerState,
      circuitBreakerFailureCount: this.circuitBreakerFailureCount,
      ...this.lastHealthCheck ? { lastHealthCheck: new Date(this.lastHealthCheck) } : {}
    };
  }
};
var MountainClientServiceLayer = IMountainClientService.Default;
export {
  MountainClientService,
  MountainClientServiceLayer
};
//# sourceMappingURL=MountainClientService.js.map
