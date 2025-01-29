# Implement promise

A JavaScript Promise implementation with two variants.

## Variants

### 1. SimplePromise

A basic Promise implementation for learning purposes that includes:

- `then()` (supports chaining and promise returns)
- `catch()`
- `resolve()`
- `reject()`

To run tests:

```bash
pnpm run test:simplePromise
```

### 2. MyPromise

A Promises/A+ compliant implementation that includes:

- `then()` (supports chaining, promise returns, and circular promises)
- `catch()`
- `finally()`
- Static Methods:
  - `all()`
  - `race()`
  - `resolve()`
  - `reject()`

To run tests:

```bash
pnpm run test
```
