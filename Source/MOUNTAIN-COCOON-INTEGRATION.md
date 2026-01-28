# MOUNTAIN-COCOON INTEGRATION SPECIFICATION

## Architecture Overview

Mountain runs as a Tauri application that launches Cocoon as a sidecar process via gRPC communication. The integration follows a robust sidecar pattern with bidirectional communication.

### System Architecture
```
┌─────────────────┐    gRPC (Vine)    ┌─────────────────┐
│   Mountain      │ ◄────────────────► │    Cocoon       │
│  (Rust Tauri)   │    Ports: 50051/52 │ (Node.js Host)  │
└─────────────────┘                    └─────────────────┘
       │                                         │
       │ Sky (Astro Web UI)                      │ Extensions
       │                                         │
       ▼                                         ▼
┌─────────────────┐                    ┌─────────────────┐
│     Wind        │                    │ VS Code Exts     │
│   (Desktop)     │                    │   (Various)      │
└─────────────────┘                    └─────────────────┘
```

## Mountain Integration Points

### Process Management
**File:** `Mountain/Source/ProcessManagement/CocoonManagement.rs`
**Responsibility:** Launch and manage Cocoon sidecar lifecycle

**Integration Details:**
- Cocoon is launched as a Node.js child process
- Environment variables configure gRPC ports (50051/50052)
- Bootstrap script: `scripts/cocoon/bootstrap-fork.js`
- Feature-gated with `ExtensionHostCocoon` feature flag

**Key Environment Variables:**
```rust
EnvironmentVariables.insert("MOUNTAIN_GRPC_PORT", "50051");
EnvironmentVariables.insert("COCOON_GRPC_PORT", "50052");
EnvironmentVariables.insert("VSCODE_PARENT_PID", parent_pid);
```

### gRPC Communication (Vine Protocol)
**File:** `Mountain/Source/Vine/Server/MountainVinegRPCService.rs`
**Protocol:** `Mountain/Proto/Vine.proto`

**Service Definitions:**
```proto
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
```

**Message Structure:**
```proto
message GenericRequest {
    uint64 RequestIdentifier = 1;
    string Method = 2;
    bytes Parameter = 3; // JSON-serialized parameters
}
```

## Cocoon Implementation Requirements

### gRPC Server Implementation
**File:** `Source/Services/GRPCServerService.ts`
**Responsibility:** Implement CocoonService gRPC server

**Technical Requirements:**
- gRPC server listening on port 50052
- Protocol buffer service implementation
- JSON serialization/deserialization
- Error handling and status codes

**Dependencies:**
- `@grpc/grpc-js` for gRPC server implementation
- `protobufjs` for protocol buffer handling
- Generated Vine protocol definitions

### Mountain Client Implementation
**File:** `Source/Services/MountainClientService.ts`
**Responsibility:** Client for MountainService gRPC calls

**Technical Requirements:**
- gRPC client connection to Mountain (port 50051)
- Request/response pattern implementation
- Notification fire-and-forget pattern
- Connection management and reconnection

## Bootstrap Process

### Mountain Bootstrap
1. Tauri application starts
2. Check `ExtensionHostCocoon` feature flag
3. Launch Cocoon via Node.js bootstrap script
4. Establish gRPC connection
5. Perform handshake and readiness check

### Cocoon Bootstrap
**File:** `scripts/cocoon/bootstrap-fork.js` (To be created)
**Responsibility:** Cocoon process entry point

**Bootstrap Steps:**
1. Parse environment variables
2. Initialize gRPC server
3. Connect to Mountain gRPC service
4. Initialize extension host services
5. Signal readiness to Mountain

## Communication Patterns

### Request-Response Pattern
```typescript
// Cocoon → Mountain
const response = await mountainClient.processRequest({
    method: "extension.activate",
    parameters: { extensionId: "ms-python.python" }
});

// Mountain → Cocoon  
const result = await grpcServer.processMountainRequest({
    method: "configuration.get",
    parameters: { key: "editor.fontSize" }
});
```

### Notification Pattern
```typescript
// Fire-and-forget notifications
await mountainClient.sendNotification({
    method: "extension.activated",
    parameters: { extensionId: "ms-python.python" }
});
```

### Error Handling Pattern
```typescript
// Structured error responses
{
    error: {
        code: -32601, // Method not found
        message: "Unknown method: invalid.method",
        data: null
    }
}
```

## Service Integration Mapping

### Configuration Service Integration
**Mountain Service:** `ConfigurationBridge`
**Cocoon Service:** `ConfigurationService`

**Communication Flow:**
1. Cocoon requests configuration via gRPC
2. Mountain delegates to ConfigurationBridge
3. Configuration synchronized between systems
4. Change notifications propagated

### Extension Management Integration
**Mountain Service:** `ExtensionManagement`
**Cocoon Service:** `ExtensionHostService`

**Communication Flow:**
1. Mountain manages extension installation
2. Cocoon handles extension loading/execution
3. Real-time extension state synchronization
4. Performance metrics collection

## Performance Requirements

### Communication Performance
- **Latency:** <10ms round-trip for gRPC calls
- **Throughput:** Support 1000+ messages/second
- **Connection:** Persistent connection with keep-alive

