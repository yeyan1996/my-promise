const PENDING = 'pending'
const RESOLVED = 'resolved'
const REJECTED = 'rejected'

const isFunction = obj => typeof obj === 'function'

//决议 promise
function resolvePromise(promise2, value, resolve, reject) {
    // 防止作为返回值的 promise 可能既调 resolve 又调用 reject 情况
    let called;
    // 如果循环引用则通过 reject 抛出错误
    if (value === promise2) {
        reject(new TypeError('Chaining cycle detected for promise'));
    }

    //如果 value 处于 pending，promise 需保持为等待状态直至 value 被执行或拒绝
    //如果 value 处于其他状态，则用相同的值处理 Promise

    //无论 value 是对象还是函数，只要有 then 方法就可以被决议
    if (value && typeof value === 'object' || typeof value === 'function') {
        // 以下情况都需要使用 try/catch 包裹起来
        // 因为可能存在 then 方法被定义了一个抛出错误的访问器的情况
        try {
            let then = value.then
            if (typeof then === 'function') {
                // 这里为了符合 a+ 规范需要使用 call 的形式绑定 this 指向
                then.call(value,
                    // 定义如何展开这个 promise
                    // 内部给 then 方法自定义了 onFulfilled/onRejected 函数，规定处理逻辑
                    // 当作为返回值的 promise 被决议后再决议这个 then 方法生成的 promise(promise2)
                    function onFulfilled(res) {
                        if (called) return;
                        called = true;
                        // 递归调用 resolvePromise 直到传入的 value 不是一个 promise 对象为止
                        // 传递 promise2 是为了通过闭包保留 promise2 防止后续的循环引用
                        resolvePromise(promise2, res, resolve, reject);
                    },
                    function onRejected(err) {
                        if (called) return;
                        called = true;
                        reject(err);
                    }
                )
            } else {
                // 是一个对象但没有 then 方法则直接决议
                resolve(value)
            }
        } catch (e) {
            // 报错情况需要让这个 promise2 状态变为 reject 并且锁定防止多次更改
            if (called) return;
            called = true;
            reject(e);
        }
    } else {
        resolve(value)
    }
}

class Promise {
    constructor(fn) {
        let resolve = (res) => {
            // resolve 方法只能在 promise 为 pending 状态才能调用一次,决议后不能改变 promise 状态
            if (this.status === PENDING) {
                this.status = RESOLVED
                this.value = res
                // 在调用 resolve 函数后遍历之前then方法放入的回调,并执行
                this.resolvedCallbacks.map(cb => cb())
            }
        }
        let reject = (err) => {
            // 调用 reject 方法时 promise 只可能是在 pending 状态
            if (this.status === PENDING) {
                this.status = REJECTED
                this.value = err
                this.rejectedCallbacks.map(cb => cb())
            }
        }
        this.status = PENDING
        this.value = undefined
        // 存储多个 then 方法时的所有回调
        // promise.then(res1=>{代码1....})
        // promise.then(res2=>{代码2....})
        // promise.then(res3=>{代码3....})
        this.resolvedCallbacks = []
        this.rejectedCallbacks = []

        try {
            fn(resolve, reject)
        } catch (e) {
            // 任何可能的报错都要执行 reject
            reject(e)
        }
    }

