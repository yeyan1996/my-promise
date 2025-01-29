# Implement promise

A JavaScript Promise implementation with two variants.

![](https://s2.loli.net/2025/01/29/K58E6x9JvHGIOnk.png)

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
