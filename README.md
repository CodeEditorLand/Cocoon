# Cocoon 🦋 — The Node.js Extension Sidecar for Land 🏞️

Welcome to **Cocoon**, a core component of the **Land Code Editor**. Cocoon is a
specialized Node.js sidecar process designed to host and run existing Visual
Studio Code extensions. It achieves this by providing a shimmed environment that
replicates the VS Code Extension Host API, allowing Land to leverage the vast
and mature VS Code extension ecosystem.

Cocoon's primary goal within the **MVP Path A** of Land is to enable high
compatibility with Node.js-based VS Code extensions. It communicates with the
main Rust-based Land backend (`Mountain`) via the `Vine` IPC protocol,
translating extension API calls into actions that `Mountain` can perform or
requests for UI updates in `Sky`.

## Key Responsibilities & Functionality

Cocoon is responsible for creating and managing the entire lifecycle of a VS
Code-compatible Node.js extension host environment. This includes:

1.  **VS Code Platform Emulation:** Loading and utilizing pre-bundled JavaScript
    code from VS Code's own platform to run the real `ExtHostExtensionService`.
2.  **API Shimming:** Intercepting `vscode.*` API calls made by extensions.
    These calls are then:
    - Handled locally within Cocoon if possible.
    - Proxied to `Mountain` via `Vine` IPC (using JSON over stdio) for
      operations requiring native access (like filesystem operations via
      `River`/`Sun`) or UI interactions in `Sky`.
3.  **Module Interception:** Managing how extensions `require()` modules,
    especially the `vscode` API itself and certain Node.js built-ins. This
    ensures extensions receive the Cocoon-provided (shimmed) API surface.
4.  **IPC Communication:** Implementing the Cocoon-side of the `Vine` IPC
    protocol for robust, structured communication with `Mountain`. This includes
    handling requests, responses, notifications, and errors.
5.  **Service Orchestration:** Setting up a Dependency Injection (DI) container
    with numerous shims that implement VS Code's internal `IExtHost...` service
    interfaces. This provides the necessary environment for the real
    `ExtHostExtensionService` to operate.
6.  **Extension Lifecycle Management:** Relies on the `ExtHostExtensionService`
    to load, activate, and deactivate extensions based on initialization data
    received from `Mountain`.
7.  **Error Handling & Reporting:** Capturing errors from extensions and
    reporting them back to `Mountain`.

**What this means for the Land Project:** Cocoon is the key enabler for running
the majority of existing VS Code extensions (those written for the Node.js
runtime) directly within the Land editor, providing a rich feature set from day
one of the MVP.

---

## Cocoon Architecture 🦋

Cocoon operates as a standalone Node.js process, carefully orchestrated by
`Mountain`.

| Component within Cocoon       | Role & Key Responsibilities                                                                                                                                                                                                                                                      |
| :---------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`Node.js Process`**         | The runtime environment for Cocoon.                                                                                                                                                                                                                                              |
| **`index.ts` (Bootstrap)**    | The main entry point for Cocoon. Initializes the environment, sets up IPC with `Mountain`, configures Dependency Injection (DI), patches Node.js globals (e.g., `process.exit`), and starts the `ExtHostExtensionService`.                                                       |
| **`cocoon-ipc.ts`**           | Implements the JavaScript/TypeScript side of the `Vine` IPC protocol. Handles sending and receiving newline-delimited JSON messages over stdio to/from `Mountain`. Provides an adapter for VS Code's `RPCProtocol`.                                                              |
| **`shims/*.ts`**              | A collection of TypeScript modules, each shimming a specific VS Code `ExtHost*` service or `vscode.*` API namespace (e.g., `workspace-shim.ts`, `commands-shim.ts`). They form the bridge between the extension API calls and `Mountain` via `Vine` IPC or handle calls locally. |
| **`_baseShim.ts`**            | A foundational base class providing common utilities for all shims, including logging, RPC proxy creation, argument marshalling/revival for IPC, and event helpers.                                                                                                              |
| **Bundled VSCode JS**         | JavaScript code from VS Code's platform (e.g., `base`, `platform`, `editor`, `workbench/api/common`, `workbench/api/node`) that is bundled by the `Rest` element at build time. This includes the real `ExtHostExtensionService` and other core components that Cocoon runs.     |
| **`ExtHostExtensionService`** | The _actual_ VS Code service (from the bundled JS) responsible for loading, activating, and managing extensions. Cocoon provides its dependencies via the DI system populated with shims.                                                                                        |
| **`vscode.ts` (API Stub)**    | The module that extensions `require('vscode')` as. It's initially a stub but is populated by an API factory (created by `extHost.api.impl.ts` from bundled VSCode JS) with methods and properties backed by Cocoon's shims and the real `ExtHost` services.                      |
| **Extension Code**            | The JavaScript/TypeScript code of the VS Code extensions being run within Cocoon.                                                                                                                                                                                                |

**Interaction Flow (Simplified for an API call from an extension):**

1.  `Mountain` launches `Cocoon` and sends initialization data via `Vine`.
2.  `Cocoon`'s `index.ts` bootstraps, sets up DI, loads bundled VS Code JS, and
    starts `ExtHostExtensionService`.