    then(onFulfilled, onRejected) {
        //如果 then 参数不是 function 就使用默认的函数继续向后传递 promise 链
        onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : res => res
        onRejected = typeof onRejected === 'function' ? onRejected : err => {
            throw err
        }

        //将 then/catch 的返回值包装成一个 promise，因为 then/catch 最终返回的也是一个 promise
        let promise2 = new Promise((resolve, reject) => {
            switch (this.status) {

                case PENDING: {
                    // 如果 promise 还没有决议,则将相应的回调放入数组存储,等待resolve/reject执行后将回调放入微任务队列
                    // 这里回调必须要异步调用，规范中当一个 promise 被决议后，保存的 callbacks 数组必须异步的执行
                    // 对于 pending 状态的 promise，then 方法会同步的注册回调，但回调的执行是异步的（异步微任务）
                    // （对比其他状态的 promise then 方法作用是异步解析 promise）
                    this.resolvedCallbacks.push(
                        // 通过回调的形式来实现:当 promise 被决议时，依次执行之前注册的回调
                        () => {
                            setTimeout(() => {
                                try {
                                    let res = onFulfilled(this.value)
                                    resolvePromise(promise2, res, resolve, reject)
                                } catch (e) {
                                    reject(e)
                                }
                            })
                        })


                    this.rejectedCallbacks.push(
                        () => {
                            setTimeout(() => {
                                try {
                                    let err = onRejected(this.value)
                                    resolvePromise(promise2, err, resolve, reject)
                                } catch (e) {
                                    reject(e)
                                }
                            })
                        })


                    break;
                }

                case RESOLVED: {
                    // then 方法解析状态为 resolve/reject 的 promise 的值后,会将解析的值作为回调函数的参数将回调函数放入微任务队列中
                    // JS 引擎会通过 EventLoop 在当前宏任务完成后自动处理微任务队列中的任务
                    /**因浏览器限制这里使用 setTimeout 模拟微任务**/
                    setTimeout(() => {
                        try {
                            //首先会去执行用户定义的onFulfilled代码，将返回值赋值给res
                            let res = onFulfilled(this.value)
                            resolvePromise(promise2, res, resolve, reject)
                        } catch (e) {
                            //如果在onFulFilled/onRejected中发生了异常，用异常信息作为值，将promise2的状态变为rejected
                            reject(e)
                        }
                    })
                    break
                }

                case REJECTED: {
                    setTimeout(() => {
                        try {
                            let res = onRejected(this.value)
                            resolvePromise(promise2, res, resolve, reject)
                        } catch (e) {
                            console.log(e)
                            reject(e)
                        }
                    })
                    break
                }

            }
        })
        // then/catch 始终返回一个 promise
        return promise2
    }

    catch(onRejected) {
        return this.then(null, onRejected);
    }

    // finally 的 callback 不会接受任何参数
    // finally 的回调如果返回一个 promise，那 finally 会等待回调中的 promise 决议完成再决议自身
    // finally 返回一个 promise，并且 promise 的值是 finally 之前第一个非 finally 返回的 promise 解析后的值
    // (即 finally 会把前一个 promise 的值传递下去)
    finally(callback) {
         if (!isFunction(callback)) callback = () => {}
        return this.then(
            (res) => Promise.resolve(callback()).then(() => res),
            (err) => Promise.resolve(callback()).then(() => {
                throw err
            })
        )
    }

    static resolve(value) {
        // promise 对象则同步展开，直接返回
        if (value instanceof this) {
            return value
        }
        return new Promise((resolve, reject) => {
            // thenable 对象需要异步展开
            if (value && value.then && typeof value.then === 'function') {
                value.then(resolve, reject)
            } else {
                // 除了前2种情况，其余情况都是同步生成一个 resolved 状态的 promise 对象
                resolve(value)
            }
        })
    }

    static reject(err) {
        return new Promise((resolve, reject) => {
            reject(err)
        })
    }

    static all(iterator) {
        // all 的参数必须是一个可迭代的数据结构
        if (!iterator[Symbol.iterator]) throw new Error('argument is not iterable')
        return new Promise((resolve, reject) => {
            // 如果参数长度为0，则直接同步返回一个 resolved 状态的 promise
            if (!iterator.length) {
                resolve()
                return
            }
            let resolvedValues = []

            let onResolve = (res) => {
                resolvedValues.push(res)
                if (resolvedValues.length === iterator.length) {
                    resolve(resolvedValues)
                }
            }

            iterator.map(item => Promise.resolve(item)).forEach(promise => {
                promise.then(onResolve, reject)
            })

        })
    }

    static race(iterator) {
        if (!iterator[Symbol.iterator]) throw new Error('argument is not iterable')
        return new Promise((resolve, reject) => { // 如果参数长度为0，则返回一个永远 pending 状态的 promise
            if (!iterator.length) {
                return
            }
            iterator.map(item => Promise.resolve(item)).forEach(promise => {
                promise.then(resolve, reject)
            })
        })
    }
}


try {
    module.exports = Promise;

    // 测试代码
    Promise.defer = Promise.deferred = function () {
        let dfd = {};
        dfd.promise = new Promise((resolve, reject) => {
            dfd.resolve = resolve;
            dfd.reject = reject;
        });
        return dfd;
    }
} catch (e) {
    console.warn(e)
    console.warn('请使用node运行测试代码')
}
