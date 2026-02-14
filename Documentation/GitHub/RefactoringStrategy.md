# Cocoon Source Refactoring Strategy
## Advanced Batch File Separation & Standardization

**Date**: 2025-01-28  
**Status**: Planning Phase  
**Scope**: Element/Cocoon/Source directory

---

## Executive Summary

This document outlines a comprehensive refactoring strategy for the `Element/Cocoon/Source` directory to achieve:

- **1 file, 1 export** with nameless `export default`
- **Standardized Naming Convention**: PascalCase, single-word, action-oriented, present tense, singular
- **Deduplication** using most complete implementations
- **Comprehensive Documentation** with JSDoc/TypeDoc and @module tags
- **VSCode Integration** validated against Dependency/Microsoft/Dependency/Editor/src
- **Effect-TS Best Practices** referenced from Documentation/Module/effect

---

## Refactoring Principles

### 1. File Structure Standards

#### Principle: Single Responsibility per File
- Each file contains exactly **one export**
- Export should be **nameless**: `export default Implementation`
- Prefer **function exports**: `export default (Args) => { ... }`
- For complex implementations: `export default class Implementation { ... }`

#### Naming Convention Rules
- **PascalCase**: First letter of each word capitalized
- **Single-word**: No underscores or hyphens (use PascalCase instead)
- **Action-oriented**: Name what it *does*, not what it *is*
- **Present tense**: Current action (e.g., `Activate` not `Activated`)
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
├── Effect/ (Effect-TS services) ✅ Already follows patterns
├── Generated/
├── IPC/
├── Integration/
├── Interfaces/
├── NodeModuleShim/
├── PatchProcess/
├── Platform/
├── Scripts/
├── Services/ (OLD-STYLE services) - NEED MAJOR REFACTOR
├── TypeConverter/
├── Utility/
└── WebviewPanel/
```

---

## Refactoring Strategy by Category

### Category A: Effect/ Services ✅ ALREADY GOOD

These services already follow the established patterns well. Just need refinement.

**Files:** `Effect/*.ts`

| Current File | Lines | Status | Action |
|-------------|-------|--------|--------|
| `Effect/Bootstrap.ts` | 370 | ✅ Good | Refine documentation |
| `Effect/Extension.ts` | ~300 | ✅ Good | Refine documentation |
| `Effect/Health.ts` | 320 | ✅ Good | Refine documentation |
| `Effect/ModuleInterceptor.ts` | ~250 | ✅ Good | Refine documentation |
| `Effect/MountainClient.ts` | 528 | ✅ Good | Refine documentation |
| `Effect/RPCServer.ts` | ~400 | ✅ Good | Refine documentation |
| `Effect/Telemetry.ts` | 405 | ✅ Good | Refine documentation |
| `Effect/index.ts` | 113 | ✅ Good | Keep as barrel |

**Action Items:**
1. Ensure each service exports nameless default where appropriate
2. Add comprehensive @module documentation with links
3. Verify Effect-TS patterns match documentation
4. Cross-reference with VSCode extHost patterns

---

### Category B: Services/ (OLD-STYLE) - HIGH PRIORITY SPLIT

**Current Files:** `Services/*.ts`

| Current File | Lines | Status | Action | Split Strategy |
|-------------|-------|--------|--------|----------------|
| `Services/APIFactory.ts` | 1394 | ⚠️ Too Large | Split | 8 separate files |
| `Services/Command.ts` | 534 | ⚠️ Too Large | Split | 5 separate files |
| `Services/Configuration.ts` | 637 | ⚠️ Too Large | Split | 4 separate files |
| `Services/Extension.ts` | ~300 | ⚠️ Mixed | Refine | Move to Extension/ dir |
| `Services/ExtensionHostService.ts` | 192 | ⚠️ Mixed | Split/Move | Extension/Activate.ts |
| `Services/Window.ts` | 1498 | ⚠️ Massive | Split | 10 separate files |
| `Services/Workspace.ts` | 720 | ⚠️ Large | Split | 6 separate files |
| `Services/ExtensionContext.ts` | ~100 | ✅ OK | Move | Extension/Context.ts |
| `Services/Logger.ts` | ~200 | ✅ OK | Move | Utility/Logger.ts |
| `Services/Health.ts` | ~150 | ✅ Dup | Remove | Use Effect/Health.ts |

---

### Priority Split Targets

#### 1. `Services/APIFactory.ts` → Split Into:

```
CreateAPI.ts - Main factory function
InjectCommand.ts - Command API injection
InjectWindow.ts - Window API injection
InjectWorkspace.ts - Workspace API injection
InjectExtensions.ts - Extension API injection
InjectLanguages.ts - Language API injection
InjectDebug.ts - Debug API injection
ValidateAPI.ts - API validation logic
```

#### 2. `Services/Window.ts` → Split Into:

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

#### 3. `Services/Command.ts` → Split Into:

```
Command/Register.ts - Command registration
Command/Execute.ts - Command execution
Command/Get.ts - Get command by ID
Command/Unregister.ts - Command unregistration
Command/Validate.ts - Command validation
```

#### 4. `Services/Workspace.ts` → Split Into:

```
Workspace/GetConfiguration.ts - Configuration access
Workspace/OpenTextDocument.ts - Document operations
Workspace/ApplyEdit.ts - Workspace edits
Workspace/FindFiles.ts - File search
Workspace/FindTextInFiles.ts - Text search
Workspace/SaveAll.ts - Save operations
Workspace/State.ts - Workspace state
```

#### 5. `Services/Configuration.ts` → Split Into:

```
Configuration/Get.ts - Get configuration values
Configuration/Update.ts - Update configuration
Configuration/Scope.ts - Configuration scope management
Configuration/Events.ts - Configuration change events
```

---

### Category C: Interfaces/ - NEED STANDARDIZATION

**Current Files:** `Interfaces/*.ts`

| Current File | Status | Action | Notes |
|-------------|--------|--------|-------|
| `Interfaces/I*.ts` | Keep I prefix | Standardize | Keep TypeScript convention |
| All interface files | ✅ OK | Add{