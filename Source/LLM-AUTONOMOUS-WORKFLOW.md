# LLM Autonomous Workflow Specification for Cocoon

## Overview

This document specifies the autonomous development workflow for Cocoon, following Wind's successful pattern of .md-driven development. The LLM can now continue development with minimal guidance.

## Self-Orientation System

### Required Reading (Start of Each Session)

1. **`IMPLEMENTATION-SUMMARY.md`** - Current state and roadmap
2. **`MISSING-IMPLEMENTATIONS.md`** - Gaps and priorities
3. **This workflow document** - Development methodology

### VSCode Source Analysis Protocol

**Before implementing any service:**
1. Read the corresponding VSCode source file
2. Understand the implementation patterns
3. Document compatibility requirements
4. Create implementation plan

**Key VSCode Files to Analyze:**
- `src/vs/workbench/api/common/extHostExtensionService.ts` - Main extension host
- `src/vs/workbench/api/common/extHost.api.impl.ts` - API factory
- `src/vs/workbench/api/common/extHostRequireInterceptor.ts` - Module interception
- `src/vs/workbench/api/common/extHostCommands.ts` - Commands service
- `src/vs/workbench/api/common/extHostDocuments.ts` - Documents service

## Development Workflow

### Step 1: Analysis Phase

**Before writing any code:**
```typescript
// Example analysis workflow
1. Read VSCode source file
2. Identify key patterns and interfaces
3. Document implementation requirements
4. Create compatibility checklist
```

**Output:** Analysis document with:
- VSCode patterns identified
- Implementation requirements
- Compatibility checklist
- Test scenarios

### Step 2: Implementation Phase

**Following Wind's patterns:**
```typescript
// Example implementation structure
1. Create service interface matching VSCode
2. Implement Effect-TS service
3. Create service mapping
4. Add error handling
5. Write comprehensive tests
```

**Key Patterns to Follow:**
- Use Effect-TS for type safety
- Maintain VSCode API compatibility
- Implement proper error handling
- Add comprehensive logging

### Step 3: Integration Phase

**Testing with Mountain:**
```typescript
// Example integration workflow
1. Test gRPC communication
2. Validate service interactions
3. Test error recovery
4. Performance benchmarking
```

## File Structure Convention

### Source Organization
```
Source/
├── IMPLEMENTATION-SUMMARY.md          # Main roadmap
├── MISSING-IMPLEMENTATIONS.md         # Gap tracking
├── LLM-AUTONOMOUS-WORKFLOW.md         # This document
├── Bootstrap/                         # Bootstrap system
│   ├── Documentation/                 # Analysis documents
│   └── Implementation/                # Implementation files
├── Services/                          # VS Code service implementations
│   ├── ExtensionHost/                 # Main extension host
│   ├── Commands/                      # Commands service
│   ├── Documents/                     # Documents service
│   └── ...                            # Other services
└── IPC/                               # Communication layer
    ├── gRPC/                         # gRPC client
    └── Protocol/                     # Message protocol
```

### Documentation Convention

**Each service should have:**
- `ANALYSIS.md` - VSCode source analysis
- `IMPLEMENTATION-PLAN.md` - Implementation roadmap
- `COMPATIBILITY-CHECKLIST.md` - VSCode compatibility
- `TESTING-STRATEGY.md` - Testing approach

## Implementation Priority Order

### Critical Path (Must Follow This Order)

1. **VSCode Source Analysis**
   - Analyze extension host patterns
   - Understand service initialization
   - Document error handling strategies

2. **Service Mapping Registry**
   - Create service descriptor system
   - Implement dependency resolution
   - Create layer composition

3. **Core Extension Host**
   - Extension lifecycle management
   - Module interception
   - Error handling and recovery

4. **IPC Communication Layer**
   - gRPC client implementation
   - Message protocol
   - Connection management

5. **Core VS Code Services** (In order of dependency)
   - Commands service
   - Documents service
   - Window service
   - Workspace service
   - Debug service
   - Terminal service

## Error Handling Strategy

### Graceful Degradation
- Services should fail gracefully
- Implement fallback mechanisms
- Provide meaningful error messages

### Recovery Mechanisms
- Implement service restart capabilities
- Add configuration recovery
- Implement data backup/restore

### Monitoring and Logging
- Comprehensive error logging
- Performance monitoring
- User feedback collection

## Testing Strategy

### Unit Testing Requirements
- Each service must have comprehensive tests
- Test service adapters and mappings
- Test error conditions and edge cases

### Integration Testing
- Test service interactions
- Test extension loading workflow
- Test Mountain integration

### Performance Testing
- Benchmark against VS Code
- Test extension loading time
- Test API call latency

## Success Metrics

### Technical Metrics
- Extension loading success rate: >95%
- API call latency: <100ms
- Memory usage: Comparable to VS Code
- Startup time: <3 seconds

### Compatibility Metrics
- VS Code API coverage: 95%+
- Extension compatibility: 95%+
- Error handling: Robust and graceful

## Autonomous Development Capabilities

### The LLM Can Now:
- Read and understand VSCode source files
- Follow implementation patterns precisely
- Track progress through documentation
- Prioritize implementations based on dependencies
- Test implementations against requirements

### Required Human Guidance:
- Complex architectural decisions
- Performance optimization strategies
- Advanced error handling scenarios
- Integration with other Land components

## Session Workflow Template

### Start of Session
```markdown
1. Read IMPLEMENTATION-SUMMARY.md for current state
2. Check MISSING-IMPLEMENTATIONS.md for next priority
3. Read relevant VSCode source files
4. Create analysis document if needed
```

### Implementation Session
```markdown
1. Implement the highest priority item
2. Follow VSCode patterns precisely
3. Add comprehensive tests
4. Update documentation
5. Leave TODOs for next session
```

### End of Session
```markdown
1. Update IMPLEMENTATION-SUMMARY.md with progress
2. Update MISSING-IMPLEMENTATIONS.md with completed items
3. Document any blockers or questions
4. Plan next session priorities
```

## Communication Protocol

### Progress Tracking
- Update documentation after each session
- Track completed implementations
- Document blockers and solutions

### Blocker Resolution
- Document blockers in implementation documents
- Provide context and attempted solutions
- Request specific guidance if needed

### Decision Documentation
- Document architectural decisions
- Record alternative approaches considered
- Justify implementation choices

## Next Session Focus

### Immediate Priority
**Analyze VSCode Extension Host Source**
- Read `src/vs/workbench/api/common/extHostExtensionService.ts`
- Document implementation patterns
- Create compatibility checklist

### Expected Output
1. **ANALYSIS.md** - VSCode source analysis
2. **IMPLEMENTATION-PLAN.md** - Service implementation roadmap
3. **COMPATIBILITY-CHECKLIST.md** - VSCode compatibility requirements

### Success Criteria
- Complete understanding of VSCode extension host patterns
- Clear implementation roadmap
- Documented compatibility requirements

## Conclusion

This autonomous workflow enables efficient continuation of Cocoon development with minimal guidance. The foundation is solid, and the LLM can now proceed with implementing Cocoon following Wind's successful patterns.

**Next Session**: Begin VSCode source analysis for the extension host service.
