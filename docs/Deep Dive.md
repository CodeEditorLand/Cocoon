<table><tr>
<td colspan="1"> <h3 align="center"> <picture>
<source media="(prefers-color-scheme: dark)" srcset="https://PlayForm.Cloud/Dark/Image/GitHub/Land.svg">
<source media="(prefers-color-scheme: light)" srcset="https://PlayForm.Cloud/Image/GitHub/Land.svg">
<img width="28" alt="Land Logo" src="https://PlayForm.Cloud/Image/GitHub/Land.svg">
</picture> </h3> </td> <td colspan="3" valign="top"> <h3 align="center"> Cocoon 🦋
</h3> </td>
</tr></table>

---

# **Cocoon** 🦋 Deep Dive & Architecture

This document provides a detailed technical overview of the **Cocoon** project
for developers. It explores the internal architecture, the flow of control from
extension API call to gRPC request, and the design patterns used to create a
robust, Effect-TS native extension host.

---

## Core Philosophy

The architecture of `Cocoon` is designed around three central ideas:

1.  **High Fidelity Replication:** The primary goal is to create a `vscode` API
    object that is indistinguishable from the one provided by the real VS Code.
    This is achieved by running the actual `ExtHostExtensionService` from VS
    Code's platform code and providing it with a complete set of
    dependency-injected "shim" services.
2.  **Declarative and Type-Safe Services:** Every component, from IPC management
    to API shims, is built as a declarative `Effect-TS` `Layer`. This enforces a
    clean separation of concerns, makes dependencies explicit, and ensures all
    asynchronous operations and potential failures are handled in a type-safe
    manner.
3.  **Strictly Defined Communication:** All communication with the `Mountain`
    backend is funneled through a single, well-defined `IpcProvider` service.
    This service uses gRPC, ensuring that the boundary between the extension
    host and the native backend is performant, strongly-typed, and robust.

---

## Deep Dive into `Cocoon`'s Components

### 1. `Index.ts` (The Application Entry Point)

- **Role:** This is the "main" function for the `Cocoon` Node.js process. It
  orchestrates the entire startup sequence.
- **Functionality:**
    - **Bootstrap:** It first runs the `RunProcessPatches` Effect, which hardens
      the Node.js environment (e.g., piping logs, handling uncaught exceptions).
    - **Handshake:** It initializes the `IpcProvider` and sends the
      `$initialHandshake` notification to `Mountain`, signaling that it is
      ready.
    - **RPC Handling:** It registers an RPC handler for the critical
      `initExtensionHost` method. It does not proceed with full initialization
      until this method is called by `Mountain`.
    - **Layer Composition:** Once `initExtensionHost` is called, it receives the
      massive initialization payload. It uses this data to create the
      `InitDataLayer` and then composes the final `AppLayer` by merging all core
      services (`Core/`) and API shims (`Service/`).
    - **Execution:** It runs the `FullAppInitialization` Effect, which uses the
      fully composed `AppLayer` to start the extension host.

### 2. The `Core/` Modules (The Extension Runtime Engine)

- **Role:** These services are responsible for the mechanics of running
  extensions, not for implementing the `vscode` API itself.
- **Component Breakdown:**
    - **`RequireInterceptor.ts`:** Implements a high-fidelity patch of Node.js's
      `require()` mechanism. It uses a factory pattern to intercept requests for
      special modules like `'vscode'`.
    - **`ExtensionPaths.ts`:** A crucial dependency for the
      `RequireInterceptor`. It maintains a map of all installed extension file
      paths, allowing the interceptor to determine _which_ extension is making a
      `require` call based on the calling module's file path.
    - **`ApiFactory.ts`:** This is the most critical `Core` service. Its
      `CreateApi` method constructs the `vscode` object for a specific
      extension. It injects all the necessary `Service/*` providers into the
      correct namespaces (e.g., injecting `CommandsProvider` into
      `vscode.commands`). It also wraps all `Event` emitters in a try/catch
      handler to prevent a faulty extension listener from crashing the host.
    - **`ExtensionHost.ts`:** This is the service that manages the extension
      lifecycle. It is a high-fidelity replica of VS Code's
      `ExtHostExtensionService`. It is responsible for loading an extension's
      main file, calling its `activate()` function with the `ExtensionContext`
      and the API object from the `ApiFactory`, and later calling
      `deactivate()`.

