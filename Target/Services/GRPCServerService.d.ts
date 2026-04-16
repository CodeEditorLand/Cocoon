/**
 * @module GRPCServerService
 * @description
 * Cocoon's gRPC server implementation for Mountain integration.
 * Implements the CocoonService protocol defined in Mountain's Vine.proto.
 * Provides bidirectional streaming for real-time event communication.
 *
 * RESPONSIBILITIES:
 * - Start and manage gRPC server for receiving Mountain requests
 * - Implement bidirectional streaming for real-time events
 * - Handle Mountain requests and route to appropriate services
 * - Send and receive notifications from Mountain
 * - Implement request cancellation with timeout handling
 * - Handle authentication and authorization tokens
 * - Manage connection keepalive for reliability
 * - Monitor server health and track errors
 *
 * Based on Mountain's Vine gRPC protocol specification.
 * Specification: MOUNTAIN-COCOON-INTEGRATION.md (gRPC Server Implementation)
 */
import { EventEmitter } from "events";
import { Layer } from "effect";
import { IGRPCServerService } from "../Interfaces/IGRPCServerService";
/**
 * GRPCServerService implementation with bidirectional streaming support
 */
export declare class GRPCServerService extends EventEmitter implements IGRPCServerService {
    readonly _serviceBrand: undefined;
    private server;
    private port;
    private isRunning;
    private serviceImplementation;
    private streamingHandlers;
    private authToken;
    private authEnabled;
    private readonly keepaliveInterval;
    private readonly keepaliveTimeout;
    private keepaliveTimer;
    private activeRequests;
    private readonly startTime;
    private errorCount;
    private requestCount;
    constructor();
    /**
     * Parse environment variables for configuration
     */
    private parseEnvironment;
    /**
     * Validate authentication token
     */
    private ValidateAuthentication;
    /**
     * Create gRPC service implementation with bidirectional streaming support
     */
    private createServiceImplementation;
    /**
     * Start bidirectional streaming for real-time events
     * TODO: FUTURE: Implement streaming handlers for real-time event communication
     * Specification: MOUNTAIN-COCOON-INTEGRATION.md (Bidirectional Streaming)
     * Implementation: Add stream handlers for Mountain-Cocoon event stream
     * Dependencies: Event marshaling, backpressure handling
     * Validation: Test with high-frequency event streams
     */
    private startBidirectionalStreaming;
    /**
     * Handle streaming request
     */
    private handleStreamingRequest;
    /**
     * Start keepalive for streaming connection
     */
    private startKeepalive;
    /**
     * Broadcast event to all active streaming connections
     */
    private BroadcastEvent;
    /**
     * Handle Mountain request with validation and routing
     */
    private handleMountainRequest;
    /**
     * Validate request method format.
     * Accepts:
     *   - "service.method" (e.g., "extension.activate")
     *   - "$provideFeature" (e.g., "$provideHover", "$provideCompletions")
     *     Mountain invokes these when Sky requests language intelligence.
     *   - "InitializeExtensionHost" — Mountain's extension host init handshake
     *   - "$deltaExtensions", "$activateByEvent", "$startExtensionHost"
     *     Mountain's extension host lifecycle methods
     */
    private IsValidMethod;
    /**
     * Serialize response data to buffer
     */
    private SerializeResponseData;
    /**
     * Parse parameters from JSON with enhanced error handling
     */
    private parseParameters;
    /**
     * Route request to appropriate service
     * Service mapping and request routing is fully implemented
     */
    private routeRequest;
    /**
     * Handle InitializeExtensionHost from Mountain.
     * Receives the full IExtensionHostInitData payload (extensions list,
     * workspace, environment, telemetry, paths). Stores init data and
     * returns "initialized" so Mountain unblocks.
     */
    private HandleInitializeExtensionHost;
    /**
     * Handle $deltaExtensions from Mountain.
     * Receives extension list diffs (added/removed) after initial load.
     */
    private HandleDeltaExtensions;
    /**
     * Handle $activateByEvent from Mountain.
     * Activates all extensions that declare the given activation event.
     */
    private HandleActivateByEvent;
    /**
     * Load and activate a single extension from disk.
     * Expects extensionRegistry entries from Mountain's InitializeExtensionHost.
     */
    private ActivateExtension;
    /**
     * Build a minimal VS Code ExtensionContext for activating an extension.
     */
    private CreateExtensionContext;
    /**
     * Handle $startExtensionHost from Mountain.
     * Signals that the extension host should begin processing.
     */
    private HandleStartExtensionHost;
    /** Stored initialization data from Mountain's InitializeExtensionHost */
    private extensionHostInitData;
    /** Indexed extensions from InitializeExtensionHost, keyed by identifier */
    private extensionRegistry;
    /** Activation event → extension identifiers that declare it */
    private activationEventIndex;
    /** Whether the extension host has been initialized */
    private extensionHostReady;
    /** Track which extensions have already been activated (prevents double-activation) */
    private readonly activatedExtensions;
    /** Reverse gRPC client for sending messages back to Mountain */
    private mountainClient;
    /**
     * Connect to Mountain's gRPC server (MountainService on :50051).
     * Called after InitializeExtensionHost confirms Mountain is running.
     * Creates a new MountainClientService instance and connects.
     */
    private ConnectToMountain;
    /**
     * Send a notification back to Mountain (for forwarding to Wind).
     * Used for extension host protocol messages, provider registrations, etc.
     */
    SendToMountain(Method: string, Parameters: any): Promise<void>;
    /**
     * Normalize a VS Code range { start: { line, character }, end: {...} } →
     * Mountain's RangeDTO { StartLineNumber, StartColumn, EndLineNumber, EndColumn }.
     */
    private NormalizeRange;
    /**
     * Invoke a language feature provider stored in LanguageProviderRegistry.
     *
     * Called for methods matching /^\$provide[A-Z]/. Mountain passes:
     *   params[0]  = provider handle (number)
     *   params[1]  = URI object  { external: "file:///...", $mid: 1 }
     *   params[2]  = Position    { Line/line, Character/character }  (most features)
     *   params[3]  = Context / Options (completion, code actions, etc.)
     *
     * Returns the raw VS Code provider result (serialized by the caller).
     */
    private InvokeLanguageProvider;
    /**
     * Handle Mountain notification with event emission
     */
    private handleMountainNotification;
    /**
     * Handle specific notification types
     */
    private handleSpecificNotification;
    /**
     * Handle cancel operation with request tracking
     */
    private handleCancelOperation;
    /**
     * Register cancel handler for a request
     * TODO: FUTURE: Integrate with Cancellation service for enhanced cancellation support
     * Specification: MOUNTAIN-OPERATIONS.md (Cancellation Semantics)
     * Implementation: Proper cancellation propagation across service boundaries
     * Dependencies: CancellationService, operation context
     * Validation: Test with nested and parallel operations
     */
    private registerCancelHandler;
    /**
     * Start gRPC server
     */
    start(): Promise<void>;
    /**
     * Load protocol definition from Mountain's Vine.proto with fallback support
     * Protocol loading is fully implemented with multiple search paths and fallback
     */
    private loadProtocolDefinition;
    private startServer;
    /**
     * Stop gRPC server
     */
    stop(): Promise<void>;
    /**
     * Get server status with detailed metrics
     */
    getStatus(): {
        running: boolean;
        port: number;
        uptime?: number;
        errorCount: number;
        requestCount: number;
        activeConnections: number;
        authEnabled: boolean;
    };
    /**
     * Add event listener for notifications
     */
    onNotification(callback: (method: string, parameters: any) => void): void;
}
/**
 * Service layer for GRPCServerService
 */
export declare const GRPCServerServiceLayer: Layer.Layer<IGRPCServerService, never, never>;
/**
 * Live implementation
 */
export declare const GRPCServerServiceLive: Layer.Layer<IGRPCServerService, never, never>;
//# sourceMappingURL=GRPCServerService.d.ts.map