### Resource Management
- **Memory:** <100MB baseline for Cocoon process
- **CPU:** <10% average utilization
- **Network:** Efficient gRPC compression

## Security Implementation

### Process Isolation
- Cocoon runs as separate Node.js process
- gRPC provides clear API boundary
- No direct filesystem access between processes

### Communication Security
- gRPC with TLS encryption
- Authentication tokens for service identification
- Message validation and sanitization

### Extension Security
- Sandboxed extension execution
- API permission system
- Security policy enforcement

## Error Handling and Recovery

### Connection Failures
- Automatic reconnection with exponential backoff
- Circuit breaker pattern for repeated failures
- Graceful degradation when Mountain unavailable

### Process Failures
- Mountain monitors Cocoon process health
- Automatic restart with state preservation
- Crash reporting and diagnostics

### Protocol Errors
- Structured error codes and messages
- Request validation and sanitization
- Fallback mechanisms for compatibility

## Testing Strategy

### Integration Testing
**Environment:** Local Mountain + Cocoon setup
**Scenarios:**
- Process launch and handshake
- gRPC communication patterns
- Error conditions and recovery
- Performance under load

### End-to-End Testing
**Setup:** Mountain Tauri app with Cocoon sidecar
**Validation:**
- Extension loading and activation
- Configuration synchronization
- Real-time collaboration features

### Performance Testing
**Metrics:**
- gRPC call latency distribution
- Memory usage over time
- Concurrent extension handling
- Network bandwidth utilization

## Deployment Configuration

### Mountain Cargo.toml
```toml
[features]
default = ["ExtensionHostCocoon", "MistNative"]
ExtensionHostCocoon = []
```

### Cocoon Package.json
```json
{
  "scripts": {
    "start": "node scripts/cocoon/bootstrap-fork.js",
    "build": "tsc && node scripts/build-grpc.js"
  },
  "dependencies": {
    "@grpc/grpc-js": "^1.9.0",
    "protobufjs": "^7.0.0"
  }
}
```

### Environment Configuration
```bash
# Mountain environment
MOUNTAIN_GRPC_PORT=50051
COCOON_GRPC_PORT=50052
VSCODE_PARENT_PID=$PARENT_PID

# Cocoon environment  
NODE_ENV=production
EXTENSION_HOST_PORT=50052
MOUNTAIN_CONNECTION_HOST=localhost
```

## Monitoring and Observability

### Metrics Collection
- gRPC call success/failure rates
- Message processing times
- Memory and CPU usage
- Extension performance metrics

### Logging Strategy
- Structured logging with correlation IDs
- gRPC call tracing
- Performance profiling data
- Security event auditing

### Health Checking
- Process heartbeat monitoring
- Service readiness probes
- Performance degradation detection
- Automatic health recovery

## Implementation TODOs

### High Priority TODOs
```typescript
// TODO: Implement gRPC server for CocoonService
// Specification: MOUNTAIN-COCOON-INTEGRATION.md (gRPC Server)
// Implementation: @grpc/grpc-js server with Vine protocol
// Dependencies: Generated protocol buffers, error handling
// Validation: Basic gRPC communication with Mountain

// TODO: Create Mountain gRPC client
// Specification: MOUNTAIN-COCOON-INTEGRATION.md (Mountain Client)
// Implementation: Client for MountainService with connection management
// Dependencies: gRPC client library, connection pooling
// Validation: Successful Mountain service calls

// TODO: Implement bootstrap script
// Specification: MOUNTAIN-COCOON-INTEGRATION.md (Bootstrap Process)
// Implementation: Node.js entry point with environment parsing
// Dependencies: gRPC server initialization, process management
// Validation: Successful Cocoon launch by Mountain
```

### Medium Priority TODOs
```typescript
// TODO: Implement service integration mapping
// Specification: MOUNTAIN-COCOON-INTEGRATION.md (Service Integration)
// Implementation: Configuration and extension service bridges
// Dependencies: Existing Cocoon services, gRPC communication
// Validation: End-to-end service functionality

// TODO: Add security implementation
// Specification: MOUNTAIN-COCOON-INTEGRATION.md (Security)
// Implementation: TLS, authentication, permission system
// Dependencies: Certificate management, security policies
// Validation: Security audit and penetration testing
```

### Low Priority TODOs
```typescript
// TODO: Implement monitoring and observability
// Specification: MOUNTAIN-COCOON-INTEGRATION.md (Monitoring)
// Implementation: Metrics collection, logging, health checks
// Dependencies: Monitoring libraries, performance tools
// Validation: Production-ready monitoring system
```

## Success Criteria

### Functional Success
- ✅ Cocoon launches successfully as Mountain sidecar
- ✅ Bidirectional gRPC communication working
- ✅ Configuration synchronization functional
- ✅ Extension loading and execution working

### Performance Success
- ✅ gRPC latency <10ms (95th percentile)
- ✅ Memory usage <100MB baseline
- ✅ Support for 50+ concurrent extensions
- ✅ Connection reliability >99.9%

### Security Success
- ✅ Process isolation verified
- ✅ Communication encryption working
- ✅ Permission system enforced
- ✅ Security audit passed

This specification provides the complete technical requirements for integrating Cocoon as a sidecar process within the Mountain Tauri application, enabling robust VS Code extension hosting with enterprise-grade performance and security.