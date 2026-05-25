var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// Source/Interfaces/I/Mountain/Client/Service.ts
import * as Effect from "effect/Effect";
var IMountainClientService;
var init_Service = __esm({
  "Source/Interfaces/I/Mountain/Client/Service.ts"() {
    "use strict";
    IMountainClientService = Effect.Service()(
      "Service/MountainClient",
      {
        effect: Effect.gen(function* () {
          return {};
        })
      }
    );
  }
});

// Source/Services/Dev/Log.ts
var Raw, ParsedTags, TagSet, IsShort, HasAll, IsEnabled, CocoonDevLog3, Log_default;
var init_Log = __esm({
  "Source/Services/Dev/Log.ts"() {
    "use strict";
    Raw = process.env["Trace"] ?? "";
    ParsedTags = Raw.split(",").map((Segment) => Segment.trim().toLowerCase()).filter((Segment) => Segment.length > 0);
    TagSet = new Set(ParsedTags);
    IsShort = TagSet.has("short");
    HasAll = TagSet.has("all");
    IsEnabled = /* @__PURE__ */ __name((Tag) => {
      if (TagSet.size === 0) return false;
      if (HasAll || IsShort) return true;
      return TagSet.has(Tag.toLowerCase());
    }, "IsEnabled");
    CocoonDevLog3 = /* @__PURE__ */ __name((Tag, Message) => {
      if (!IsEnabled(Tag)) return;
      const TagUpper = Tag.toUpperCase();
      process.stdout.write(`[DEV:${TagUpper}] ${Message}
`);
    }, "CocoonDevLog");
    Log_default = CocoonDevLog3;
  }
});

