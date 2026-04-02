# VSCode Extension Host Analysis

## Overview

This document analyzes the VSCode extension host architecture based on existing
Cocoon implementation and Wind patterns. The analysis focuses on understanding
how VSCode manages extensions and provides the `vscode` API.

## Core Architecture Analysis

### Extension Host Service (`extHostExtensionService.ts`)

**Key Responsibilities:**

- Extension lifecycle management (loading, activation, deactivation)
- Service initialization and dependency injection
- Error handling and recovery
- Module interception and API provisioning

**Key Patterns Identified:**

#### 1. Extension Lifecycle Management

```typescript
// VSCode pattern
class ExtensionHostService {
	async activateExtension(extension: IExtensionDescription): Promise<void> {
		// Load extension module
		// Create extension context
		// Call extension's activate function
		// Handle activation events
	}

	async deactivateExtension(extensionId: string): Promise<void> {
		// Call extension's deactivate function
		// Clean up resources
		// Remove from active extensions
	}
}
```

#### 2. Service Initialization Pattern

```typescript
// VSCode uses service collection pattern
const services = new ServiceCollection();
services.set(IExtHostCommands, new ExtHostCommands(...));
services.set(IExtHostDocuments, new ExtHostDocuments(...));
// ... more services

const instantiationService = new InstantiationService(services);
```

#### 3. Module Interception Pattern

```typescript
// VSCode intercepts require('vscode') calls
class ExtHostRequireInterceptor {
	intercept(moduleId: string): any {
		if (moduleId === "vscode") {
			return this.createVSCodeAPI();
		}
		return originalRequire(moduleId);
	}

	private createVSCodeAPI(): any {
		// Construct vscode namespace with all services
		return {
			commands: this.commandsService,
			window: this.windowService,
			workspace: this.workspaceService,
			// ... more APIs
		};
	}
}
```

## Cocoon Implementation vs VSCode Patterns

### ✅ Compatible Patterns

1. **Extension Lifecycle Management**
    - Cocoon's `ExtensionHost.ts` follows VSCode patterns
    - Proper activation and deactivation flow
    - Error handling and recovery mechanisms

2. **Service Architecture**
    - Cocoon uses Effect-TS services instead of VSCode's OOP
    - Similar service interfaces and responsibilities
    - Proper dependency injection

3. **Module Interception**
    - Cocoon's `RequireInterceptor.ts` follows VSCode pattern
    - Proper `require('vscode')` interception
    - ESM support (advanced feature)

### 🔄 Differences Requiring Validation

1. **Effect-TS vs OOP Architecture**
    - Cocoon uses functional Effect-TS patterns
    - VSCode uses traditional OOP with service collection
    - Need to ensure API compatibility

2. **Communication Protocol**
    - Cocoon uses gRPC with Mountain
    - VSCode uses custom IPC protocol
    - Need to ensure message compatibility

3. **Error Handling**
    - Cocoon uses Effect-TS error types
    - VSCode uses exception handling
    - Need to ensure error compatibility

## Implementation Requirements

### Core Extension Host Service

**Required Features:**

- Extension loading and activation
- Module interception system
- Service initialization
- Error handling and recovery

**VSCode Compatibility:**

- Same extension activation flow
- Compatible extension context
- Same error handling patterns

### API Factory Service

**Required Features:**

- Construct `vscode` namespace
- Provide service instances
- Handle API versioning
- Support extension context

**VSCode Compatibility:**

- Same API surface
- Compatible method signatures
- Same behavior patterns

### Module Interception System

**Required Features:**

- Intercept `require('vscode')` calls
- Handle ESM imports
- Provide proper API instances
- Support multiple extension contexts

**VSCode Compatibility:**

- Same interception behavior
- Compatible module resolution
- Same error handling

## Integration with Mountain

### Communication Protocol

**Current Cocoon Implementation:**

```typescript
// gRPC communication with Mountain
class IPCService {
	async sendRequest(method: string, params: any[]): Promise<any> {
		// Send gRPC request to Mountain
		// Handle response and errors
	}
}
```

**VSCode Equivalent:**

```typescript
// Custom IPC protocol
class MainThreadExtensionService {
	async $activateExtension(extensionId: string): Promise<void> {
		// Send IPC message to main process
		// Handle response and errors
	}
}
```

### Service Mapping

**Cocoon Service → VSCode Service Mapping:**

- `CommandService` → `IExtHostCommands`
- `DocumentService` → `IExtHostDocuments`
- `WindowService` → `IExtHostWindow`
- `WorkspaceService` → `IExtHostWorkspace`
- `DebugService` → `IExtHostDebug`
- `TerminalService` → `IExtHostTerminal`

## Testing Strategy

### Compatibility Testing

**Test Scenarios:**

1. Extension loading and activation
2. API method calls and responses
3. Error handling and recovery
4. Performance benchmarking

**Validation Criteria:**

- Same behavior as VSCode
- Compatible error messages
- Similar performance characteristics

### Integration Testing

**Test Scenarios:**

1. Communication with Mountain
2. Service interactions
3. Error recovery
4. Resource cleanup

## Next Implementation Steps

### Phase 1: Core Infrastructure

1. **Service Mapping Registry**
    - Create service descriptor system
    - Implement dependency resolution
    - Create layer composition

2. **Core Extension Host**
    - Extension lifecycle management
    - Module interception
    - Error handling

### Phase 2: Communication Layer

3. **IPC Service**
    - gRPC client implementation
    - Message protocol
    - Connection management

### Phase 3: Core Services

4. **VS Code API Services**
    - Commands, Documents, Window services
    - Debug and Terminal services
    - Integration testing

## Risk Assessment

### High Risk Areas

1. **Effect-TS Compatibility** - Need to validate against VSCode patterns
2. **Performance Requirements** - Must match VSCode performance
3. **Extension Compatibility** - Need to test with real extensions

### Mitigation Strategies

1. **Incremental Implementation** - Start with core APIs
2. **Continuous Testing** - Regular validation against VSCode
3. **Performance Monitoring** - Early benchmarking

## Conclusion

Cocoon's current architecture shows strong compatibility with VSCode patterns.
The main differences are in the underlying implementation (Effect-TS vs OOP) and
communication protocol (gRPC vs custom IPC).

**Next Action**: Create the service mapping registry to enable proper dependency
injection and service composition.
