const PENDING = 'pending'
const RESOLVED = 'resolved'
const REJECTED = 'rejected'

//决议Promise
function resolvePromise(promise, value, resolve, reject) {
    // 如果循环引用报错
    if (value === promise) {
        // reject报错
        return reject(new TypeError('Chaining cycle detected for promise'));
    }
    // debugger
    if (resolve) {
        // 如果then方法提前返回了一个Promise则then方法最终返回的值是这个Promise
        if (value instanceof MyPromise) {
            return value
        }
        resolve(value)
    } else if (reject) {
        return reject(value)
    }
}

class MyPromise {
    constructor(fn) {
        let resolve = (resolveValue) => {
            // resolve方法只能在Promise为pending状态才能调用一次,决议后不能改变Promise状态
            if (this.status === PENDING) {
                this.status = RESOLVED
                this.value = resolveValue
                // 在调用resolve函数后遍历之前then方法放入的回调,并执行
                // 用于在延时resolve情况下作为回调执行
                this.resolvedCallbacks.map(cb => cb())
            }
        }
        let reject = (rejectReason) => {
            if (this.status === REJECTED) {
                this.status = REJECTED
                this.value = rejectReason
                this.rejectedCallbacks.map(cb => cb())
            }
        }
        this.status = PENDING
        this.value = undefined
        this.resolvedCallbacks = []
        this.rejectedCallbacks = []

        // 报错后执行reject
        try {
            fn(resolve, reject)
        } catch (e) {
            reject(e)
        }
    }

    then(onFulfilled, onRejected) {

        (typeof onFulfilled === 'function') || (onFulfilled = value => value)
        (typeof onRejected === 'function') || (onRejected = value => {throw value})

        //将then/catch的返回值包装成一个Promise
        let promise = new MyPromise((resolve, reject) => {
            switch (this.status) {
                case PENDING: {
                    if (onFulfilled) {
                        // 如果Promise还没有决议,则将回调放入数组存储
                        this.resolvedCallbacks.push(() => onFulfilled(this.value))
                    }
                    if (onRejected) {
                        this.rejectedCallbacks.push(() => onRejected(this.value))
                    }
                    break;
                }
                case RESOLVED: {
                    //如果then参数不是function就使用默认的函数继续传递Promise链

                    let res = onFulfilled(this.value)
                    //使用setTimeout(()=>{},0)模拟微任务
                    setTimeout(() => {
                        resolvePromise(promise, res, resolve, null)
                    })
                    break
                }
                case REJECTED: {
                    let res = onRejected(this.value)
                    setTimeout(() => {
                        return resolvePromise(promise, res, null, reject)
                    })
                    break
                }
            }
        })
        return promise
    }

    // catch(cb) {
    //
    // }
    // static resolve(promiseLike) {
    //     //展开一个promiseLike
    //     if (promiseLike.then) {
    //
    //     } else { //非promiseList就返回一个resolved的promise
    //         setTimeout(() => {
    //             // let promise = new MyPromise()
    //         }, 0)
    //     }
    // }
    //
    // static reject(any) {
    //     //
    // }
}


let promise = new MyPromise((resolve, reject) => {
    resolve('456')
})
//
// console.log(promise)
// debugger

promise
    .then(res => {
        return new MyPromise((resolve, reject) => {
            reject('l have been rejected')
        })
    })
    .then(
        res => console.log(res),
        res => {
            console.log('reject', res)
        }
    )
