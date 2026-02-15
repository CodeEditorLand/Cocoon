# Cocoon Source Refactoring Batch Plan

## Phase 1: Orchestration & Core Services

---

## Batch 1: ServiceMapping Split (Highest Priority)

### Target: `Element/Cocoon/Source/ServiceMapping.ts` (220 lines)

**Current Status**: Contains multiple orchestration objects in one file

**Split Strategy**:

```
Element/Cocoon/Source/Orchestration/
├── OldStyleServices.ts      - Old-style service configuration
├── EffectServices.ts        - Effect-TS service configuration
└── ServiceMapping.ts        - Backwards compatibility wrapper
```

**File 1: `Orchestration/OldStyleServices.ts`**

```typescript
/**
 * @module OldStyleServices
 * @description
 * Provides dependency injection for traditional Promise-based service architecture.
 * Legacy services that use async/await patterns instead of Effect-TS.
 *
 * @see {@link Element/Cocoon/Source/Services/} Legacy service implementations
 * @see {@link Element/Cocoon/Source/Orchestration/EffectServices.ts} Modern Effect-TS services
 *
 * @deprecated Prefer EffectServices for new
```