// Source/Services/Mountain/Client/Service.ts
var Service_exports = {};
__export(Service_exports, {
  MountainClientService: () => MountainClientService,
  MountainClientServiceLayer: () => MountainClientServiceLayer
});
import { createRequire } from "module";
import { dirname } from "path";
import { fileURLToPath } from "url";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { v4 as uuidv4 } from "uuid";
var __filename, __dirname, require2, CircuitBreakerState, ConnectionState, MountainClientService, MountainClientServiceLayer;
var init_Service2 = __esm({
  "Source/Services/Mountain/Client/Service.ts"() {
    "use strict";
    init_Service();
    init_Log();
    __filename = fileURLToPath(import.meta.url);
    __dirname = dirname(__filename);
    require2 = createRequire(import.meta.url);
    CircuitBreakerState = /* @__PURE__ */ ((CircuitBreakerState2) => {
      CircuitBreakerState2["Closed"] = "CLOSED";
      CircuitBreakerState2["Open"] = "OPEN";
      CircuitBreakerState2["HalfOpen"] = "HALF_OPEN";
      return CircuitBreakerState2;
    })(CircuitBreakerState || {});
    ConnectionState = /* @__PURE__ */ ((ConnectionState2) => {
      ConnectionState2["Disconnected"] = "DISCONNECTED";
      ConnectionState2["Connecting"] = "CONNECTING";
      ConnectionState2["Connected"] = "CONNECTED";
      ConnectionState2["Degraded"] = "DEGRADED";
      ConnectionState2["Failed"] = "FAILED";
      return ConnectionState2;
    })(ConnectionState || {});
    MountainClientService = class {
      static {
        __name(this, "MountainClientService");
      }
      _serviceBrand;
      // Core gRPC state
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
      // Circuit breaker
      circuitBreakerState = "CLOSED" /* Closed */;
      circuitBreakerFailureCount = 0;
      circuitBreakerSuccessCount = 0;
      circuitBreakerThreshold = 5;
      circuitBreakerSuccessThreshold = 3;
      circuitBreakerTimeout = 6e4;
      // 60s recovery timeout
      circuitBreakerOpenTime = 0;
      circuitBreakerHalfOpenAttempts = 0;
      // Retry config with exponential backoff
      maxRetries = 3;
      baseRetryDelay = 1e3;
      maxRetryDelay = 1e4;
      retryJitterFactor = 0.2;
      // Health monitoring
      healthCheckInterval = null;
      healthCheckPeriod = 3e4;
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
        CocoonDevLog3(
          "mountain-client",
          `[MountainClientService] Initializing Mountain gRPC client (ID: ${this.clientId})`
        );
        this.parseEnvironment();
        CocoonDevLog3(
          "mountain-client",
          `[MountainClientService] Configured for ${this.mountainHost}:${this.mountainPort}, Session: ${this.sessionId}`
        );
        this.registerShutdownHandlers();
      }
      /**
       * Parse environment variables
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
        CocoonDevLog3(
          "mountain-client",
          `[MountainClientService] Environment parsed: MOUNTAIN_CONNECTION_HOST=${this.mountainHost}, MOUNTAIN_GRPC_PORT=${this.mountainPort}, MAX_RETRIES=${this.maxRetries}`
        );
        if (!this.isValidHost(this.mountainHost)) {
          throw new Error(`Invalid Mountain host: ${this.mountainHost}`);
        }
        if (this.mountainPort < 1 || this.mountainPort > 65535) {
          throw new Error(`Invalid Mountain port: ${this.mountainPort}`);
        }
        if (this.maxRetries < 0 || this.maxRetries > 10) {
          CocoonDevLog3(
            "mountain-client",
            `[MountainClientService] Invalid max retries: ${this.maxRetries}, using default: 3`
          );
          this.maxRetries = 3;
        }
        if (this.healthCheckPeriod < 5e3 || this.healthCheckPeriod > 12e4) {
          CocoonDevLog3(
            "mountain-client",
            `[MountainClientService] Invalid health check period: ${this.healthCheckPeriod}ms, using default: 30000ms`
          );
          this.healthCheckPeriod = 3e4;
        }
      }
      /**
       * Validate host configuration
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
       * Register shutdown handlers
       */
      registerShutdownHandlers() {
        process.on("SIGTERM", () => {
          CocoonDevLog3(
            "mountain-client",
            "[MountainClientService] Received SIGTERM, shutting down gracefully"
          );
          this.disconnect().catch((error) => {
            CocoonDevLog3(
              "mountain-client",
              "[MountainClientService] Graceful shutdown failed:",
              error
            );
          });
        });
        process.on("SIGINT", () => {
          CocoonDevLog3(
            "mountain-client",
            "[MountainClientService] Received SIGINT, shutting down gracefully"
          );
          this.disconnect().catch((error) => {
            CocoonDevLog3(
              "mountain-client",
              "[MountainClientService] Graceful shutdown failed:",
              error
            );
          });
        });
        if (typeof process !== "undefined" && process.env && process.env.VSCODE_PID) {
          CocoonDevLog3(
            "mountain-client",
            "[MountainClientService] Running in VS Code extension context"
          );
        }
      }
      /**
       * Connect to Mountain gRPC server
       */
      async connect() {
        this.CheckCircuitBreaker();
        if (this.connectionState === "CONNECTED" /* Connected */ || this.connectionState === "CONNECTING" /* Connecting */) {
          CocoonDevLog3(
            "mountain-client",
            `[MountainClientService] Already ${this.connectionState.toLowerCase()} to Mountain`
          );
          return;
        }
        CocoonDevLog3(
          "mountain-client",
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
          CocoonDevLog3(
            "mountain-client",
            `[MountainClientService] Successfully connected to Mountain (Session: ${this.sessionId})`
          );
          this.UpdateCircuitBreaker(true);
        } catch (error) {
          this.connectionState = "FAILED" /* Failed */;
          this.errorCount++;
          CocoonDevLog3(
            "mountain-client",
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
       * Load protocol definition with fallback strategies
       */
      async loadProtocolDefinition() {
        CocoonDevLog3(
          "mountain-client",
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
            CocoonDevLog3(
              "mountain-client",
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
            CocoonDevLog3(
              "mountain-client",
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
            CocoonDevLog3(
              "mountain-client",
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
          CocoonDevLog3(
            "mountain-client",
            "[MountainClientService] Failed to load protocol definition:",
            error
          );
          throw new Error(
            `Failed to load Vine.proto: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }
      /**
       * Wait for connection with timeout
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
                CocoonDevLog3(
                  "mountain-client",
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
       * Send request to Mountain with circuit breaker and retry logic
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
        if (typeof process !== "undefined" && typeof process.env["Trace"] === "string" && process.env["Trace"].includes("grpc-verbose")) {
          CocoonDevLog3(
            "mountain-client",
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
          if (method === "tree.register" && typeof process !== "undefined" && process.env["Trace"]?.includes("tree-latency")) {
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
            const RpcCode = Number(rpcError.Code ?? 0);
            const IsFileSystemMethod = method === "FileSystem.ReadFile" || method === "FileSystem.Stat" || method === "FileSystem.ReadDirectory";
            const IsFileWatcherBenign = method === "FileWatcher.Register" && /no path was found|no such file or directory|entity not found|path not found|os error 2|enoent/i.test(
              RpcMessage
            );
            const IsBenignNotFound = IsFileSystemMethod && (RpcCode === -32004 || /resource not found|ENOENT|not found|no such file or directory|entity not found|os error 2|path is outside of the registered workspace|permission denied for operation|workspace is not trusted/i.test(
              RpcMessage
            )) || IsFileWatcherBenign;
            if (!IsBenignNotFound) {
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
          if (typeof process !== "undefined" && typeof process.env["Trace"] === "string" && process.env["Trace"].includes("grpc-verbose")) {
            CocoonDevLog3(
              "mountain-client",
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
          const ErrorCode = Number(
            error?.code ?? 0
          );
          const IsCatchBenignFsMethod = method === "FileSystem.ReadFile" || method === "FileSystem.Stat" || method === "FileSystem.ReadDirectory";
          const IsCatchBenignFileWatcher = method === "FileWatcher.Register" && /no path was found|no such file or directory|entity not found|path not found|os error 2|enoent/i.test(
            ErrorMessage
          );
          const IsBenignNotFound = IsCatchBenignFsMethod && (ErrorCode === -32004 || /resource not found|ENOENT|not found|no such file or directory|entity not found|os error 2|path is outside of the registered workspace|permission denied for operation|workspace is not trusted/i.test(
            ErrorMessage
          )) || IsCatchBenignFileWatcher;
          const IsBenignMissingCommand = method === "Command.Execute" && /Command '[^']+' not found/i.test(ErrorMessage);
          const TraceMountainClient = process.env["Trace"]?.includes(
            "mountain-client-verbose"
          );
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
            this.UpdateCircuitBreaker(false, error);
            CocoonDevLog3(
              "mountain-client",
              `[MountainClientService] Request ${method} failed after ${duration}ms:`,
              error
            );
          }
          if (cancellationToken?.isCancellationRequested) {
            CocoonDevLog3(
              "mountain-client",
              `[MountainClientService] Request ${requestIdentifier} was cancelled`
            );
            throw new Error(`Request ${requestIdentifier} was cancelled`);
          }
          if (this.isConnectionError(error)) {
            CocoonDevLog3(
              "mountain-client",
              "[MountainClientService] Connection error detected, attempting auto-reconnect"
            );
            try {
              await this.reconnect();
              CocoonDevLog3(
                "mountain-client",
                "[MountainClientService] Auto-reconnect successful, retrying request"
              );
              return this.sendRequest(
                method,
                parameters,
                cancellationToken
              );
            } catch (reconnectError) {
              CocoonDevLog3(
                "mountain-client",
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
       * Track request metrics
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
        if (typeof process !== "undefined" && typeof process.env["Trace"] === "string" && process.env["Trace"].includes("grpc-verbose")) {
          CocoonDevLog3(
            "mountain-client",
            `[MountainClientService] Request metrics: ${method}, ${duration}ms, success: ${success}`
          );
        }
      }
      /**
       * Check if error is a connection error
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
       * Send request with exponential backoff retry
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
              CocoonDevLog3(
                "mountain-client",
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
          CocoonDevLog3(
            "mountain-client",
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
          CocoonDevLog3(
            "mountain-client",
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
            CocoonDevLog3(
              "mountain-client",
              "[MountainClientService] Circuit breaker transitioning to CLOSED (service recovered)"
            );
            CocoonDevLog3(
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
            CocoonDevLog3(
              "mountain-client",
              `[MountainClientService] Circuit breaker OPENED after ${this.circuitBreakerFailureCount} failures`
            );
            CocoonDevLog3(
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
            CocoonDevLog3(
              "mountain-client",
              "[MountainClientService] Circuit breaker transitioning to HALF_OPEN for recovery"
            );
            CocoonDevLog3(
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
        CocoonDevLog3(
          "mountain-client",
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
          CocoonDevLog3(
            "mountain-client",
            "[MountainClientService] Health monitoring stopped"
          );
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
            const state = channel.getConnectivityState(true);
            if (state !== grpc.connectivityState.READY) {
              await new Promise((resolve, reject) => {
                const deadline = Date.now() + 3e3;
                const poll = /* @__PURE__ */ __name(() => {
                  const st = channel.getConnectivityState(false);
                  if (st === grpc.connectivityState.READY) {
                    resolve();
                  } else if (st === grpc.connectivityState.TRANSIENT_FAILURE || st === grpc.connectivityState.SHUTDOWN) {
                    reject(
                      new Error(
                        `Channel in terminal state: ${grpc.connectivityState[st]}`
                      )
                    );
                  } else if (Date.now() >= deadline) {
                    reject(
                      new Error(
                        `Channel not ready after 3s (state: ${st})`
                      )
                    );
                  } else {
                    setTimeout(poll, 100);
                  }
                }, "poll");
                setTimeout(poll, 100);
              });
            }
          }
          this.consecutiveSuccessfulHealthChecks++;
          CocoonDevLog3(
            "mountain-client",
            `[MountainClientService] Health check passed (consecutive successes: ${this.consecutiveSuccessfulHealthChecks})`
          );
          if (this.consecutiveSuccessfulHealthChecks >= 3 && this.circuitBreakerState === "HALF_OPEN" /* HalfOpen */) {
            this.UpdateCircuitBreaker(true);
          }
        } catch (error) {
          this.consecutiveSuccessfulHealthChecks = 0;
          this.errorCount++;
          this.UpdateCircuitBreaker(false);
          CocoonDevLog3(
            "mountain-client",
            "[MountainClientService] Health check failed:",
            error
          );
          if (this.connectionState !== "CONNECTED" /* Connected */) {
            CocoonDevLog3(
              "mountain-client",
              "[MountainClientService] Connection lost, attempting reconnect"
            );
            this.reconnect().catch((err) => {
              CocoonDevLog3(
                "mountain-client",
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
        const TraceGrpcVerbose = typeof process !== "undefined" && typeof process.env["Trace"] === "string" && process.env["Trace"].includes("grpc-verbose");
        if (TraceGrpcVerbose) {
          CocoonDevLog3(
            "mountain-client",
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
            CocoonDevLog3(
              "mountain-client",
              `[MountainClientService] Notification ${method} sent successfully`
            );
          }
        } catch (error) {
          this.errorCount++;
          CocoonDevLog3(
            "mountain-client",
            `[MountainClientService] Notification ${method} failed:`,
            error
          );
          CocoonDevLog3(
            "mountain-client",
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
        CocoonDevLog3(
          "mountain-client",
          `[MountainClientService] Canceling operation: ${requestIdentifier}, reason: ${reason}`
        );
        try {
          const cancelRequest = {
            RequestIdentifierToCancel: BigInt(requestIdentifier)
            // Use BigInt for uint64 compatibility
          };
          await this.makeCancelRequest(cancelRequest);
          CocoonDevLog3(
            "mountain-client",
            `[MountainClientService] Operation ${requestIdentifier} canceled`
          );
        } catch (error) {
          this.errorCount++;
          CocoonDevLog3(
            "mountain-client",
            `[MountainClientService] Cancel operation ${requestIdentifier} failed:`,
            error
          );
          CocoonDevLog3(
            "mountain-client",
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
          CocoonDevLog3(
            "mountain-client",
            "[MountainClientService] Not connected to Mountain (already disconnected)"
          );
          return;
        }
        CocoonDevLog3(
          "mountain-client",
          "[MountainClientService] Disconnecting from Mountain"
        );
        this.stopHealthMonitoring();
        this.client = null;
        this.connectionState = "DISCONNECTED" /* Disconnected */;
        CocoonDevLog3(
          "mountain-client",
          "[MountainClientService] Disconnected from Mountain"
        );
      }
      /**
       * Reconnect to Mountain
       */
      async reconnect() {
        CocoonDevLog3(
          "mountain-client",
          "[MountainClientService] Reconnecting to Mountain"
        );
        await this.disconnect();
        await this.connect();
        CocoonDevLog3(
          "mountain-client",
          "[MountainClientService] Reconnected to Mountain"
        );
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
    MountainClientServiceLayer = IMountainClientService.Default;
  }
});

// Source/Interfaces/I/Configuration/Service.ts
import { Context } from "effect";
var ConfigurationScope = /* @__PURE__ */ ((ConfigurationScope3) => {
  ConfigurationScope3["APPLICATION"] = "APPLICATION";
  ConfigurationScope3["WORKSPACE"] = "WORKSPACE";
  ConfigurationScope3["PROFILE"] = "PROFILE";
  return ConfigurationScope3;
})(ConfigurationScope || {});
var IConfigurationService = Context.Tag(
  "IConfigurationService"
);

// Source/Services/File/System/Service.ts
init_Service();
import { Context as Context2, Effect as Effect2, Layer } from "effect";
var IFileSystemService = Context2.Tag();
var FileSystemService = class {
  constructor(mountainClient) {
    this.mountainClient = mountainClient;
  }
  mountainClient;
  static {
    __name(this, "FileSystemService");
  }
  async stat(uri) {
    const Path = uri.fsPath ?? uri.path ?? uri.toString().replace("file://", "");
    const Response = await this.mountainClient.sendRequest(
      "FileSystem.Stat",
      Path
    );
    if (!Response) throw new Error(`File not found: ${Path}`);
    return {
      type: Response.type ?? 1,
      ctime: 0,
      mtime: Response.mtime ?? 0,
      size: Response.size ?? 0
    };
  }
  async readFile(uri) {
    if (uri.scheme !== "file") {
      throw new Error(`Unsupported scheme: ${uri.scheme}`);
    }
    const response = await this.mountainClient.sendRequest(
      "FileSystem.ReadFile",
      uri.fsPath
    );
    return response;
  }
  async writeFile(uri, content) {
    if (uri.scheme !== "file") {
      throw new Error(`Unsupported scheme: ${uri.scheme}`);
    }
    await this.mountainClient.sendRequest("FileSystem.WriteFile", {
      path: uri.fsPath,
      content: Array.from(content)
      // Serialize buffer to array
    });
  }
  async readDirectory(uri) {
    if (uri.scheme !== "file") {
      throw new Error(`Unsupported scheme: ${uri.scheme}`);
    }
    const Path = uri.fsPath ?? uri.path ?? uri.toString().replace("file://", "");
    const Entries = await this.mountainClient.sendRequest(
      "FileSystem.ReadDirectory",
      Path
    );
    return (Entries ?? []).map(
      (E) => typeof E === "string" ? [E, 1] : [E.name, E.type]
    );
  }
  async createDirectory(uri) {
    await this.mountainClient.sendRequest(
      "FileSystem.CreateDirectory",
      uri.fsPath
    );
  }
  async delete(uri, _options) {
    await this.mountainClient.sendRequest("FileSystem.Delete", uri.fsPath);
  }
  async rename(source, target, _options) {
    await this.mountainClient.sendRequest("FileSystem.Rename", {
      from: source.fsPath,
      to: target.fsPath
    });
  }
};
var FileSystemServiceLayer = Layer.effect(
  IFileSystemService,
  Effect2.gen(function* () {
    const mountainClient = yield* IMountainClientService;
    return new FileSystemService(mountainClient);
  })
);

// Source/Interfaces/I/Module/Interceptor/Service.ts
import { Context as Context3 } from "effect";
var SecurityLevel = /* @__PURE__ */ ((SecurityLevel3) => {
  SecurityLevel3["TRUSTED"] = "TRUSTED";
  SecurityLevel3["SANDBOXED"] = "SANDBOXED";
  SecurityLevel3["RESTRICTED"] = "RESTRICTED";
  SecurityLevel3["BLOCKED"] = "BLOCKED";
  return SecurityLevel3;
})(SecurityLevel || {});
var IModuleInterceptorService = Context3.Tag(
  "IModuleInterceptorService"
);

// Source/Interfaces/I/Terminal/Service.ts
import { Context as Context4 } from "effect";
var ITerminalService = Context4.Tag();

// Source/Services/Language/Provider/Registry.ts
var Callbacks = /* @__PURE__ */ new Map();
function Register(Handle, Provider) {
  Callbacks.set(Handle, Provider);
}
__name(Register, "Register");
function Unregister(Handle) {
  Callbacks.delete(Handle);
}
__name(Unregister, "Unregister");
function Get(Handle) {
  const Provider = Callbacks.get(Handle);
  if (process.env.Trace) {
    CocoonDevLog(
      "registry",
      `[DEV:LANG] Get(handle=${Handle}) resolved=${Boolean(Provider)} (total_registered=${Callbacks.size})`
    );
  }
  return Provider;
}
__name(Get, "Get");
var NextHandle = 1e4;
function RegisterAutoHandle(Provider) {
  const Handle = NextHandle++;
  Callbacks.set(Handle, Provider);
  return Handle;
}
__name(RegisterAutoHandle, "RegisterAutoHandle");
function NextProviderHandle() {
  return NextHandle++;
}
__name(NextProviderHandle, "NextProviderHandle");
var Commands = /* @__PURE__ */ new Map();
function RegisterCommand(CommandId, Callback) {
  Commands.set(CommandId, Callback);
}
__name(RegisterCommand, "RegisterCommand");
function HasCommand(CommandId) {
  return Commands.has(CommandId);
}
__name(HasCommand, "HasCommand");
function ExecuteCommand(CommandId, ...Args) {
  const Handler = Commands.get(CommandId);
  if (Handler) return Handler(...Args);
  return void 0;
}
__name(ExecuteCommand, "ExecuteCommand");
function UnregisterCommand(CommandId) {
  Commands.delete(CommandId);
}
__name(UnregisterCommand, "UnregisterCommand");
function ListCommands() {
  return Array.from(Commands.keys());
}
__name(ListCommands, "ListCommands");
function ListHandles() {
  return Array.from(Callbacks.keys());
}
__name(ListHandles, "ListHandles");

// Source/Services/API/Factory/Service.ts
init_Service();
import { Context as Context5, Effect as Effect3, Layer as Layer2 } from "effect";
var VsCodeTypes = await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/workbench/api/common/extHostTypes.js");
var { URI } = await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/uri.js");
var { CancellationTokenSource, CancellationToken } = await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/cancellation.js");
var { Emitter } = await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/event.js");
var StockRelativePattern = VsCodeTypes.RelativePattern;
var HydrateBase = /* @__PURE__ */ __name((Base) => {
  if (Base == null) return Base;
  if (typeof Base === "string") return Base;
  if (Base instanceof URI) return Base;
  if (typeof Base.uri !== "undefined") {
    const Uri = Base.uri;
    if (Uri instanceof URI) return Base;
    let Revived;
    if (typeof Uri === "string") {
      if (Uri.length === 0) {
        Revived = void 0;
      } else {
        try {
          Revived = URI.parse(Uri);
        } catch {
          Revived = void 0;
        }
      }
    } else {
      try {
        Revived = URI.revive(Uri);
      } catch {
        Revived = void 0;
      }
    }
    return { ...Base, uri: Revived };
  }
  try {
    const Revived = URI.revive(Base);
    return Revived ?? Base;
  } catch {
    return Base;
  }
}, "HydrateBase");
var PatchedRelativePattern = /* @__PURE__ */ __name(function RelativePattern(Base, Pattern) {
  const Safe = HydrateBase(Base);
  return Reflect.construct(
    StockRelativePattern,
    [Safe, Pattern],
    PatchedRelativePattern
  );
}, "RelativePattern");
PatchedRelativePattern.prototype = StockRelativePattern.prototype;
Object.setPrototypeOf(PatchedRelativePattern, StockRelativePattern);
var IAPIFactoryService = Context5.Tag();
var createVSCodeAPI = /* @__PURE__ */ __name((mountainClient, configService, fsService, terminalService) => {
  return {
    version: "1.88.0",
    // --- Type Constructors (real VS Code classes from @codeeditorland/output) ---
    Position: VsCodeTypes.Position,
    Range: VsCodeTypes.Range,
    Location: VsCodeTypes.Location,
    Selection: VsCodeTypes.Selection,
    MarkdownString: VsCodeTypes.MarkdownString,
    Hover: VsCodeTypes.Hover,
    CompletionItem: VsCodeTypes.CompletionItem,
    CompletionItemKind: VsCodeTypes.CompletionItemKind,
    CompletionItemTag: VsCodeTypes.CompletionItemTag,
    CompletionList: VsCodeTypes.CompletionList,
    CompletionTriggerKind: VsCodeTypes.CompletionTriggerKind,
    Diagnostic: VsCodeTypes.Diagnostic,
    DiagnosticSeverity: VsCodeTypes.DiagnosticSeverity,
    DiagnosticTag: VsCodeTypes.DiagnosticTag,
    DiagnosticRelatedInformation: VsCodeTypes.DiagnosticRelatedInformation,
    TextEdit: VsCodeTypes.TextEdit,
    WorkspaceEdit: VsCodeTypes.WorkspaceEdit,
    SnippetString: VsCodeTypes.SnippetString,
    SnippetTextEdit: VsCodeTypes.SnippetTextEdit,
    SymbolKind: VsCodeTypes.SymbolKind,
    SymbolInformation: VsCodeTypes.SymbolInformation,
    DocumentSymbol: VsCodeTypes.DocumentSymbol,
    CodeActionKind: VsCodeTypes.CodeActionKind,
    CodeAction: VsCodeTypes.CodeAction,
    CodeActionTriggerKind: VsCodeTypes.CodeActionTriggerKind,
    SignatureHelp: VsCodeTypes.SignatureHelp,
    SignatureHelpTriggerKind: VsCodeTypes.SignatureHelpTriggerKind,
    SignatureInformation: VsCodeTypes.SignatureInformation,
    ParameterInformation: VsCodeTypes.ParameterInformation,
    InlayHint: VsCodeTypes.InlayHint,
    InlayHintKind: VsCodeTypes.InlayHintKind,
    InlayHintLabelPart: VsCodeTypes.InlayHintLabelPart,
    FoldingRange: VsCodeTypes.FoldingRange,
    FoldingRangeKind: VsCodeTypes.FoldingRangeKind,
    DocumentHighlight: VsCodeTypes.DocumentHighlight,
    DocumentHighlightKind: VsCodeTypes.DocumentHighlightKind,
    DocumentLink: VsCodeTypes.DocumentLink,
    SelectionRange: VsCodeTypes.SelectionRange,
    SemanticTokensLegend: VsCodeTypes.SemanticTokensLegend,
    SemanticTokensBuilder: VsCodeTypes.SemanticTokensBuilder,
    SemanticTokens: VsCodeTypes.SemanticTokens,
    RelativePattern: PatchedRelativePattern,
    Disposable: VsCodeTypes.Disposable,
    StatusBarAlignment: VsCodeTypes.StatusBarAlignment,
    ThemeColor: VsCodeTypes.ThemeColor,
    ThemeIcon: VsCodeTypes.ThemeIcon,
    TreeItem: VsCodeTypes.TreeItem,
    TreeItemCollapsibleState: VsCodeTypes.TreeItemCollapsibleState,
    ViewColumn: VsCodeTypes.ViewColumn,
    EndOfLine: VsCodeTypes.EndOfLine,
    FileSystemError: VsCodeTypes.FileSystemError,
    FileChangeType: VsCodeTypes.FileChangeType,
    ConfigurationTarget: VsCodeTypes.ConfigurationTarget,
    DecorationRangeBehavior: VsCodeTypes.DecorationRangeBehavior,
    TextDocumentSaveReason: VsCodeTypes.TextDocumentSaveReason,
    // These enums are declared in vs/editor/common/config/editorOptions.ts
    // and vs/workbench/services/extensions/common/extensionHostProtocol.ts
    // respectively, but extHostTypes.js doesn't re-export them. Extensions
    // (vscodevim, gitlens) crash at activation reading .Line / .Web off
    // undefined. Inline the literal enum values so the API surface matches
    // what extensions expect. Keep in sync with the upstream enums.
    TextEditorCursorStyle: {
      Line: 1,
      Block: 2,
      Underline: 3,
      LineThin: 4,
      BlockOutline: 5,
      UnderlineThin: 6
    },
    UIKind: { Desktop: 1, Web: 2 },
    // URI is exposed as 'Uri' to match the vscode API surface
    Uri: URI,
    CancellationTokenSource,
    CancellationToken,
    // Emitter is the vscode.EventEmitter equivalent
    EventEmitter: Emitter,
    // --- Window Namespace ---
    window: {
      showInformationMessage: /* @__PURE__ */ __name(async (message, ..._items) => {
        await mountainClient.sendRequest("Window.ShowMessage", {
          title: "Information",
          message,
          level: "info"
        });
        return void 0;
      }, "showInformationMessage"),
      showErrorMessage: /* @__PURE__ */ __name(async (message, ..._items) => {
        await mountainClient.sendRequest("Window.ShowMessage", {
          title: "Error",
          message,
          level: "error"
        });
        return void 0;
      }, "showErrorMessage"),
      showWarningMessage: /* @__PURE__ */ __name(async (message, ..._items) => {
        await mountainClient.sendRequest("Window.ShowMessage", {
          title: "Warning",
          message,
          level: "warn"
        });
        return void 0;
      }, "showWarningMessage"),
      createTerminal: /* @__PURE__ */ __name((options) => {
        const name = typeof options === "string" ? options : options.name;
        const shellPath = typeof options === "object" ? options.shellPath : void 0;
        const cwd = typeof options === "object" ? options.cwd : void 0;
        const terminalIdPromise = terminalService.createTerminal(
          name,
          shellPath,
          cwd
        );
        return {
          name,
          sendText: /* @__PURE__ */ __name(async (text) => {
            const id = await terminalIdPromise;
            await terminalService.sendText(id, text);
          }, "sendText"),
          show: /* @__PURE__ */ __name(() => {
          }, "show"),
          hide: /* @__PURE__ */ __name(() => {
          }, "hide"),
          dispose: /* @__PURE__ */ __name(async () => {
            const id = await terminalIdPromise;
            await terminalService.kill(id);
          }, "dispose")
        };
      }, "createTerminal"),
      createStatusBarItem: /* @__PURE__ */ __name((_alignment, _priority) => ({
        show: /* @__PURE__ */ __name(() => {
        }, "show"),
        hide: /* @__PURE__ */ __name(() => {
        }, "hide"),
        dispose: /* @__PURE__ */ __name(() => {
        }, "dispose"),
        text: "",
        tooltip: "",
        command: void 0
      }), "createStatusBarItem"),
      createOutputChannel: /* @__PURE__ */ __name((_name) => ({
        append: /* @__PURE__ */ __name((_value) => {
        }, "append"),
        appendLine: /* @__PURE__ */ __name((_value) => {
        }, "appendLine"),
        clear: /* @__PURE__ */ __name(() => {
        }, "clear"),
        show: /* @__PURE__ */ __name(() => {
        }, "show"),
        hide: /* @__PURE__ */ __name(() => {
        }, "hide"),
        dispose: /* @__PURE__ */ __name(() => {
        }, "dispose")
      }), "createOutputChannel"),
      withProgress: /* @__PURE__ */ __name(async (_options, task) => {
        return task({ report: /* @__PURE__ */ __name((_value) => {
        }, "report") });
      }, "withProgress"),
      // Terminal shell-integration events. Land doesn't track shell
      // integration, so extensions (openai.chatgpt) that subscribe get
      // a never-firing event that still registers/disposes cleanly.
      // Must be a function returning IDisposable - not just an object -
      // because `vscode.window.onDidChangeTerminalShellIntegration(cb)`
      // is called as a function by the extension.
      onDidChangeTerminalShellIntegration: /* @__PURE__ */ __name((_Listener) => ({
        dispose: /* @__PURE__ */ __name(() => {
        }, "dispose")
      }), "onDidChangeTerminalShellIntegration"),
      onDidStartTerminalShellExecution: /* @__PURE__ */ __name((_Listener) => ({
        dispose: /* @__PURE__ */ __name(() => {
        }, "dispose")
      }), "onDidStartTerminalShellExecution"),
      onDidEndTerminalShellExecution: /* @__PURE__ */ __name((_Listener) => ({
        dispose: /* @__PURE__ */ __name(() => {
        }, "dispose")
      }), "onDidEndTerminalShellExecution")
    },
    // --- Workspace Namespace ---
    workspace: {
      workspaceFolders: [],
      getConfiguration: /* @__PURE__ */ __name((section) => {
        return {
          get: /* @__PURE__ */ __name((key, defaultValue) => {
            const fullKey = section ? `${section}.${key}` : key;
            return configService.getValue(fullKey, 0, defaultValue);
          }, "get"),
          update: /* @__PURE__ */ __name(async (key, value, target) => {
            const fullKey = section ? `${section}.${key}` : key;
            await configService.setValue(fullKey, value, target);
          }, "update"),
          has: /* @__PURE__ */ __name((key) => configService.hasKey(
            section ? `${section}.${key}` : key,
            0
          ), "has"),
          inspect: /* @__PURE__ */ __name((key) => configService.inspect(
            section ? `${section}.${key}` : key,
            0
          ), "inspect")
        };
      }, "getConfiguration"),
      // Filesystem API (Real Implementation)
      fs: {
        stat: /* @__PURE__ */ __name((uri) => fsService.stat(uri), "stat"),
        readFile: /* @__PURE__ */ __name((uri) => fsService.readFile(uri), "readFile"),
        writeFile: /* @__PURE__ */ __name((uri, content) => fsService.writeFile(uri, content), "writeFile"),
        readDirectory: /* @__PURE__ */ __name((uri) => fsService.readDirectory(uri), "readDirectory"),
        createDirectory: /* @__PURE__ */ __name((uri) => fsService.createDirectory(uri), "createDirectory"),
        delete: /* @__PURE__ */ __name((uri, options) => fsService.delete(uri, options), "delete"),
        rename: /* @__PURE__ */ __name((source, target, options) => fsService.rename(source, target, options), "rename")
      },
      findFiles: /* @__PURE__ */ __name(async (_include) => [], "findFiles"),
      openTextDocument: /* @__PURE__ */ __name(async (uri) => ({
        getText: /* @__PURE__ */ __name(() => "", "getText"),
        uri,
        languageId: "plaintext",
        lineCount: 0,
        fileName: uri.fsPath || ""
      }), "openTextDocument")
    },
    // --- Commands Namespace ---
    commands: /* @__PURE__ */ (() => {
      const LocalHandlers = /* @__PURE__ */ new Map();
      return {
        registerCommand: /* @__PURE__ */ __name((command, callback) => {
          LocalHandlers.set(command, callback);
          mountainClient.sendNotification("registerCommand", {
            commandId: command,
            extensionId: "unknown",
            title: command
          }).catch(() => {
          });
          return {
            dispose: /* @__PURE__ */ __name(() => {
              LocalHandlers.delete(command);
              mountainClient.sendNotification("unregisterCommand", {
                commandId: command
              }).catch(() => {
              });
            }, "dispose")
          };
        }, "registerCommand"),
        executeCommand: /* @__PURE__ */ __name(async (command, ...args) => {
          const Local = LocalHandlers.get(command);
          if (Local !== void 0) {
            return Local(...args);
          }
          try {
            const Result = await mountainClient.sendRequest(
              "executeCommand",
              {
                commandId: command,
                arguments: args.map((Arg) => {
                  if (typeof Arg === "string")
                    return { stringValue: Arg };
                  if (typeof Arg === "number")
                    return { intValue: Arg };
                  if (typeof Arg === "boolean")
                    return { boolValue: Arg };
                  return { stringValue: JSON.stringify(Arg) };
                })
              }
            );
            return Result?.result;
          } catch (Error2) {
            const Message = String(Error2?.message ?? Error2);
            const IsNotFound = Message.includes("not found") || Message.includes("Command not found");
            const IsExtensionNamespaced = command.includes(".") && !command.startsWith("vscode.") && !command.startsWith("workbench.") && !command.startsWith("editor.");
            if (IsNotFound && IsExtensionNamespaced) {
              return void 0;
            }
            throw Error2;
          }
        }, "executeCommand"),
        getCommands: /* @__PURE__ */ __name(async () => {
          const Result = await mountainClient.sendRequest("executeCommand", {
            commandId: "_getCommands",
            arguments: []
          }).catch(() => null);
          return Array.isArray(Result?.result) ? Result.result : [];
        }, "getCommands")
      };
    })(),
    // --- Env Namespace ---
    env: {
      appName: "CodeEditorLand",
      appRoot: "/app",
      language: "en-US",
      clipboard: {
        readText: /* @__PURE__ */ __name(async () => "", "readText"),
        writeText: /* @__PURE__ */ __name(async (_value) => {
        }, "writeText")
      },
      openExternal: /* @__PURE__ */ __name(async (target) => {
        const Url = typeof target === "string" ? target : target?.toString?.() ?? "";
        await mountainClient.sendNotification("openExternal", {
          url: Url
        });
        return true;
      }, "openExternal"),
      uriScheme: "codeeditorland",
      appHost: "desktop",
      remoteName: "",
      isNewAppInstall: false,
      isTelemetryEnabled: false,
      onDidChangeTelemetryEnabled: {
        event: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
        }, "dispose") }), "event")
      }
    },
    // --- Extensions Namespace ---
    extensions: {
      getExtension: /* @__PURE__ */ __name((_id) => void 0, "getExtension"),
      all: []
    },
    // --- Languages Namespace ---
    // Full provider registration surface lifted from extHostLanguageFeatures.ts.
    // Each register*Provider sends a registration notification to Mountain so
    // the editor can dispatch feature requests back to Cocoon.
    languages: /* @__PURE__ */ (() => {
      let NextHandle2 = 1;
      const RegisterProvider = /* @__PURE__ */ __name((type, selector, provider) => {
        const Handle = NextHandle2++;
        Register(Handle, provider);
        mountainClient.sendNotification(`register_${type}`, {
          language_selector: typeof selector === "string" ? selector : JSON.stringify(selector),
          handle: Handle
        }).catch(() => {
        });
        return {
          dispose: /* @__PURE__ */ __name(() => Unregister(Handle), "dispose")
        };
      }, "RegisterProvider");
      return {
        getLanguages: /* @__PURE__ */ __name(() => [], "getLanguages"),
        setTextDocumentLanguage: /* @__PURE__ */ __name(async () => void 0, "setTextDocumentLanguage"),
        match: /* @__PURE__ */ __name(() => 0, "match"),
        createDiagnosticCollection: /* @__PURE__ */ __name((name) => {
          const Items = /* @__PURE__ */ new Map();
          return {
            name: name ?? "default",
            set: /* @__PURE__ */ __name((uri, diagnostics) => Items.set(
              uri?.toString?.() ?? String(uri),
              diagnostics
            ), "set"),
            delete: /* @__PURE__ */ __name((uri) => Items.delete(uri?.toString?.() ?? String(uri)), "delete"),
            clear: /* @__PURE__ */ __name(() => Items.clear(), "clear"),
            forEach: /* @__PURE__ */ __name((cb) => Items.forEach(cb), "forEach"),
            get: /* @__PURE__ */ __name((uri) => Items.get(uri?.toString?.() ?? String(uri)), "get"),
            has: /* @__PURE__ */ __name((uri) => Items.has(uri?.toString?.() ?? String(uri)), "has"),
            dispose: /* @__PURE__ */ __name(() => Items.clear(), "dispose")
          };
        }, "createDiagnosticCollection"),
        registerHoverProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("hover_provider", sel, p), "registerHoverProvider"),
        registerCompletionItemProvider: /* @__PURE__ */ __name((sel, p, ..._) => RegisterProvider("completion_item_provider", sel, p), "registerCompletionItemProvider"),
        registerDefinitionProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("definition_provider", sel, p), "registerDefinitionProvider"),
        registerReferenceProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("reference_provider", sel, p), "registerReferenceProvider"),
        registerCodeActionsProvider: /* @__PURE__ */ __name((sel, p, _meta) => RegisterProvider("code_actions_provider", sel, p), "registerCodeActionsProvider"),
        registerDocumentHighlightProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("document_highlight_provider", sel, p), "registerDocumentHighlightProvider"),
        registerDocumentSymbolProvider: /* @__PURE__ */ __name((sel, p, _meta) => RegisterProvider("document_symbol_provider", sel, p), "registerDocumentSymbolProvider"),
        registerWorkspaceSymbolProvider: /* @__PURE__ */ __name((p) => RegisterProvider("workspace_symbol_provider", "*", p), "registerWorkspaceSymbolProvider"),
        registerRenameProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("rename_provider", sel, p), "registerRenameProvider"),
        registerDocumentFormattingEditProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("document_formatting_provider", sel, p), "registerDocumentFormattingEditProvider"),
        registerDocumentRangeFormattingEditProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider(
          "document_range_formatting_provider",
          sel,
          p
        ), "registerDocumentRangeFormattingEditProvider"),
        registerOnTypeFormattingEditProvider: /* @__PURE__ */ __name((sel, p, _first, ..._more) => RegisterProvider("on_type_formatting_provider", sel, p), "registerOnTypeFormattingEditProvider"),
        registerSignatureHelpProvider: /* @__PURE__ */ __name((sel, p, ..._) => RegisterProvider("signature_help_provider", sel, p), "registerSignatureHelpProvider"),
        registerCodeLensProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("code_lens_provider", sel, p), "registerCodeLensProvider"),
        registerFoldingRangeProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("folding_range_provider", sel, p), "registerFoldingRangeProvider"),
        registerSelectionRangeProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("selection_range_provider", sel, p), "registerSelectionRangeProvider"),
        registerDocumentSemanticTokensProvider: /* @__PURE__ */ __name((sel, p, _legend) => RegisterProvider("semantic_tokens_provider", sel, p), "registerDocumentSemanticTokensProvider"),
        registerDocumentRangeSemanticTokensProvider: /* @__PURE__ */ __name((sel, p, _legend) => RegisterProvider("semantic_tokens_provider", sel, p), "registerDocumentRangeSemanticTokensProvider"),
        registerInlayHintsProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("inlay_hints_provider", sel, p), "registerInlayHintsProvider"),
        registerTypeHierarchyProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("type_hierarchy_provider", sel, p), "registerTypeHierarchyProvider"),
        registerCallHierarchyProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("call_hierarchy_provider", sel, p), "registerCallHierarchyProvider"),
        registerLinkedEditingRangeProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("linked_editing_range_provider", sel, p), "registerLinkedEditingRangeProvider"),
        registerDocumentLinkProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("document_link_provider", sel, p), "registerDocumentLinkProvider"),
        registerColorProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("color_provider", sel, p), "registerColorProvider"),
        registerImplementationProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("implementation_provider", sel, p), "registerImplementationProvider"),
        registerTypeDefinitionProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("type_definition_provider", sel, p), "registerTypeDefinitionProvider"),
        registerDeclarationProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("declaration_provider", sel, p), "registerDeclarationProvider"),
        registerEvaluatableExpressionProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("evaluatable_expression_provider", sel, p), "registerEvaluatableExpressionProvider"),
        registerInlineValuesProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("inline_values_provider", sel, p), "registerInlineValuesProvider"),
        setLanguageConfiguration: /* @__PURE__ */ __name((lang, config) => {
          mountainClient.sendNotification("set_language_configuration", {
            language: lang,
            configuration: config
          }).catch(() => {
          });
          return { dispose: /* @__PURE__ */ __name(() => {
          }, "dispose") };
        }, "setLanguageConfiguration")
      };
    })(),
    debug: {
      startDebugging: /* @__PURE__ */ __name(async () => false, "startDebugging"),
      activeDebugSession: void 0
    },
    scm: {
      createSourceControl: /* @__PURE__ */ __name((_id, _label) => ({
        createResourceGroup: /* @__PURE__ */ __name((_id2, _label2) => ({
          resourceStates: []
        }), "createResourceGroup"),
        dispose: /* @__PURE__ */ __name(() => {
        }, "dispose")
      }), "createSourceControl")
    },
    authentication: {
      getSession: /* @__PURE__ */ __name(async () => void 0, "getSession")
    }
  };
}, "createVSCodeAPI");
var APIFactoryService = class {
  constructor(mountainClient, configService, fsService, terminalService, moduleInterceptor) {
    this.mountainClient = mountainClient;
    this.configService = configService;
    this.fsService = fsService;
    this.terminalService = terminalService;
    this.moduleInterceptor = moduleInterceptor;
    this.api = createVSCodeAPI(
      mountainClient,
      configService,
      fsService,
      terminalService
    );
  }
  mountainClient;
  configService;
  fsService;
  terminalService;
  moduleInterceptor;
  static {
    __name(this, "APIFactoryService");
  }
  _serviceBrand;
  api;
  /**
   * Create/Get the API instance
   */
  createAPI() {
    return this.api;
  }
};
var APIFactoryLayer = Layer2.effect(
  IAPIFactoryService,
  Effect3.gen(function* () {
    const mountainClient = yield* IMountainClientService;
    const configService = yield* IConfigurationService;
    const fsService = yield* IFileSystemService;
    const terminalService = yield* ITerminalService;
    const moduleInterceptor = yield* IModuleInterceptorService;
    return new APIFactoryService(
      mountainClient,
      configService,
      fsService,
      terminalService,
      moduleInterceptor
    );
  })
);

// Source/Services/Configuration.ts
init_Service();
import { CocoonDevLog as CocoonDevLog2 } from "Dev/Log.js";
import { Effect as Effect4, Layer as Layer3 } from "effect";
var ConfigurationScope2 = /* @__PURE__ */ ((ConfigurationScope3) => {
  ConfigurationScope3["APPLICATION"] = "APPLICATION";
  ConfigurationScope3["WORKSPACE"] = "WORKSPACE";
  ConfigurationScope3["PROFILE"] = "PROFILE";
  return ConfigurationScope3;
})(ConfigurationScope2 || {});
var Configuration = class {
  static {
    __name(this, "Configuration");
  }
  _serviceBrand;
  configuration;
  mountainClient;
  listeners;
  constructor(mountainClient) {
    this._serviceBrand = void 0;
    this.mountainClient = mountainClient;
    this.configuration = /* @__PURE__ */ new Map();
    this.listeners = /* @__PURE__ */ new Map();
    CocoonDevLog2(
      "configuration",
      "[ConfigurationService] Initializing configuration service with Universal Spine"
    );
  }
  /**
   * Initialize the configuration service by fetching from Mountain
   */
  async initialize() {
    CocoonDevLog2(
      "configuration",
      "[ConfigurationService] Loading initial configuration from Spine..."
    );
    try {
      const configData = await this.mountainClient.sendRequest(
        "config.reload",
        {}
      );
      if (configData?.application) {
        this.configuration.set(
          "APPLICATION" /* APPLICATION */,
          configData.application
        );
      }
      if (configData?.workspace) {
        this.configuration.set(
          "WORKSPACE" /* WORKSPACE */,
          configData.workspace
        );
      }
      if (configData?.profile) {
        this.configuration.set(
          "PROFILE" /* PROFILE */,
          configData.profile
        );
      }
      CocoonDevLog2(
        "configuration",
        "[ConfigurationService] Configuration loaded from Spine",
        configData
      );
    } catch (error) {
      CocoonDevLog2(
        "configuration",
        "[ConfigurationService] Failed to load initial configuration from Spine:",
        error
      );
      this.configuration.set("APPLICATION" /* APPLICATION */, {
        _version: 1,
        _timestamp: Date.now(),
        window: {
          zoomLevel: 0,
          theme: "dark"
        },
        editor: {
          fontSize: 14,
          lineNumbers: "on"
        }
      });
      this.configuration.set("WORKSPACE" /* WORKSPACE */, {
        _version: 1,
        _timestamp: Date.now()
      });
      this.configuration.set("PROFILE" /* PROFILE */, {
        _version: 1,
        _timestamp: Date.now()
      });
    }
  }
  /**
   * Get configuration value
   */
  getValue(key, scope = "APPLICATION" /* APPLICATION */, defaultValue) {
    const scopeConfig = this.configuration.get(scope);
    if (!scopeConfig) {
      return defaultValue;
    }
    const value = this.getNestedValue(scopeConfig, key);
    return value !== void 0 ? value : defaultValue;
  }
  /**
   * Set configuration value
   */
  async setValue(key, value, scope) {
    if (!this.validateConfigurationKey(key)) {
      throw new Error(`Invalid configuration key: ${key}`);
    }
    if (!this.validateConfigurationValue(key, value)) {
      throw new Error(
        `Invalid configuration value for key ${key}: ${value}`
      );
    }
    let scopeConfig = this.configuration.get(scope);
    if (!scopeConfig) {
      scopeConfig = {};
      this.configuration.set(scope, scopeConfig);
    }
    const oldValue = this.getNestedValue(scopeConfig, key);
    if (oldValue !== value) {
      this.setNestedValue(scopeConfig, key, value);
      scopeConfig._timestamp = Date.now();
      scopeConfig._version = (scopeConfig._version || 0) + 1;
      try {
        let spineScope = 0;
        if (scope === "WORKSPACE" /* WORKSPACE */) spineScope = 1;
        if (scope === "PROFILE" /* PROFILE */) spineScope = 2;
        await this.mountainClient.sendRequest("config.update", {
          key,
          value,
          scope: spineScope
        });
        CocoonDevLog2(
          "configuration",
          `[ConfigurationService] Configuration updated: ${key} = ${value}`
        );
        this.notifyConfigurationChange([key], scope);
      } catch (error) {
        CocoonDevLog2(
          "configuration",
          `[ConfigurationService] Failed to update configuration: ${key}`,
          error
        );
        await this.handleConfigurationConflict(
          error,
          key,
          value,
          scope
        );
      }
    }
  }
  /**
   * Validate configuration key
   */
  validateConfigurationKey(key) {
    if (!key || key.trim().length === 0) {
      return false;
    }
    const invalidChars = /[^a-zA-Z0-9._-]/;
    if (invalidChars.test(key)) {
      return false;
    }
    if (key.startsWith(".") || key.endsWith(".")) {
      return false;
    }
    if (key.includes("..")) {
      return false;
    }
    return true;
  }
  /**
   * Validate configuration value
   */
  validateConfigurationValue(key, value) {
    if (value === void 0) {
      return false;
    }
    if (key.includes("zoomLevel") || key.includes("fontSize")) {
      if (typeof value !== "number" || !isFinite(value)) {
        return false;
      }
      if (key.includes("zoomLevel")) {
        return value >= -8 && value <= 9;
      }
      if (key.includes("fontSize")) {
        return value >= 6 && value <= 100;
      }
    }
    if (key.includes("enable") || key.includes("show") || key.includes("visible")) {
      return typeof value === "boolean";
    }
    if (typeof value === "string") {
      return value.trim().length > 0;
    }
    return true;
  }
  /**
   * Validate entire configuration scope
   */
  validateScopeConfiguration(scope) {
    const scopeConfig = this.configuration.get(scope);
    if (!scopeConfig) {
      return true;
    }
    const keys = [];
    this.collectKeys(scopeConfig, "", keys);
    for (const key of keys) {
      const value = this.getNestedValue(scopeConfig, key);
      if (!this.validateConfigurationKey(key) || !this.validateConfigurationValue(key, value)) {
        return false;
      }
    }
    return true;
  }
  /**
   * Update configuration value
   */
  async updateValue(key, updateFn, scope) {
    const currentValue = this.getValue(key, scope);
    const newValue = updateFn(currentValue);
    await this.setValue(key, newValue, scope);
  }
  /**
   * Check if configuration key exists
   */
  hasKey(key, scope) {
    const scopeConfig = this.configuration.get(scope);
    if (!scopeConfig) {
      return false;
    }
    const value = this.getNestedValue(scopeConfig, key);
    return value !== void 0;
  }
  /**
   * Get all configuration keys for a scope
   */
  getConfigurationKeys(scope) {
    const scopeConfig = this.configuration.get(scope);
    if (!scopeConfig) {
      return [];
    }
    const keys = [];
    this.collectKeys(scopeConfig, "", keys);
    return keys;
  }
  /**
   * Get all configuration values for a scope
   */
  async getAllValues(scope) {
    const scopeConfig = this.configuration.get(scope);
    if (!scopeConfig) {
      return {};
    }
    const result = {};
    this.collectKeys(scopeConfig, "", Object.keys(result));
    for (const key of Object.keys(result)) {
      result[key] = this.getNestedValue(scopeConfig, key);
    }
    return result;
  }
  /**
   * Inspect configuration value
   */
  inspect(key, scope = "APPLICATION" /* APPLICATION */) {
    const scopeConfig = this.configuration.get(scope);
    if (!scopeConfig) {
      return { key };
    }
    const value = this.getNestedValue(scopeConfig, key);
    return {
      key,
      value
    };
  }
  /**
   * Listen for configuration changes
   */
  onDidChangeConfiguration(callback) {
    CocoonDevLog2(
      "configuration",
      "[ConfigurationService] Registering configuration change listener"
    );
    const listenerId = `listener_${Date.now()}_${Math.random()}`;
    let globalListeners = this.listeners.get("*");
    if (!globalListeners) {
      globalListeners = [];
      this.listeners.set("*", globalListeners);
    }
    globalListeners.push(callback);
    CocoonDevLog2(
      "configuration",
      `[ConfigurationService] Configuration change listener registered: ${listenerId}`
    );
  }
  /**
   * Reload configuration from Mountain
   */
  async reloadConfiguration() {
    CocoonDevLog2(
      "configuration",
      "[ConfigurationService] Reloading configuration from Mountain"
    );
    try {
      this.listeners.clear();
      await this.initialize();
      CocoonDevLog2(
        "configuration",
        "[ConfigurationService] Configuration reloaded successfully"
      );
    } catch (error) {
      CocoonDevLog2(
        "configuration",
        "[ConfigurationService] Failed to reload configuration:",
        error
      );
      throw error;
    }
  }
  /**
   * Handle configuration conflicts with retry logic
   */
  async handleConfigurationConflict(_error, key, value, scope) {
    CocoonDevLog2(
      "configuration",
      "[ConfigurationService] Configuration conflict detected, implementing retry logic"
    );
    const maxRetries = 3;
    const baseDelay = 100;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const delay = baseDelay * Math.pow(2, attempt - 1);
      CocoonDevLog2(
        "configuration",
        `[ConfigurationService] Retry attempt ${attempt}/${maxRetries} after ${delay}ms`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      try {
        await this.initialize();
        let scopeConfig = this.configuration.get(scope);
        if (!scopeConfig) {
          scopeConfig = {};
          this.configuration.set(scope, scopeConfig);
        }
        this.setNestedValue(scopeConfig, key, value);
        scopeConfig._timestamp = Date.now();
        scopeConfig._version = (scopeConfig._version || 0) + 1;
        let spineScope = 0;
        if (scope === "WORKSPACE" /* WORKSPACE */) spineScope = 1;
        if (scope === "PROFILE" /* PROFILE */) spineScope = 2;
        await this.mountainClient.sendRequest("config.update", {
          key,
          value,
          scope: spineScope
        });
        CocoonDevLog2(
          "configuration",
          "[ConfigurationService] Configuration saved successfully after retry"
        );
        return;
      } catch (retryError) {
        CocoonDevLog2(
          "configuration",
          `[ConfigurationService] Retry attempt ${attempt} failed:`,
          retryError
        );
        if (attempt === maxRetries) {
          CocoonDevLog2(
            "configuration",
            "[ConfigurationService] All retry attempts failed, configuration may be out of sync"
          );
          throw new Error(
            `Configuration synchronization failed after ${maxRetries} attempts: ${retryError}`
          );
        }
      }
    }
  }
  /**
   * Cleanup configuration service
   */
  async cleanup() {
    CocoonDevLog2(
      "configuration",
      "[ConfigurationService] Cleaning up configuration service"
    );
    this.listeners.clear();
    this.configuration.clear();
    CocoonDevLog2(
      "configuration",
      "[ConfigurationService] Configuration service cleaned up"
    );
  }
  /**
   * Get nested value from configuration object
   */
  getNestedValue(obj, key) {
    const keys = key.split(".");
    let current = obj;
    for (const k of keys) {
      if (current && typeof current === "object" && k in current) {
        current = current[k];
      } else {
        return void 0;
      }
    }
    return current;
  }
  /**
   * Set nested value in configuration object
   */
  setNestedValue(obj, key, value) {
    const keys = key.split(".");
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!k) continue;
      if (!(k in current) || typeof current[k] !== "object") {
        current[k] = {};
      }
      current = current[k];
    }
    const lastKey = keys[keys.length - 1];
    if (lastKey) {
      current[lastKey] = value;
    }
  }
  /**
   * Collect all configuration keys
   */
  collectKeys(obj, prefix, keys) {
    for (const key in obj) {
      if (key.startsWith("_")) continue;
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === "object" && obj[key] !== null) {
        this.collectKeys(obj[key], fullKey, keys);
      } else {
        keys.push(fullKey);
      }
    }
  }
  /**
   * Notify configuration change listeners
   */
  notifyConfigurationChange(keys, scope) {
    for (const key of keys) {
      const eventKey = `${scope}.${key}`;
      const listeners = this.listeners.get(eventKey);
      const globalListeners = this.listeners.get("*");
      const allListeners = [
        ...listeners || [],
        ...globalListeners || []
      ];
      if (allListeners.length > 0) {
        for (const listener of allListeners) {
          try {
            listener([{ key, scope }]);
          } catch (error) {
            CocoonDevLog2(
              "configuration",
              `[ConfigurationService] Error in listener for ${eventKey}:`,
              error
            );
          }
        }
      }
    }
  }
};
var ConfigurationLayer = Layer3.effect(
  IConfigurationService,
  Effect4.gen(function* () {
    const mountainClient = yield* IMountainClientService;
    const configService = new Configuration(mountainClient);
    yield* Effect4.promise(() => configService.initialize());
    return configService;
  })
);
var ConfigurationLive = ConfigurationLayer;

// Source/Services/Error/Handling/Service.ts
init_Log();
import { Effect as Effect5, Layer as Layer4 } from "effect";
var ErrorHandlingService = class {
  static {
    __name(this, "ErrorHandlingService");
  }
  _serviceBrand;
  circuitBreakers = /* @__PURE__ */ new Map();
  config;
  constructor() {
    this._serviceBrand = void 0;
    this.config = this.loadDefaultConfig();
    CocoonDevLog3(
      "service",
      "[ErrorHandlingService] Initializing error handling service"
    );
  }
  /**
   * Load default configuration
   */
  loadDefaultConfig() {
    return {
      maxRetries: 3,
      retryDelay: 1e3,
      // 1 second
      exponentialBackoff: true,
      circuitBreakerTimeout: 3e4,
      // 30 seconds
      circuitBreakerThreshold: 5
    };
  }
  /**
   * Execute operation with advanced error handling and metrics
   */
  async executeWithRetry(operation, operationName, customConfig) {
    const startTime = Date.now();
    const config = { ...this.config, ...customConfig };
    CocoonDevLog3(
      "service",
      `[ErrorHandlingService] Executing operation: ${operationName}`
    );
    const circuitState = this.getCircuitBreakerState(operationName);
    if (circuitState.state === "OPEN") {
      const error = new Error(
        `Circuit breaker is OPEN for ${operationName} (failures: ${circuitState.failureCount})`
      );
      CocoonDevLog3(
        "service",
        `[ErrorHandlingService] Circuit breaker blocked operation: ${operationName}`
      );
      this.trackCircuitBreakerEvent(operationName, "blocked");
      return {
        success: false,
        error,
        retries: 0,
        duration: Date.now() - startTime,
        circuitBreakerState: circuitState,
        metrics: {
          circuitBreakerBlocked: true,
          totalRetries: 0,
          executionTime: Date.now() - startTime
        }
      };
    }
    let lastError;
    let totalRetries = 0;
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const operationStartTime = Date.now();
        const result = await operation();
        const operationDuration = Date.now() - operationStartTime;
        this.recordSuccess(operationName);
        this.trackOperationSuccess(
          operationName,
          operationDuration,
          attempt
        );
        CocoonDevLog3(
          "service",
          `[ErrorHandlingService] Operation ${operationName} succeeded on attempt ${attempt + 1} in ${operationDuration}ms`
        );
        return {
          success: true,
          result,
          retries: attempt,
          duration: Date.now() - startTime,
          circuitBreakerState: this.getCircuitBreakerState(operationName),
          metrics: {
            totalRetries: attempt,
            executionTime: Date.now() - startTime,
            operationDuration,
            circuitBreakerBlocked: false
          }
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        totalRetries = attempt;
        CocoonDevLog3(
          "service",
          `[ErrorHandlingService] Operation ${operationName} failed on attempt ${attempt + 1}:`,
          error
        );
        this.recordFailure(operationName);
        this.trackOperationFailure(operationName, error, attempt);
        if (attempt < config.maxRetries && this.shouldRetry(error)) {
          const delay = this.calculateRetryDelay(attempt, config);
          CocoonDevLog3(
            "service",
            `[ErrorHandlingService] Retrying ${operationName} in ${delay}ms`
          );
          await this.delay(delay);
        } else {
          break;
        }
      }
    }
    CocoonDevLog3(
      "service",
      `[ErrorHandlingService] Operation ${operationName} failed after ${totalRetries} retries`
    );
    return {
      success: false,
      error: lastError,
      retries: totalRetries,
      duration: Date.now() - startTime,
      circuitBreakerState: this.getCircuitBreakerState(operationName),
      metrics: {
        totalRetries,
        executionTime: Date.now() - startTime,
        circuitBreakerBlocked: false,
        finalFailure: true
      }
    };
  }
  /**
   * Get circuit breaker state
   */
  getCircuitBreakerState(serviceName) {
    if (!this.circuitBreakers.has(serviceName)) {
      this.circuitBreakers.set(serviceName, {
        serviceName,
        state: "CLOSED",
        failureCount: 0,
        lastFailureTime: 0,
        successThreshold: 3,
        failureThreshold: this.config.circuitBreakerThreshold,
        timeout: this.config.circuitBreakerTimeout
      });
    }
    const state = this.circuitBreakers.get(serviceName);
    if (state.state === "OPEN" && Date.now() - state.lastFailureTime > state.timeout) {
      state.state = "HALF_OPEN";
      CocoonDevLog3(
        "service",
        `[ErrorHandlingService] Circuit breaker for ${serviceName} transitioned to HALF_OPEN`
      );
    }
    return state;
  }
  /**
   * Record operation success
   */
  recordSuccess(serviceName) {
    const state = this.getCircuitBreakerState(serviceName);
    if (state.state === "HALF_OPEN") {
      state.state = "CLOSED";
      state.failureCount = 0;
      CocoonDevLog3(
        "service",
        `[ErrorHandlingService] Circuit breaker for ${serviceName} closed after successful operation`
      );
    } else if (state.state === "CLOSED") {
      state.failureCount = Math.max(0, state.failureCount - 1);
    }
  }
  /**
   * Record operation failure
   */
  recordFailure(serviceName) {
    const state = this.getCircuitBreakerState(serviceName);
    state.failureCount++;
    state.lastFailureTime = Date.now();
    if (state.state === "HALF_OPEN") {
      state.state = "OPEN";
      CocoonDevLog3(
        "service",
        `[ErrorHandlingService] Circuit breaker for ${serviceName} reopened after failure in HALF_OPEN state`
      );
    } else if (state.state === "CLOSED" && state.failureCount >= state.failureThreshold) {
      state.state = "OPEN";
      CocoonDevLog3(
        "service",
        `[ErrorHandlingService] Circuit breaker for ${serviceName} opened after ${state.failureCount} failures`
      );
    }
  }
  /**
   * Calculate retry delay with jitter
   */
  calculateRetryDelay(attempt, config) {
    if (!config.exponentialBackoff) {
      return config.retryDelay;
    }
    const baseDelay = config.retryDelay * Math.pow(2, attempt);
    const jitter = Math.random() * baseDelay * 0.1;
    const finalDelay = baseDelay + (Math.random() > 0.5 ? jitter : -jitter);
    return Math.min(finalDelay, 3e4);
  }
  /**
   * Advanced error classification with ML-inspired patterns
   */
  shouldRetry(error) {
    const errorMessage = error.message.toLowerCase();
    const nonRetryablePatterns = [
      "invalidargument",
      "notfound",
      "alreadyexists",
      "permissiondenied",
      "unauthenticated",
      "unauthorized",
      "badrequest",
      "forbidden",
      "conflict",
      "gone"
    ];
    const retryablePatterns = [
      "timeout",
      "deadlineexceeded",
      "unavailable",
      "busy",
      "overloaded",
      "temporarilyunavailable",
      "network",
      "connection",
      "socket"
    ];
    if (nonRetryablePatterns.some(
      (pattern) => errorMessage.includes(pattern)
    )) {
      return false;
    }
    if (retryablePatterns.some((pattern) => errorMessage.includes(pattern))) {
      return true;
    }
    return this.isTransientError(error);
  }
  /**
   * Determine if error is transient
   */
  isTransientError(error) {
    const transientIndicators = [
      "temporary",
      "transient",
      "retry",
      "again",
      "later",
      "soon",
      "momentarily",
      "briefly"
    ];
    const errorMessage = error.message.toLowerCase();
    return transientIndicators.some(
      (indicator) => errorMessage.includes(indicator)
    );
  }
  /**
   * Track operation success with advanced analytics
   */
  trackOperationSuccess(operationName, duration, attempt) {
    const successMetrics = {
      operationName,
      duration,
      attempt,
      timestamp: Date.now(),
      success: true,
      retryCount: attempt,
      circuitBreakerState: this.getCircuitBreakerState(operationName).state
    };
    CocoonDevLog3(
      "service",
      `[ErrorHandlingService] Success metrics: ${JSON.stringify(successMetrics)}`
    );
    this.adaptRetryStrategy(operationName, duration, attempt);
  }
  /**
   * Adapt retry strategy based on historical patterns
   */
  adaptRetryStrategy(operationName, duration, attempt) {
    const circuitState = this.getCircuitBreakerState(operationName);
    if (attempt === 0 && duration < 1e3) {
      circuitState.successThreshold = Math.max(
        1,
        circuitState.successThreshold - 1
      );
    }
  }
  /**
   * Track operation failure with advanced analytics
   */
  trackOperationFailure(operationName, error, attempt) {
    const failureMetrics = {
      operationName,
      attempt,
      timestamp: Date.now(),
      success: false,
      errorType: this.classifyError(error),
      errorMessage: error.message.substring(0, 200),
      // Truncate long messages
      retryable: this.shouldRetry(error),
      circuitBreakerState: this.getCircuitBreakerState(operationName).state
    };
    CocoonDevLog3(
      "service",
      `[ErrorHandlingService] Failure metrics: ${JSON.stringify(failureMetrics)}`
    );
  }
  /**
   * Classify error for better analytics
   */
  classifyError(error) {
    const errorMessage = error.message.toLowerCase();
    if (errorMessage.includes("timeout") || errorMessage.includes("deadline")) {
      return "timeout";
    } else if (errorMessage.includes("network") || errorMessage.includes("connection")) {
      return "network";
    } else if (errorMessage.includes("permission") || errorMessage.includes("unauthorized")) {
      return "permission";
    } else if (errorMessage.includes("invalid") || errorMessage.includes("bad request")) {
      return "validation";
    } else if (errorMessage.includes("not found") || errorMessage.includes("missing")) {
      return "not_found";
    } else {
      return "unknown";
    }
  }
  /**
   * Track circuit breaker events
   */
  trackCircuitBreakerEvent(operationName, eventType) {
    CocoonDevLog3(
      "service",
      `[ErrorHandlingService] Circuit breaker event: ${operationName}, ${eventType}`
    );
  }
  /**
   * Delay execution
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(serviceName) {
    return this.circuitBreakers.get(serviceName);
  }
  /**
   * Get all circuit breaker statuses
   */
  getAllCircuitBreakerStatuses() {
    return Array.from(this.circuitBreakers.values());
  }
  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(serviceName) {
    if (this.circuitBreakers.has(serviceName)) {
      this.circuitBreakers.delete(serviceName);
      CocoonDevLog3(
        "service",
        `[ErrorHandlingService] Circuit breaker reset for ${serviceName}`
      );
    }
  }
  /**
   * Update configuration
   */
  updateConfiguration(newConfig) {
    this.config = { ...this.config, ...newConfig };
    CocoonDevLog3("service", "[ErrorHandlingService] Configuration updated");
  }
  /**
   * Get service statistics
   */
  getStatistics() {
    const states = this.getAllCircuitBreakerStatuses();
    return {
      totalCircuitBreakers: states.length,
      openCircuitBreakers: states.filter((s) => s.state === "OPEN").length,
      halfOpenCircuitBreakers: states.filter(
        (s) => s.state === "HALF_OPEN"
      ).length,
      closedCircuitBreakers: states.filter((s) => s.state === "CLOSED").length,
      config: this.config
    };
  }
};
var ErrorHandlingServiceLayer = Layer4.effect(
  "ErrorHandlingService",
  Effect5.sync(() => new ErrorHandlingService())
);
var ErrorHandlingServiceLive = Layer4.effect(
  "ErrorHandlingService",
  Effect5.sync(() => new ErrorHandlingService())
);

// Source/Interfaces/I/Extension/Host/Service.ts
import { Context as Context6 } from "effect";
var IExtensionHostService = Context6.Tag(
  "IExtensionHostService"
);

// Source/Services/Extension/Host/Service.ts
init_Log();
import { Effect as Effect6, Layer as Layer5 } from "effect";
var ExtensionHostService = class {
  constructor(moduleInterceptor, apiFactory) {
    this.moduleInterceptor = moduleInterceptor;
    this.apiFactory = apiFactory;
  }
  moduleInterceptor;
  apiFactory;
  static {
    __name(this, "ExtensionHostService");
  }
  _serviceBrand;
  // Extensions registry
  activatedExtensions = /* @__PURE__ */ new Map();
  /**
   * Activate an extension
   */
  async activateExtension(extensionId, activationEvent) {
    if (this.activatedExtensions.has(extensionId)) {
      return;
    }
    CocoonDevLog3(
      "service",
      `[ExtensionHost] Activating extension: ${extensionId} (Event: ${activationEvent})`
    );
    try {
      const startTime = Date.now();
      const vscodeAPI = this.apiFactory.createAPI();
      this.moduleInterceptor.registerAPI(extensionId, vscodeAPI);
      const extension = {
        identifier: extensionId,
        extensionLocation: `/extensions/${extensionId}`,
        main: "extension.js",
        activationEvents: [activationEvent]
      };
      const moduleLoadStart = Date.now();
      const extensionModule = await this._loadExtensionModule(extension);
      const codeLoadingTime = Date.now() - moduleLoadStart;
      const activateCallStart = Date.now();
      const exports = await this._callActivate(
        extensionModule,
        extension
      );
      const activateCallTime = Date.now() - activateCallStart;
      const activateResolvedTime = Date.now() - startTime;
      this.activatedExtensions.set(extensionId, {
        activationTimes: {
          codeLoadingTime,
          activateCallTime,
          activateResolvedTime
        },
        exports
      });
      CocoonDevLog3(
        "service",
        `[ExtensionHost] ${extensionId} activated successfully in ${activateResolvedTime}ms`
      );
    } catch (error) {
      CocoonDevLog3(
        "service",
        `[ExtensionHost] Failed to activate ${extensionId}:`,
        error
      );
      throw error;
    }
  }
  /**
   * Load extension module with advanced interception
   */
  async _loadExtensionModule(extension) {
    if (!extension.main) {
      return { activate: /* @__PURE__ */ __name(() => {
      }, "activate") };
    }
    const modulePath = `${extension.extensionLocation}/${extension.main}`;
    CocoonDevLog3(
      "service",
      `[ExtensionHost] Loading module: ${modulePath}`
    );
    try {
      const resolvedPath = this.moduleInterceptor.resolveModule(
        modulePath,
        extension.extensionLocation
      );
      const extensionModule = this.moduleInterceptor.interceptRequire(
        resolvedPath,
        extension.extensionLocation
      );
      return extensionModule;
    } catch (error) {
      CocoonDevLog3(
        "service",
        `[ExtensionHost] Failed to load module ${modulePath}:`,
        error
      );
      CocoonDevLog3(
        "service",
        `[ExtensionHost] Using dummy module for ${extension.identifier}`
      );
      return {
        activate: /* @__PURE__ */ __name((_context) => {
          CocoonDevLog3(
            "service",
            `[${extension.identifier}] activate() called`
          );
        }, "activate"),
        deactivate: /* @__PURE__ */ __name(() => {
        }, "deactivate")
      };
    }
  }
  /**
   * Call extension's activate function
   */
  async _callActivate(extensionModule, extension) {
    if (typeof extensionModule.activate !== "function") {
      return void 0;
    }
    const context = {
      subscriptions: [],
      extensionPath: extension.extensionLocation,
      globalState: { get: /* @__PURE__ */ __name(() => {
      }, "get"), update: /* @__PURE__ */ __name(() => {
      }, "update") },
      workspaceState: { get: /* @__PURE__ */ __name(() => {
      }, "get"), update: /* @__PURE__ */ __name(() => {
      }, "update") },
      secrets: { get: /* @__PURE__ */ __name(() => {
      }, "get"), store: /* @__PURE__ */ __name(() => {
      }, "store"), delete: /* @__PURE__ */ __name(() => {
      }, "delete") }
    };
    return await extensionModule.activate(context);
  }
  /**
   * Deactivate an extension
   */
  async deactivateExtension(extensionId) {
    if (!this.activatedExtensions.has(extensionId)) {
      return;
    }
    CocoonDevLog3(
      "service",
      `[ExtensionHost] Deactivating extension: ${extensionId}`
    );
    this.activatedExtensions.delete(extensionId);
  }
};
var ExtensionHostLayer = Layer5.effect(
  IExtensionHostService,
  Effect6.gen(function* () {
    const moduleInterceptor = yield* IModuleInterceptorService;
    const apiFactory = yield* IAPIFactoryService;
    return new ExtensionHostService(moduleInterceptor, apiFactory);
  })
);

// Source/Services/Module/Interceptor/Service.ts
init_Log();
import * as acorn from "acorn";
import * as walk from "acorn-walk";
import { Effect as Effect7, Layer as Layer6 } from "effect";
var ModuleInterceptorService = class {
  static {
    __name(this, "ModuleInterceptorService");
  }
  _serviceBrand;
  config;
  moduleCache;
  securitySandbox;
  constructor() {
    CocoonDevLog3(
      "service",
      "[ModuleInterceptorService] Initializing module interceptor"
    );
    this.config = this.loadDefaultConfig();
    this.moduleCache = /* @__PURE__ */ new Map();
    this.securitySandbox = this.createSecuritySandbox();
    CocoonDevLog3(
      "service",
      "[ModuleInterceptorService] Module interceptor initialized"
    );
  }
  /**
   * Load default configuration
   */
  loadDefaultConfig() {
    return {
      allowNodeBuiltins: true,
      allowFileSystemAccess: false,
      allowNetworkAccess: false,
      allowedModules: [
        "path",
        "url",
        "util",
        "events",
        "stream",
        "buffer"
      ],
      blockedModules: [
        "fs",
        "child_process",
        "net",
        "http",
        "https",
        "os",
        "crypto"
      ]
    };
  }
  /**
   * Create security sandbox with safe functions
   */
  createSecuritySandbox() {
    const sandbox = /* @__PURE__ */ new Map();
    sandbox.set("console.log", console.log.bind(console));
    sandbox.set("console.error", console.error.bind(console));
    sandbox.set("console.warn", console.warn.bind(console));
    sandbox.set("setTimeout", setTimeout.bind(global));
    sandbox.set("setInterval", setInterval.bind(global));
    sandbox.set("clearTimeout", clearTimeout.bind(global));
    sandbox.set("clearInterval", clearInterval.bind(global));
    sandbox.set("JSON.parse", JSON.parse);
    sandbox.set("JSON.stringify", JSON.stringify);
    return sandbox;
  }
  /**
   * Intercept module require calls
   */
  interceptRequire(modulePath, parentPath) {
    CocoonDevLog3(
      "service",
      `[ModuleInterceptorService] Intercepting require: ${modulePath} from ${parentPath}`
    );
    if (this.moduleCache.has(modulePath)) {
      return this.moduleCache.get(modulePath);
    }
    if (!this.validateModuleAccess(modulePath, parentPath)) {
      throw new Error(`Module access denied: ${modulePath}`);
    }
    const moduleSecurity = this.analyzeModuleSecurity(modulePath);
    if (!moduleSecurity.isSafe) {
      throw new Error(
        `Module security violation: ${modulePath} - ${moduleSecurity.reason}`
      );
    }
    const interceptedModule = this.loadAndInterceptModule(modulePath);
    this.moduleCache.set(modulePath, interceptedModule);
    CocoonDevLog3(
      "service",
      `[ModuleInterceptorService] Module ${modulePath} intercepted successfully`
    );
    return interceptedModule;
  }
  /**
   * Validate module access permissions
   */
  validateModuleAccess(modulePath, parentPath) {
    if (this.config.blockedModules.includes(modulePath)) {
      CocoonDevLog3(
        "service",
        `[ModuleInterceptorService] Blocked module access: ${modulePath}`
      );
      return false;
    }
    if (this.config.allowedModules.includes(modulePath)) {
      return true;
    }
    if (this.isNodeBuiltin(modulePath) && !this.config.allowNodeBuiltins) {
      CocoonDevLog3(
        "service",
        `[ModuleInterceptorService] Node built-in module access denied: ${modulePath}`
      );
      return false;
    }
    return true;
  }
  /**
   * Check if module is Node.js built-in
   */
  isNodeBuiltin(modulePath) {
    const builtins = [
      "fs",
      "path",
      "os",
      "net",
      "http",
      "https",
      "child_process",
      "crypto",
      "util",
      "events",
      "stream",
      "buffer",
      "url",
      "querystring"
    ];
    return builtins.includes(modulePath);
  }
  /**
   * Analyze module security using advanced AST parsing
   */
  analyzeModuleSecurity(modulePath) {
    try {
      CocoonDevLog3(
        "service",
        `[ModuleInterceptorService] Performing advanced AST security analysis for ${modulePath}`
      );
      const fs = __require("fs");
      const path = __require("path");
      const resolvedPath = __require.resolve(modulePath);
      const sourceCode = fs.readFileSync(resolvedPath, "utf8");
      const ast = acorn.parse(sourceCode, {
        ecmaVersion: "latest",
        sourceType: "module",
        allowAwaitOutsideFunction: true,
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true,
        ranges: true,
        locations: true
      });
      const securityIssues = [];
      const securityWarnings = [];
      walk.simple(
        ast,
        {
          CallExpression(node) {
            const callee = node.callee;
            if (callee.type === "Identifier") {
              const functionName = callee.name;
              if (this.isCriticalDangerousFunction(functionName)) {
                securityIssues.push(
                  `CRITICAL: Dangerous function call: ${functionName}`
                );
              } else if (this.isDangerousFunction(functionName)) {
                securityWarnings.push(
                  `WARNING: Dangerous function call: ${functionName}`
                );
              }
            }
            if (callee.type === "MemberExpression" && callee.object.type === "Identifier" && callee.object.name === "eval" && callee.property.type === "Identifier" && callee.property.name === "constructor") {
              securityIssues.push(
                `CRITICAL: Dynamic code execution via eval constructor`
              );
            }
          },
          MemberExpression(node) {
            if (node.object.type === "Identifier" && node.property.type === "Identifier") {
              const objectName = node.object.name;
              const propertyName = node.property.name;
              if (this.isCriticalDangerousPropertyAccess(
                objectName,
                propertyName
              )) {
                securityIssues.push(
                  `CRITICAL: Dangerous property access: ${objectName}.${propertyName}`
                );
              } else if (this.isDangerousPropertyAccess(
                objectName,
                propertyName
              )) {
                securityWarnings.push(
                  `WARNING: Dangerous property access: ${objectName}.${propertyName}`
                );
              }
            }
          },
          AssignmentExpression(node) {
            if (node.left.type === "MemberExpression") {
              const left = node.left;
              if (left.object.type === "Identifier" && left.property.type === "Identifier") {
                const objectName = left.object.name;
                const propertyName = left.property.name;
                if (this.isCriticalDangerousAssignment(
                  objectName,
                  propertyName
                )) {
                  securityIssues.push(
                    `CRITICAL: Dangerous assignment: ${objectName}.${propertyName}`
                  );
                } else if (this.isDangerousAssignment(
                  objectName,
                  propertyName
                )) {
                  securityWarnings.push(
                    `WARNING: Dangerous assignment: ${objectName}.${propertyName}`
                  );
                }
              }
            }
          },
          ImportDeclaration(node) {
            const importSource = node.source.value;
            if (this.isDangerousImport(importSource)) {
              securityIssues.push(
                `CRITICAL: Dangerous import: ${importSource}`
              );
            }
          },
          NewExpression(node) {
            if (node.callee.type === "Identifier") {
              const constructorName = node.callee.name;
              if (this.isDangerousConstructor(constructorName)) {
                securityIssues.push(
                  `CRITICAL: Dangerous constructor: ${constructorName}`
                );
              }
            }
          }
        },
        this
      );
      this.performPatternAnalysis(
        sourceCode,
        securityIssues,
        securityWarnings
      );
      const allIssues = [...securityIssues, ...securityWarnings];
      const isSafe = securityIssues.length === 0;
      const reason = allIssues.length > 0 ? `Security analysis: ${allIssues.join(", ")}` : "Advanced AST security analysis passed all checks";
      CocoonDevLog3(
        "service",
        `[ModuleInterceptorService] Security analysis for ${modulePath}: ${securityIssues.length} critical issues, ${securityWarnings.length} warnings`
      );
      return {
        isSafe,
        reason
      };
    } catch (error) {
      CocoonDevLog3(
        "service",
        `[ModuleInterceptorService] Advanced security analysis failed for ${modulePath}:`,
        error
      );
      return {
        isSafe: false,
        reason: `Advanced security analysis error: ${error}`
      };
    }
  }
  /**
   * Check if function is critically dangerous (block immediately)
   */
  isCriticalDangerousFunction(functionName) {
    const criticalFunctions = [
      "eval",
      "Function",
      "exec",
      "spawn",
      "execFile",
      "fork",
      "require",
      "import",
      "process.binding",
      "vm.runInContext"
    ];
    return criticalFunctions.includes(functionName);
  }
  /**
   * Check if function is dangerous (warning level)
   */
  isDangerousFunction(functionName) {
    const dangerousFunctions = [
      "setTimeout",
      "setInterval",
      "setImmediate",
      "require.cache",
      "module.constructor",
      "global.eval"
    ];
    return dangerousFunctions.includes(functionName);
  }
  /**
   * Check if property access is critically dangerous
   */
  isCriticalDangerousPropertyAccess(objectName, propertyName) {
    const criticalAccesses = [
      { object: "process", property: "env" },
      { object: "global", property: "process" },
      { object: "window", property: "location" },
      { object: "process", property: "mainModule" },
      { object: "process", property: "binding" }
    ];
    return criticalAccesses.some(
      (access) => access.object === objectName && access.property === propertyName
    );
  }
  /**
   * Check if property access is dangerous
   */
  isDangerousPropertyAccess(objectName, propertyName) {
    const dangerousAccesses = [
      { object: "process", property: "argv" },
      { object: "process", property: "cwd" },
      { object: "process", property: "env" },
      { object: "global", property: "eval" },
      { object: "global", property: "process" },
      { object: "window", property: "eval" },
      { object: "window", property: "location" }
    ];
    return dangerousAccesses.some(
      (access) => access.object === objectName && access.property === propertyName
    );
  }
  /**
   * Check if assignment is critically dangerous
   */
  isCriticalDangerousAssignment(objectName, propertyName) {
    const criticalAssignments = [
      { object: "process", property: "env" },
      { object: "global", property: "process" },
      { object: "require", property: "cache" },
      { object: "module", property: "exports" }
    ];
    return criticalAssignments.some(
      (assignment) => assignment.object === objectName && assignment.property === propertyName
    );
  }
  /**
   * Check if assignment is dangerous
   */
  isDangerousAssignment(objectName, propertyName) {
    const dangerousAssignments = [
      { object: "global", property: "eval" },
      { object: "window", property: "eval" }
    ];
    return dangerousAssignments.some(
      (assignment) => assignment.object === objectName && assignment.property === propertyName
    );
  }
  /**
   * Check if import is dangerous
   */
  isDangerousImport(importSource) {
    const dangerousImports = [
      "fs",
      "child_process",
      "net",
      "http",
      "https",
      "os",
      "crypto",
      "vm",
      "module",
      "process",
      "sys"
    ];
    return dangerousImports.includes(importSource);
  }
  /**
   * Check if constructor is dangerous
   */
  isDangerousConstructor(constructorName) {
    const dangerousConstructors = [
      "Function",
      "eval",
      "process",
      "require"
    ];
    return dangerousConstructors.includes(constructorName);
  }
  /**
   * Perform pattern-based security analysis
   */
  performPatternAnalysis(sourceCode, securityIssues, securityWarnings) {
    const dangerousPatterns = [
      { pattern: /eval\s*\(/, description: "Direct eval call" },
      { pattern: /Function\s*\(/, description: "Function constructor" },
      {
        pattern: /require\s*\(\s*['"`]\s*[^'"`]*\s*['"`]\s*\)/,
        description: "Dynamic require"
      },
      {
        pattern: /process\.binding/,
        description: "Process binding access"
      },
      {
        pattern: /vm\.runInContext/,
        description: "VM context execution"
      },
      {
        pattern: /child_process\.spawn/,
        description: "Child process spawning"
      }
    ];
    for (const { pattern, description } of dangerousPatterns) {
      if (pattern.test(sourceCode)) {
        securityIssues.push(`CRITICAL: ${description} detected`);
      }
    }
  }
  /**
   * Load and intercept module with security wrappers
   */
  loadAndInterceptModule(modulePath) {
    try {
      const originalModule = __require(modulePath);
      const interceptedModule = this.createSecurityWrapper(
        originalModule,
        modulePath
      );
      return interceptedModule;
    } catch (error) {
      CocoonDevLog3(
        "service",
        `[ModuleInterceptorService] Failed to load module ${modulePath}:`,
        error
      );
      throw error;
    }
  }
  /**
   * Create security wrapper for module
   */
  createSecurityWrapper(originalModule, modulePath) {
    const wrapper = {};
    for (const key of Object.keys(originalModule)) {
      const originalValue = originalModule[key];
      if (typeof originalValue === "function") {
        wrapper[key] = this.wrapFunction(
          originalValue,
          modulePath,
          key
        );
      } else {
        wrapper[key] = originalValue;
      }
    }
    return wrapper;
  }
  /**
   * Wrap function with security checks
   */
  wrapFunction(originalFn, modulePath, functionName) {
    return (...args) => {
      CocoonDevLog3(
        "service",
        `[ModuleInterceptorService] Calling ${modulePath}.${functionName}`
      );
      return originalFn.apply(null, args);
    };
  }
  /**
   * Resolve module path
   */
  resolveModule(modulePath, parentPath) {
    CocoonDevLog3(
      "service",
      `[ModuleInterceptorService] Resolving module: ${modulePath} from ${parentPath}`
    );
    try {
      const resolvedPath = __require.resolve(modulePath, {
        paths: [parentPath]
      });
      CocoonDevLog3(
        "service",
        `[ModuleInterceptorService] Resolved ${modulePath} to ${resolvedPath}`
      );
      return resolvedPath;
    } catch (error) {
      CocoonDevLog3(
        "service",
        `[ModuleInterceptorService] Failed to resolve module ${modulePath}:`,
        error
      );
      throw error;
    }
  }
  /**
   * Create extension context with isolated environment
   */
  createExtensionContext(extensionId) {
    CocoonDevLog3(
      "service",
      `[ModuleInterceptorService] Creating extension context for ${extensionId}`
    );
    const context = {
      extensionId,
      globalState: /* @__PURE__ */ new Map(),
      workspaceState: /* @__PURE__ */ new Map(),
      subscriptions: [],
      asAbsolutePath: /* @__PURE__ */ __name((relativePath) => {
        return `/extensions/${extensionId}/${relativePath}`;
      }, "asAbsolutePath")
    };
    CocoonDevLog3(
      "service",
      `[ModuleInterceptorService] Extension context created for ${extensionId}`
    );
    return context;
  }
  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    CocoonDevLog3(
      "service",
      "[ModuleInterceptorService] Updating configuration"
    );
    this.config = { ...this.config, ...newConfig };
    this.moduleCache.clear();
    CocoonDevLog3(
      "service",
      "[ModuleInterceptorService] Configuration updated"
    );
  }
  /**
   * Get service status
   */
  getStatus() {
    return {
      cacheSize: this.moduleCache.size,
      config: this.config,
      securityRules: this.config.allowedModules.length + this.config.blockedModules.length
    };
  }
};
var ModuleInterceptorServiceLayer = Layer6.effect(
  IModuleInterceptorService,
  Effect7.sync(() => new ModuleInterceptorService())
);
var ModuleInterceptorServiceLive = Layer6.effect(
  IModuleInterceptorService,
  Effect7.sync(() => new ModuleInterceptorService())
);
var Service_default = ModuleInterceptorService;

// Source/Services/Performance/Monitoring/Service.ts
import { Layer as Layer8 } from "effect";
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
var PerformanceMonitoringServiceLive = Layer8.sync(
  "PerformanceMonitoringService",
  () => new PerformanceMonitoringService()
);
var Service_default2 = PerformanceMonitoringService;

// Source/Services/Security/Service.ts
init_Log();
import { Effect as Effect10, Layer as Layer9 } from "effect";
var SecurityService = class {
  static {
    __name(this, "SecurityService");
  }
  policies = /* @__PURE__ */ new Map();
  auditLog = [];
  incidents = [];
  constructor() {
    CocoonDevLog3(
      "service",
      "[SecurityService] Initializing security service"
    );
    this.loadDefaultPolicies();
  }
  /**
   * Initialize security service
   */
  async initialize() {
    CocoonDevLog3("service", "[SecurityService] Starting security service");
    try {
      await this.loadSecurityPolicies();
      await this.initializeAuditLogging();
      await this.initializeIncidentResponse();
      this.securityActive = true;
      CocoonDevLog3(
        "service",
        "[SecurityService] Security service started"
      );
    } catch (error) {
      CocoonDevLog3(
        "service",
        "[SecurityService] Failed to initialize:",
        error
      );
      throw error;
    }
  }
  /**
   * Load default security policies
   */
  loadDefaultPolicies() {
    const defaultPolicy = {
      extensionId: "default",
      allowedModules: ["path", "url", "util", "events"],
      blockedModules: [
        "fs",
        "child_process",
        "net",
        "http",
        "https",
        "os",
        "crypto"
      ],
      maxMemoryUsage: 100,
      // MB
      maxExecutionTime: 3e4,
      // 30 seconds
      allowedAPIs: ["commands", "window", "workspace"],
      blockedAPIs: ["debug", "terminal", "scm"],
      networkAccess: false,
      fileSystemAccess: false,
      requireAuthentication: true
    };
    this.policies.set("default", defaultPolicy);
    CocoonDevLog3(
      "service",
      "[SecurityService] Default security policy loaded"
    );
  }
  /**
   * Load security policies from Mountain with advanced features
   */
  async loadSecurityPolicies() {
    try {
      const { MountainClientService: MountainClientService2 } = await Promise.resolve().then(() => (init_Service2(), Service_exports));
      const mountainClient = new MountainClientService2();
      const policiesResponse = await mountainClient.sendRequest(
        "security.policies.get",
        {
          includeDefaults: true,
          timestamp: Date.now()
        }
      );
      if (policiesResponse && policiesResponse.policies) {
        for (const policy of policiesResponse.policies) {
          this.policies.set(policy.extensionId, {
            extensionId: policy.extensionId,
            allowedModules: policy.allowedModules || [],
            blockedModules: policy.blockedModules || [],
            maxMemoryUsage: policy.maxMemoryUsage || 100,
            maxExecutionTime: policy.maxExecutionTime || 3e4,
            allowedAPIs: policy.allowedAPIs || [],
            blockedAPIs: policy.blockedAPIs || [],
            networkAccess: policy.networkAccess || false,
            fileSystemAccess: policy.fileSystemAccess || false,
            requireAuthentication: policy.requireAuthentication || true
          });
        }
        CocoonDevLog3(
          "service",
          `[SecurityService] Loaded ${policiesResponse.policies.length} security policies from Mountain`
        );
      } else {
        CocoonDevLog3(
          "service",
          "[SecurityService] No security policies received from Mountain, using defaults"
        );
      }
    } catch (error) {
      CocoonDevLog3(
        "service",
        "[SecurityService] Failed to load security policies from Mountain:",
        error
      );
      CocoonDevLog3(
        "service",
        "[SecurityService] Continuing with default security policies"
      );
    }
  }
  /**
   * Initialize advanced audit logging system
   */
  async initializeAuditLogging() {
    try {
      this.auditLog = [];
      setInterval(() => {
        this.rotateAuditLog();
      }, 36e5);
      CocoonDevLog3(
        "service",
        "[SecurityService] Advanced audit logging initialized with hourly rotation"
      );
    } catch (error) {
      CocoonDevLog3(
        "service",
        "[SecurityService] Failed to initialize audit logging:",
        error
      );
      throw error;
    }
  }
  /**
   * Rotate audit log to prevent memory bloat
   */
  rotateAuditLog() {
    const maxLogSize = 1e4;
    if (this.auditLog.length > maxLogSize) {
      this.auditLog = this.auditLog.slice(-maxLogSize);
      CocoonDevLog3(
        "service",
        `[SecurityService] Audit log rotated, keeping ${maxLogSize} most recent events`
      );
    }
  }
  /**
   * Initialize advanced incident response system
   */
  async initializeIncidentResponse() {
    try {
      this.incidents = [];
      setInterval(() => {
        this.escalateCriticalIncidents();
      }, 3e5);
      CocoonDevLog3(
        "service",
        "[SecurityService] Advanced incident response system initialized"
      );
    } catch (error) {
      CocoonDevLog3(
        "service",
        "[SecurityService] Failed to initialize incident response:",
        error
      );
      throw error;
    }
  }
  /**
   * Escalate critical incidents automatically
   */
  escalateCriticalIncidents() {
    const criticalIncidents = this.incidents.filter(
      (incident) => incident.severity === "critical" && incident.status === "open" && Date.now() - incident.timestamp > 3e5
      // 5 minutes
    );
    if (criticalIncidents.length > 0) {
      CocoonDevLog3(
        "service",
        `[SecurityService] Auto-escalating ${criticalIncidents.length} critical incidents`
      );
      criticalIncidents.forEach((incident) => {
        incident.actions.push("Automatically escalated due to timeout");
        this.sendIncidentToMountain(incident);
      });
    }
  }
  /**
   * Send incident to Mountain for centralized tracking
   */
  async sendIncidentToMountain(incident) {
    try {
      const { MountainClientService: MountainClientService2 } = await Promise.resolve().then(() => (init_Service2(), Service_exports));
      const mountainClient = new MountainClientService2();
      await mountainClient.sendNotification("security.incident", {
        incidentId: incident.id,
        severity: incident.severity,
        description: incident.description,
        timestamp: incident.timestamp,
        actions: incident.actions
      });
      CocoonDevLog3(
        "service",
        `[SecurityService] Incident ${incident.id} sent to Mountain`
      );
    } catch (error) {
      CocoonDevLog3(
        "service",
        `[SecurityService] Failed to send incident ${incident.id} to Mountain:`,
        error
      );
    }
  }
  /**
   * Check module access permission
   */
  async checkModuleAccess(extensionId, moduleId) {
    const policy = this.getExtensionPolicy(extensionId);
    if (policy.blockedModules.includes(moduleId)) {
      await this.logSecurityEvent({
        id: `module-access-${Date.now()}`,
        type: "violation",
        severity: "high",
        extensionId,
        action: "module_access",
        resource: moduleId,
        outcome: "blocked",
        timestamp: Date.now(),
        details: { reason: "Module blocked by security policy" }
      });
      return false;
    }
    if (policy.allowedModules.includes(moduleId)) {
      await this.logSecurityEvent({
        id: `module-access-${Date.now()}`,
        type: "access",
        severity: "low",
        extensionId,
        action: "module_access",
        resource: moduleId,
        outcome: "allowed",
        timestamp: Date.now(),
        details: {}
      });
      return true;
    }
    await this.logSecurityEvent({
      id: `module-access-${Date.now()}`,
      type: "violation",
      severity: "medium",
      extensionId,
      action: "module_access",
      resource: moduleId,
      outcome: "denied",
      timestamp: Date.now(),
      details: { reason: "Module not explicitly allowed" }
    });
    return false;
  }
  /**
   * Check API access permission
   */
  async checkAPIAccess(extensionId, apiName) {
    const policy = this.getExtensionPolicy(extensionId);
    if (policy.blockedAPIs.includes(apiName)) {
      await this.logSecurityEvent({
        id: `api-access-${Date.now()}`,
        type: "violation",
        severity: "high",
        extensionId,
        action: "api_access",
        resource: apiName,
        outcome: "blocked",
        timestamp: Date.now(),
        details: { reason: "API blocked by security policy" }
      });
      return false;
    }
    if (policy.allowedAPIs.includes(apiName)) {
      await this.logSecurityEvent({
        id: `api-access-${Date.now()}`,
        type: "access",
        severity: "low",
        extensionId,
        action: "api_access",
        resource: apiName,
        outcome: "allowed",
        timestamp: Date.now(),
        details: {}
      });
      return true;
    }
    await this.logSecurityEvent({
      id: `api-access-${Date.now()}`,
      type: "violation",
      severity: "medium",
      extensionId,
      action: "api_access",
      resource: apiName,
      outcome: "denied",
      timestamp: Date.now(),
      details: { reason: "API not explicitly allowed" }
    });
    return false;
  }
  /**
   * Check network access permission
   */
  async checkNetworkAccess(extensionId) {
    const policy = this.getExtensionPolicy(extensionId);
    if (!policy.networkAccess) {
      await this.logSecurityEvent({
        id: `network-access-${Date.now()}`,
        type: "violation",
        severity: "critical",
        extensionId,
        action: "network_access",
        resource: "network",
        outcome: "denied",
        timestamp: Date.now(),
        details: { reason: "Network access not allowed" }
      });
      return false;
    }
    await this.logSecurityEvent({
      id: `network-access-${Date.now()}`,
      type: "access",
      severity: "medium",
      extensionId,
      action: "network_access",
      resource: "network",
      outcome: "allowed",
      timestamp: Date.now(),
      details: {}
    });
    return true;
  }
  /**
   * Check file system access permission
   */
  async checkFileSystemAccess(extensionId) {
    const policy = this.getExtensionPolicy(extensionId);
    if (!policy.fileSystemAccess) {
      await this.logSecurityEvent({
        id: `filesystem-access-${Date.now()}`,
        type: "violation",
        severity: "high",
        extensionId,
        action: "filesystem_access",
        resource: "filesystem",
        outcome: "denied",
        timestamp: Date.now(),
        details: { reason: "File system access not allowed" }
      });
      return false;
    }
    await this.logSecurityEvent({
      id: `filesystem-access-${Date.now()}`,
      type: "access",
      severity: "medium",
      extensionId,
      action: "filesystem_access",
      resource: "filesystem",
      outcome: "allowed",
      timestamp: Date.now(),
      details: {}
    });
    return true;
  }
  /**
   * Get extension security policy
   */
  getExtensionPolicy(extensionId) {
    if (this.policies.has(extensionId)) {
      return this.policies.get(extensionId);
    }
    return this.policies.get("default");
  }
  /**
   * Log security event with advanced threat detection
   */
  async logSecurityEvent(event) {
    this.auditLog.push(event);
    await this.detectThreatPatterns(event);
    if (event.severity === "critical" || event.severity === "high") {
      await this.escalateIncident(event);
    }
    CocoonDevLog3(
      "service",
      `[SecurityService] Security event logged: ${event.type} - ${event.action} - ${event.outcome}`
    );
  }
  /**
   * Detect threat patterns in real-time
   */
  async detectThreatPatterns(event) {
    const recentEvents = this.auditLog.filter(
      (e) => Date.now() - e.timestamp < 6e4 && // Last minute
      e.extensionId === event.extensionId
    );
    if (recentEvents.length >= 10) {
      const threatEvent = {
        id: `threat-detection-${Date.now()}`,
        type: "violation",
        severity: "critical",
        extensionId: event.extensionId,
        action: "threat_detection",
        resource: "security_system",
        outcome: "detected",
        timestamp: Date.now(),
        details: {
          pattern: "rapid_fire_violations",
          eventCount: recentEvents.length,
          timeWindow: "1 minute"
        }
      };
      this.auditLog.push(threatEvent);
      await this.escalateIncident(threatEvent);
      CocoonDevLog3(
        "service",
        `[SecurityService] Threat detected: ${event.extensionId} - rapid fire violations`
      );
    }
  }
  /**
   * Escalate security incident
   */
  async escalateIncident(event) {
    const incident = {
      id: `incident-${Date.now()}`,
      severity: event.severity,
      description: `Security ${event.type}: ${event.action} by extension ${event.extensionId}`,
      actions: [
        "Investigate security event",
        "Notify security team",
        "Review extension permissions"
      ],
      status: "open",
      timestamp: Date.now()
    };
    this.incidents.push(incident);
    CocoonDevLog3(
      "service",
      `[SecurityService] Security incident escalated: ${incident.description}`
    );
  }
  /**
   * Set security policy for extension
   */
  async setSecurityPolicy(extensionId, policy) {
    this.policies.set(extensionId, policy);
    await this.logSecurityEvent({
      id: `policy-update-${Date.now()}`,
      type: "authorization",
      severity: "low",
      extensionId,
      action: "policy_update",
      resource: "security_policy",
      outcome: "allowed",
      timestamp: Date.now(),
      details: { policy }
    });
    CocoonDevLog3(
      "service",
      `[SecurityService] Security policy updated for extension: ${extensionId}`
    );
  }
  /**
   * Get security policy for extension
   */
  async getSecurityPolicy(extensionId) {
    return this.policies.get(extensionId);
  }
  /**
   * Get audit log
   */
  getAuditLog() {
    const violations = this.auditLog.filter(
      (event) => event.outcome === "denied" || event.outcome === "blocked"
    );
    const authenticationFailures = this.auditLog.filter(
      (event) => event.type === "authentication" && event.outcome === "denied"
    );
    const authorizationFailures = this.auditLog.filter(
      (event) => event.type === "authorization" && event.outcome === "denied"
    );
    return {
      events: [...this.auditLog],
      summary: {
        totalEvents: this.auditLog.length,
        violations: violations.length,
        authenticationFailures: authenticationFailures.length,
        authorizationFailures: authorizationFailures.length,
        lastUpdated: Date.now()
      }
    };
  }
  /**
   * Get active incidents
   */
  getActiveIncidents() {
    return this.incidents.filter(
      (incident) => incident.status === "open" || incident.status === "investigating"
    );
  }
  /**
   * Resolve incident
   */
  async resolveIncident(incidentId, resolution) {
    const incident = this.incidents.find((inc) => inc.id === incidentId);
    if (incident) {
      incident.status = "resolved";
      incident.resolutionTime = Date.now() - incident.timestamp;
      await this.logSecurityEvent({
        id: `incident-resolve-${Date.now()}`,
        type: "authorization",
        severity: "low",
        extensionId: "security-service",
        action: "incident_resolution",
        resource: incidentId,
        outcome: "allowed",
        timestamp: Date.now(),
        details: { resolution }
      });
      CocoonDevLog3(
        "service",
        `[SecurityService] Incident resolved: ${incidentId}`
      );
    }
  }
  /**
   * Generate security report
   */
  generateSecurityReport() {
    const recommendations = [];
    const auditLog = this.getAuditLog();
    if (auditLog.summary.violations > 10) {
      recommendations.push(
        "Review security policies for frequent violations"
      );
    }
    if (auditLog.summary.authenticationFailures > 5) {
      recommendations.push("Investigate authentication failures");
    }
    if (this.getActiveIncidents().length > 0) {
      recommendations.push("Address active security incidents");
    }
    return {
      policies: this.policies.size,
      auditLog,
      activeIncidents: this.getActiveIncidents(),
      recommendations
    };
  }
  /**
   * Stop security service
   */
  async stop() {
    CocoonDevLog3("service", "[SecurityService] Stopping security service");
    this.securityActive = false;
    await this.saveSecurityState();
    CocoonDevLog3("service", "[SecurityService] Security service stopped");
  }
  /**
   * Save security state
   */
  async saveSecurityState() {
    CocoonDevLog3("service", "[SecurityService] Security state saved");
  }
};
var SecurityServiceLayer = Layer9.effect(
  "SecurityService",
  Effect10.sync(() => new SecurityService())
);
var SecurityServiceLive = Layer9.effect(
  "SecurityService",
  Effect10.sync(() => new SecurityService())
);

// Source/Services/Terminal/Service.ts
init_Service();
init_Log();
import { Context as Context8, Effect as Effect11, Layer as Layer10 } from "effect";
var ITerminalService2 = Context8.Tag("ITerminalService")();
var TerminalService = class {
  constructor(mountainClient) {
    this.mountainClient = mountainClient;
  }
  mountainClient;
  static {
    __name(this, "TerminalService");
  }
  async createTerminal(name, shellPath, cwd) {
    CocoonDevLog3("service", `[Terminal] Creating terminal: ${name}`);
    const terminalId = await this.mountainClient.sendRequest(
      "$terminal:create",
      {
        name,
        shell_path: shellPath,
        cwd
      }
    );
    return terminalId;
  }
  async sendText(terminalId, text) {
    await this.mountainClient.sendRequest("$terminal:sendText", {
      id: terminalId,
      data: text
    });
  }
  async resize(terminalId, cols, rows) {
    CocoonDevLog3(
      "service",
      `[Terminal] Resize ${terminalId} to ${cols}x${rows}`
    );
  }
  async kill(terminalId) {
    CocoonDevLog3("service", `[Terminal] Kill ${terminalId}`);
  }
};
var TerminalServiceLayer = Layer10.effect(
  ITerminalService2,
  Effect11.gen(function* () {
    const mountainClient = yield* IMountainClientService;
    return new TerminalService(mountainClient);
  })
);

// Source/Orchestration/Old/Style/Services.ts
init_Service2();
import { Layer as Layer11 } from "effect";
var OldStyleServices = class {
  static {
    __name(this, "OldStyleServices");
  }
  /**
   * Validate dependencies for old-style services
   *
   * @returns A composed Layer with all service dependencies
   */
  validateDependencies() {
    return Layer11.mergeAll(
      MountainClientServiceLayer,
      ConfigurationLayer,
      ModuleInterceptorServiceLayer,
      ExtensionHostLayer,
      APIFactoryLayer,
      TerminalServiceLayer,
      SecurityServiceLive,
      PerformanceMonitoringServiceLive,
      ErrorHandlingServiceLive
    );
  }
  /**
   * Compose application layer for old-style services
   *
   * Builds the dependency graph with proper layering:
   * - Base Infrastructure (no dependencies)
   * - Core Capabilities (depend on Base)
   */
};
export {
  OldStyleServices as default
};
//# sourceMappingURL=Services.js.map
