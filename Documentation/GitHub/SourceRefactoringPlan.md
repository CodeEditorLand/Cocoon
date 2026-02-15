# Cocoon Source Refactoring Plan

## Advanced Batch File Separation & Standardization

### Executive Summary

This document outlines a comprehensive refactoring strategy for the
`Element/Cocoon/Source` directory to achieve:

- **1 file, 1 export** with nameless `export default`
- **Standardized Naming Convention**: PascalCase, single-word, action-oriented,
  present tense, singular
- **Deduplication** using most complete implementations
- **Comprehensive Documentation** with JSDoc/TypeDoc and @module tags
- **VSCode Integration** validated against
  Dependency/Microsoft/Dependency/Editor/src
- **Effect-TS Best Practices** referenced from Documentation/Module/effect

---

## Refactoring Principles

### 1. File Structure Standards

#### Principle: Single Responsibility per File

- Each file contains exactly **one export**
- Export should be **nameless**: `export default SomeImplementation`
- Prefer **function exports**: `export default () => { ... }`
- For complex implementations: `export default class SomeClass { ... }`

#### Naming Convention Rules

- **PascalCase**: First letter of each word capitalized
- **Single-word**: No underscores or hyphens (use PascalCase instead)
- **Action-oriented**: Name what it _does_, not what it _is_
- **Present tense**: Current action (e.g., `Load` not `Loaded`)
- **Singular form**: One entity (e.g., `Extension` not `Extensions`)

**Examples:**

```
❌ Bad: extension_host_service.ts
❌ Bad: loadExtensions.ts
✅ Good: Extension.ts
✅ Good: Activate.ts
✅ Good: RegisterCommand.ts
```

---

## Current Structure Analysis

### Directory: `Element/Cocoon/Source`

```
Source/
├── ServiceMapping.ts (220 lines) - ORCHESTRATOR - Multiple exports
├── Run.sh (Build script)
├── prepublishOnly.sh (Build script)
├── ApplicationConfiguration/
├── Bootstrap/
├── Cancellation/
├── Clipboard/
├── Configuration/
├── Debug/
├── Dialog/
├── Effect/ (Effect-TS services)
├── Generated/
├── IPC/
├── Integration/
├── Interfaces/
├── NodeModuleShim/
├── PatchProcess/
├── Platform/
├── Scripts/
├── Services/ (OLD-STYLE services)
├── TypeConverter/
├── Utility/
├── WebviewPanel/
```

---

## Refactoring Strategy by Category

### Category A: Effect-TS Services (HIGH PRIORITY)

**Current Files:** `Effect/*.ts`

| Current File                  | Status      | Action | New Name Pattern              | Notes                    |
| ----------------------------- | ----------- | ------ | ----------------------------- | ------------------------ |
| `Effect/Bootstrap.ts`         | ✅ Good     | Refine | `Effect/Bootstrap.ts`         | Already follows patterns |
| `Effect/Extension.ts`         | ✅ Good     | Refine | `Effect/Extension.ts`         | Already follows patterns |
| `Effect/Health.ts`            | ✅ Good     | Refine | `Effect/Health.ts`            | Already follows patterns |
| `Effect/ModuleInterceptor.ts` | ✅ Good     | Refine | `Effect/ModuleInterceptor.ts` | Already follows patterns |
| `Effect/MountainClient.ts`    | ✅ Good     | Refine | `Effect/MountainClient.ts`    | Already follows patterns |
| `Effect/RPCServer.ts`         | ✅ Good     | Refine | `Effect/RPCServer.ts`         | Already follows patterns |
| `Effect/Telemetry.ts`         | ✅ Good     | Refine | `Effect/Telemetry.ts`         | Already follows patterns |
| `Effect/index.ts`             | ❌ Multiple | Split  | Keep as barrel                | Export aggregator only   |

**Refactoring Actions:**

1. Ensure each service file exports nameless default
2. Add comprehensive @module documentation
3. Verify Effect-TS patterns match documentation
4. Cross-reference with VSCode extHost patterns

---

### Category B: Services (OLD-STYLE - NEED MAJOR REFACTOR)

**Current Files:** `Services/*.ts`

| Current File                       | Status     | Action | New Name Pattern        | Notes                          |
| ---------------------------------- | ---------- | ------ | ----------------------- | ------------------------------ |
| `Services/APIFactory.ts`           | ⚠️ Mixed   | Split  | Multiple files          | 1394 lines - too large         |
| `Services/Command.ts`              | ⚠️ Mixed   | Split  | Multiple files          | 534 lines - multiple concerns  |
| `Services/Configuration.ts`        | ⚠️ Mixed   | Split  | Multiple files          | 637 lines - multiple concerns  |
| `Services/Extension.ts`            | ⚠️ Mixed   | Split  | Multiple files          | Review needed                  |
| `Services/ExtensionHostService.ts` | ⚠️ Mixed   | Refine | `Extension/Activate.ts` | 192 lines                      |
| `Services/Window.ts`               | ⚠️ Massive | Split  | Multiple files          | 1498 lines - needs major split |
| `Services/Workspace.ts`            | ⚠️ Large   | Split  | Multiple files          | 720 lines - needs split        |
| `Services/ExtensionContext.ts`     | ✅ OK      | Refine | `Extension/Context.ts`  | Single concern                 |
| `Services/Logger.ts`               | ✅ OK      | Refine | `Logger.ts`             | Move to Utility/               |
| `Services/Health.ts`               | ✅ OK      | Refine | `Health.ts`             | Move to Utility/               |

#### Priority Split Targets

**`Services/APIFactory.ts` → Split Into:**

```
CreateAPI.ts - Main factory function
InjectCommand.ts - Command API injection
InjectWindow.ts - Window API injection
InjectWorkspace.ts - Workspace API injection
InjectExtensions.ts - Extension API injection
InjectLanguages.ts - Language API injection
ValidateAPI.ts - API validation logic
```

**`Services/Window.ts` → Split Into:**

```
Window/ShowMessage.ts - Information/warning/error messages
Window/ShowQuickPick.ts - Quick pick UI
Window/ShowInputBox.ts - Input box UI
Window/ShowDialog.ts - File open/save dialogs
Window/CreateStatusBar.ts - Status bar items
Window/CreateOutputChannel.ts - Output channels
Window/CreateWebview.ts - Webview panels
Window/ShowProgress.ts - Progress indicators
Window/ShowTextDocument.ts - Text document display
Window/State.ts - Window state management
```

**`Services/Command.ts` → Split Into:**

```
Command/Register.ts - Command registration
Command/Execute.ts - Command execution
Command/Get.ts - Get command by ID
Command/Unregister.ts - Command unregistration
Command/Validate.ts - Command validation
```

**`Services/Workspace.ts` → Split Into:**

```
Workspace/GetConfiguration.ts - Configuration access
Workspace/OpenTextDocument.ts - Document operations
Workspace/ApplyEdit.ts - Workspace edits
Workspace/FindFiles.ts - File search
Workspace/SaveAll.ts - Save operations
Workspace/State.ts - Workspace state
```

---

### Category C: Interfaces (NEED STANDARDIZATION)

\*\*Current
