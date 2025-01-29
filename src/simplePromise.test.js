const { describe, it, expect } = require('@jest/globals')
const SimplePromise = require('./simplePromise.js')

const DEFAULT_VALUE = 'default'

// simple test cases
// forked from https://github.com/WebDevSimplified/js-promise-library/blob/main/MyPromise.test.js
describe('then', () => {
  it('with no chaining', () => {
    return promise().then(v => expect(v).toEqual(DEFAULT_VALUE))
  })

  it('with multiple thens for same promise', () => {
    const checkFunc = v => expect(v).toEqual(DEFAULT_VALUE)
    const mainPromise = promise()
    const promise1 = mainPromise.then(checkFunc)
    const promise2 = mainPromise.then(checkFunc)
    return Promise.allSettled([promise1, promise2])
  })

  it('with then and catch', () => {
    const checkFunc = v => expect(v).toEqual(DEFAULT_VALUE)
    const failFunc = v => expect(1).toEqual(2)
    const resolvePromise = promise().then(checkFunc, failFunc)
    const rejectPromise = promise({ fail: true }).then(failFunc, checkFunc)
    return Promise.allSettled([resolvePromise, rejectPromise])
  })

  it('with chaining', () => {
    return promise({ value: 3 })
      .then(v => v * 4)
      .then(v => expect(v).toEqual(12))
  })
})

describe('catch', () => {
  it('with no chaining', () => {
    return promise({ fail: true }).catch(v => expect(v).toEqual(DEFAULT_VALUE))
  })

  it('with multiple catches for same promise', () => {
    const checkFunc = v => expect(v).toEqual(DEFAULT_VALUE)
    const mainPromise = promise({ fail: true })
    const promise1 = mainPromise.catch(checkFunc)
    const promise2 = mainPromise.catch(checkFunc)
    return Promise.allSettled([promise1, promise2])
  })

  it('with chaining', () => {
    return promise({ value: 3 })
      .then((v) => {
        throw v * 4
      })
      .catch(v => expect(v).toEqual(12))
  })
})

describe('static methods', () => {
  it('resolve', () => {
    return SimplePromise.resolve(DEFAULT_VALUE).then(v =>
      expect(v).toEqual(DEFAULT_VALUE),
    )
  })

  it('reject', () => {
    return SimplePromise.reject(DEFAULT_VALUE).catch(v =>
      expect(v).toEqual(DEFAULT_VALUE),
    )
  })
})

function promise({ value = DEFAULT_VALUE, fail = false } = {}) {
  return new SimplePromise((resolve, reject) => {
    fail ? reject(value) : resolve(value)
  })
}