3.  An extension activated in `Cocoon` calls, e.g.,
    `vscode.workspace.fs.readFile(uri)`.
4.  The call hits the `vscode` API object provided to the extension.
5.  This is routed to `workspace-shim.ts` (which provides `vscode.workspace`)
    and then to `fs-api-shim.ts` (which provides `workspace.fs`).
6.  `fs-api-shim.ts` (a `Shim`) uses `cocoon-ipc.ts` to send a `Vine` message
    (e.g., `workspacefs_readFile`) to `Mountain`.
7.  `Mountain`'s `Track` dispatcher routes this to its native Rust file system
    handler (using `River`).
8.  `Mountain` sends the file content (or an error) back to `Cocoon` via `Vine`.
9.  `cocoon-ipc.ts` receives the response, and `fs-api-shim.ts` resolves the
    promise back to the extension.

---

## Cocoon's Shim Layer: The Bridge to VS Code Extensions

The `shims/` directory is the heart of Cocoon's compatibility layer. Each shim
targets a specific piece of the VS Code Extension Host API or internal services:

| Shim File                    | Primary `vscode.*` API or Internal Service Emulated                                                                                                                     |
| :--------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `_baseShim.ts`               | Provides common utilities (logging, RPC, marshalling) for other shims.                                                                                                  |
| `api-deprecation-shim.ts`    | `IExtHostApiDeprecationService` (handles warnings for deprecated API usage).                                                                                            |
| `commands-shim.ts`           | `vscode.commands`, `IExtHostCommands` (registers/executes commands, RPC with `MainThreadCommands`).                                                                     |
| `configuration-shim.ts`      | `vscode.workspace.getConfiguration`, `IExtHostConfiguration` (proxies to `MainThreadConfiguration`).                                                                    |
| `diagnostics-shim.ts`        | `vscode.languages.createDiagnosticCollection`, `IExtHostDiagnostics` (proxies to `MainThreadDiagnostics`).                                                              |
| `document-shim.ts`           | `vscode.workspace.textDocuments`, `vscode.TextDocument` API, `IExtHostDocuments` (manages document state, RPC with `MainThreadDocuments`).                              |
| `enablement-service-shim.ts` | `IWorkbenchExtensionEnablementService` (extension enabled/disabled state, RPC with `MainThreadExtensionEnablementService`).                                             |
| `extension-service-shim.ts`  | _(Simulated `IExtHostExtensionService`)_ Primarily for reference or "Path B" exploration. Path A uses the real `ExtHostExtensionService`.                               |
| `file-system-info-shim.ts`   | `IExtHostFileSystemInfo` (provides filesystem capabilities like case sensitivity).                                                                                      |
| `fs-api-shim.ts`             | `vscode.workspace.fs` (`vscode.FileSystem` API, direct IPC to Mountain's `workspacefs_*` handlers).                                                                     |
| `host-kind-picker-shim.ts`   | `IExtensionHostKindPicker` (determines if an extension can run in Cocoon).                                                                                              |
| `host-utils-shim.ts`         | `IHostUtils` (provides process ID, controlled exit, basic fs checks via other shims).                                                                                   |
| `language-features-shim.ts`  | Backend for `vscode.languages.register*Provider` calls. Implements `ExtHostLanguageFeaturesShape` for RPC calls from `MainThreadLanguageFeatures` (executes providers). |
| `language-models-shim.ts`    | `vscode.lm` (Language Models API), `IExtHostLanguageModels`. Proxies to `MainThreadLanguageModels`.                                                                     |
| `language-shim.ts`           | `vscode.languages` API surface (delegates provider registration to `language-features-shim.ts`).                                                                        |
| `localization-shim.ts`       | `IExtHostLocalizationService` (basic stub for NLS, as full localization is complex).                                                                                    |
| `log-shim.ts`                | `ILogService`, `ILoggerService` (provides console-based logging for Cocoon and extensions).                                                                             |
| `managed-sockets-shim.ts`    | `IExtHostManagedSockets` (basic stub, as full managed sockets are complex).                                                                                             |
| `output-channel-shim.ts`     | `vscode.window.createOutputChannel`, `IExtHostOutputService` (proxies to `MainThreadOutputService`).                                                                    |
| `proposed-api-shim.ts`       | Handles proposed API enablement checks based on `initData`.                                                                                                             |
| `secret-state-shim.ts`       | `vscode.SecretStorage` (`ExtensionContext.secrets`), `IExtHostSecretState` (direct IPC to Mountain's `secrets_*` handlers).                                             |
| `storage-paths-shim.ts`      | `IExtensionStoragePaths` (provides `ExtensionContext.storageUri`, `globalStorageUri` from `initData`).                                                                  |
| `storage-shim.ts`            | `vscode.Memento` (`ExtensionContext.workspaceState/globalState`), `IExtHostStorage` (RPC to `MainThreadStorage`).                                                       |
| `telemetry-shim.ts`          | `IExtHostTelemetry` (basic stub or console logging for telemetry events).                                                                                               |
| `terminal-service-shim.ts`   | `vscode.window.createTerminal` (and related APIs), `IExtHostTerminalService`. Proxies terminal actions via RPC, environment variables via direct IPC.                   |
| `ui-shim.ts`                 | Parts of `vscode.window` (e.g., `showInformationMessage` via direct IPC `ui_showMessage`) and `vscode.env` properties (from `initData`).                                |
| `uri-transformer-shim.ts`    | `IURITransformerService` (NO-OP for local MVP, essential for remote scenarios).                                                                                         |
| **Node.js Built-in Shims:**  |                                                                                                                                                                         |
| `crypto-shim.ts`             | `require('crypto')` (delegates to native Node.js crypto for safe operations).                                                                                           |
| `fs-shim.ts`                 | `require('fs').promises` (proxies to Mountain's `fs_*` handlers via direct IPC).                                                                                        |
| `os-shim.ts`                 | `require('os')` (delegates some, proxies `hostname`).                                                                                                                   |
| `process-shim.ts`            | `require('process')` (provides controlled access to `process` properties/methods).                                                                                      |
| `*-module-shim-factory.ts`   | Factories for `NodeRequireInterceptor` to provide the above shims for `require()`.                                                                                      |

This comprehensive shimming strategy is what allows Cocoon to provide a
high-fidelity VS Code extension environment.

---

## Getting Started with Cocoon Development

Cocoon is developed as part of the main Land project. To work on or run Cocoon:

1.  **Clone the Land Repository (if not already done):** Ensure you clone with
    submodules, as Cocoon relies on VS Code source code bundled by `Rest`.

    ```sh
    git clone ssh://git@github.com/CodeEditorLand/Land.git --recurse-submodules
    cd Land
    ```

2.  **Install Dependencies:** This installs dependencies for Land, including
    those needed to build and run Cocoon.

    ```sh
    pnpm install
    ```

3.  **Build Cocoon:** The `Bundle=true` flag is essential for Cocoon.

    ```sh
    # For development
    pnpm cross-env Browser=true Bundle=true Clean=true Dependency=Microsoft/VSCode NODE_ENV=development NODE_OPTIONS=--max-old-space-size=16384 pnpm prepublishOnly
    
    # For a release build
    pnpm cross-env Browser=true Bundle=true Clean=true Dependency=Microsoft/VSCode NODE_ENV=production NODE_OPTIONS=--max-old-space-size=16384 pnpm prepublishOnly --release
    ```

**Debugging Cocoon:**

- Since Cocoon is a Node.js process, you can attach a Node.js debugger to it.
  `Mountain` would need to launch Cocoon with the appropriate debug flags (e.g.,
  `--inspect-brk`).
- Logs from Cocoon (including `console.log` statements in the shims and
  `index.ts`) will typically appear in the console output of the `Mountain`
  process or in a dedicated log file if configured.

---

## Contribution & Future Development

Cocoon is critical for achieving initial extension compatibility in Land. Future
work on Cocoon may involve:

- **Increasing API Coverage:** Implementing more shims or expanding existing
  ones to support a wider range of VS Code extensions.
- **ESM Extension Support:** Implementing robust interception for ESM
  `import 'vscode'` statements, similar to VS Code's `NodeModuleESMInterceptor`.
- **Performance Optimization:** Analyzing and optimizing IPC communication and
  shim performance.
- **Stability & Error Handling:** Enhancing the robustness of shims and error
  reporting to `Mountain`.
- **Security Considerations:** Continuously evaluating the security implications
  of running Node.js extensions and refining the sandboxing provided by the
  shims and IPC.

We welcome contributions! Please refer to the main Land project's contribution
guidelines.

---

## Changelog 📜

Stay updated with our progress! See [`CHANGELOG.md`](CHANGELOG.md) for a history
of changes.

## Funding & Acknowledgements 🙏

Land is proud to be an open-source endeavor. Our journey is significantly
supported by:

This project is funded through
[NGI0 Commons Fund](https://nlnet.nl/commonsfund), a fund established by
[NLnet](https://nlnet.nl) with financial support from the European Commission's
[Next Generation Internet](https://ngi.eu) program. Learn more at the
[NLnet project page](https://nlnet.nl/project/Land).

| Land                                                                                                                                                | PlayForm                                                                                                                                                 | NLnet                                                                                      | NGI0 Commons Fund                                                                                                                                 |
| :-------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| [<img src="https://raw.githubusercontent.com/CodeEditorLand/Asset/refs/heads/Current/Logo/Land.svg" height="80px" alt="Land">](https://editor.land) | [<img src="https://raw.githubusercontent.com/PlayForm/Asset/refs/heads/Current/Logo/PlayForm.svg" height="80px" alt="PlayForm">](https://playform.cloud) | [<img width="240px" src="https://nlnet.nl/logo/banner.svg" alt="NLnet">](https://nlnet.nl) | [<img width="240px" src="https://nlnet.nl/image/logos/NGI0CommonsFund_tag_black_mono.svg" alt="NGI0 Commons Fund">](https://nlnet.nl/commonsfund) |
