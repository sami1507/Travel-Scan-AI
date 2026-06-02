# Deprecation Warnings

## url.parse() - DEP0169

**Status**: Non-blocking, from dependency (not our code)

**Warning**:
```
(node:4) [DEP0169] DeprecationWarning: url.parse()
```

**Investigation**:
- Searched all source files (`src/`, `scripts/`) - no usage of `url.parse()` found
- This warning originates from a third-party dependency
- Does not affect application functionality

**To trace source**:
```bash
# Windows PowerShell
$env:NODE_OPTIONS="--trace-deprecation"; npm run build

# Or run build with trace
node --trace-deprecation ./node_modules/.bin/next build
```

**Action**: 
- Monitor for dependency updates that resolve this
- No immediate action required - warning is non-blocking
- Our code uses modern `new URL()` constructor where needed

**Last checked**: 2026-06-02