### 3. The `Service/` Modules (The `vscode` API Shims)

- **Role:** This is the largest collection of modules in `Cocoon`. Each module
  is a self-contained `Effect-TS` `Layer` that implements a specific part of the
  `vscode` API or a required internal `IExtHost...` service.
- **Structure of a Service Shim (e.g., `Service/Commands.ts`):**
    - **`Tag.ts`:** Defines the `Context.Tag` for the service (e.g.,
      `CommandsProvider`).
    - **`Definition.ts`:** Contains the concrete implementation of the service
      interface (e.g., `IExtHostCommands`). The methods here (`$executeCommand`,
      `$registerCommand`) are the RPC handlers that `Mountain` calls.
    - **`Live.ts`:** Provides the `Layer` that makes the service available for
      dependency injection.
- **Functionality:** The primary job of these shims is to act as a bridge. For
  example, when an extension calls `vscode.commands.executeCommand(...)`, the
  `ApiFactory` routes this to the `CommandsProvider`. The `CommandsProvider`
  then creates an `Effect` that uses the `IpcProvider` to send a
  `$executeCommand` gRPC request to `Mountain`.

### 4. `Service/Ipc.ts` (The gRPC Communication Hub)

- **Role:** This service is the single point of contact with the `Mountain`
  backend. It abstracts all the complexities of gRPC communication.
- **Functionality:**
    - **Bi-directional:** It contains both a gRPC **client** (for sending
      requests to `Mountain`) and a gRPC **server** (for receiving requests and
      notifications from `Mountain`).
    - **Request/Response:** It provides an `Effect`-based `SendRequest` method
      that handles request IDs, timeouts, and response correlation
      automatically.
    - **Notifications:** It provides a fire-and-forget `SendNotification`
      method.
    - **RPC Dispatching:** The server component listens for incoming RPC calls
      from `Mountain` (e.g., `$getChildren` for a tree view) and uses its
      internal `RpcDispatcher` to route the call to the correct service shim
      that has registered a handler.

### End-to-End Workflow Example: `vscode.workspace.fs.readFile`

1.  **Extension Call:** An extension calls
    `await vscode.workspace.fs.readFile(myUri)`.
2.  **API Factory:** The call is routed by the `vscode` object (from
    `ApiFactory`) to the `FileSystemProvider` service shim.
3.  **Service Shim (`Service/FileSystem.ts`):** The `readFile` method on the
    `FileSystemProvider` is called. It doesn't perform the I/O itself. Instead,
    it creates an `Effect`.
4.  **Effect Creation:** The `Effect` describes the operation: "send a
    `$readFile` gRPC request to `Mountain` with the serialized URI DTO". This
    `Effect` uses the `IpcProvider`.
5.  **IPC Execution:** The `Effect` is executed. The `IpcProvider`'s
    `SendRequest` method is called. It serializes the arguments, makes the gRPC
    call, and returns a `Promise` that will resolve with the response.
6.  **`Mountain` Processing:** `Mountain` receives the request, reads the file
    from disk using its native `FsReader` implementation, and sends the file
    content (`Uint8Array`) back as the gRPC response.
7.  **Unwinding in `Cocoon`:**
    - The `IpcProvider`'s `Promise` resolves with the file content.
    - The `FileSystemProvider`'s `Effect` succeeds, yielding the `Uint8Array`.
    - The `Promise` returned to the extension's original `await` call resolves,
      delivering the file content.
