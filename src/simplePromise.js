// three status: pending, fulfilled, rejected
// status rotation:
// resolve() -> fulfilled or rejected
// reject() -> rejected

const FULFILLED = 'fulfilled'
const REJECTED = 'rejected'
const PENDING = 'pending'

const isFunction = value => Object.prototype.toString.call(value) === '[object Function]'
const isThenable = value => value instanceof SimplePromise || (isFunction(value?.then))

function resolvePromise(value, resolvePreviousPromise, rejectPreviousPromise) {
  // if the return value of onFulfilled is a promise, resolve the promise
  if (isThenable(value)) {
    value.then(resolvePreviousPromise, rejectPreviousPromise)
  }
  else {
    resolvePreviousPromise(value)
  }
}

function queueMicrotask(callback) {
  return globalThis.queueMicrotask(callback)
}

class SimplePromise {
  fulfillCallbacks = []
  rejectCallbacks = []
  #__status__ = PENDING
  #__value__ = undefined
  #__err__ = undefined

  constructor(callback) {
    const resolve = (value) => {
      if (this.#__status__ !== PENDING) {
        return
      }
      this.#__status__ = FULFILLED
      this.#__value__ = value
      // push all the callbacks into microtask queue when invoking resolve function
      this.fulfillCallbacks.forEach((callback) => {
        queueMicrotask(callback)
      })
    }
    const reject = (err) => {
      if (this.#__status__ !== PENDING) {
        return
      }
      this.#__status__ = REJECTED
      this.#__err__ = err
      this.rejectCallbacks.forEach((callback) => {
        queueMicrotask(callback)
      })
    }
    // call the callback function immediately
    callback?.(resolve, reject)
  }

  then = (onFulfilled, onRejected) => {
    return new SimplePromise((resolve, reject) => {
      const callback = () => {
        try {
          // both fulfilled and rejected status will resolve the promise
          if (this.#__status__ === FULFILLED) {
            const value = onFulfilled?.(this.#__value__)
            resolvePromise(value, resolve, reject)
          }
          else if (this.#__status__ === REJECTED) {
            const value = onRejected?.(this.#__err__)
            resolvePromise(value, resolve, reject)
          }
        }
        catch (e) {
          // reject promise if error occurs
          reject(e)
        }
      }

      // push into microtask queue if promise is already resolved
      if ([FULFILLED, REJECTED].includes(this.#__status__)) {
        queueMicrotask(callback)
      }
      else if (this.#__status__ === PENDING) {
        // register callback for later execution
        this.fulfillCallbacks.push(callback)
        this.rejectCallbacks.push(callback)
      }
    })
  }

  // catch only receives one parameter (while `then` function receives two)
  catch = (onRejected) => {
    return this.then(null, onRejected)
  }

  static resolve(value) {
    // If promise object, synchronously expand and return directly
    if (value instanceof SimplePromise) {
      return value
    }
    return new SimplePromise(resolve => resolve(value))
  }

  static reject(err) {
    // create a rejected promise
    return new SimplePromise((_, reject) => reject(err))
  }
}

module.exports = SimplePromise
