/**
 * @module Effect
 * @description
 * Consolidated exports for all Cocoon Effect-TS services.
 */

// Bootstrap
export {
	BootstrapTag,
	BootstrapLive,
	BootstrapMock,
	makeMockBootstrap,
	runBootstrap,
	type BootstrapOptions,
	type BootstrapResult,
	type BootstrapService,
} from "./Bootstrap.js";

// Extension
export {
	ExtensionTag,
	Extension,
	ExtensionLive,
	ExtensionMock,
	makeMockExtension,
	type ExtensionManifest,
	type ExtensionHost,
	type ExtensionState,
	type ActivateResult,
	type DeactivateResult,
	ExtensionNotFoundError,
	ExtensionActivationError,
	ExtensionDeactivationError,
} from "./Extension.js";

// Health
export {
	HealthTag,
	HealthLive,
	HealthMock,
	makeMockHealth,
	type HealthStatus,
	type ServiceHealth,
	type SystemHealth,
	type HealthService,
} from "./Health.js";

// Module Interceptor
export {
	ModuleInterceptorTag,
	ModuleInterceptor,
	ModuleInterceptorLive,
	ModuleInterceptorMock,
	makeMockModuleInterceptor,
	type SecurityLevel,
	type SecurityPolicy,
	type ModuleInterceptionRequest,
	type ModuleInterceptionResult,
	type InterceptionStats,
	ModuleNotFoundError,
	ModuleAccessDeniedError,
	SecurityPolicyNotFoundError,
} from "./Module/Interceptor.js";

// Mountain Client
export {
	MountainClientTag,
	MountainClient,
	MountainClientLive,
	MountainClientMock,
	makeMockMountainClient,
	type ConnectionState,
	type ClientConfig,
	type ClientMetrics,
	type RPCResponse,
	ConnectionError,
	RPCError,
	DisconnectionError,
} from "./Mountain/Client.js";

// RPC Server
export {
	RPCServerTag,
	RPCServer,
	RPCServerLive,
	RPCServerMock,
	makeMockRPCServer,
	type ServerState,
	type ServerConfig,
	type ServerMetrics,
	type RPCRequest,
	ServerStartError,
	ServerStopError,
	ServerNotRunningError,
} from "./RPCServer.js";

// Telemetry
export {
	TelemetryTag,
	Telemetry,
	TelemetryLive,
	TelemetryMock,
	makeMockTelemetry,
	withSpan,
	type TelemetryMetric,
	type TelemetrySpan,
	type TelemetryEvent,
	type TelemetryLog,
	type TelemetryService,
	type SpanHandle,
	TelemetryCollectionError,
} from "./Telemetry.js";
