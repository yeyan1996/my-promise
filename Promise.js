const PENDING = 'pending'
const RESOLVED = 'resolved'
const REJECTED = 'rejected'

const isComplexDataType = obj => {
    return (typeof obj === 'object' || typeof obj === 'function') && (obj !== null)
}

//决议Promise
function resolvePromise(promise2, value, resolve, reject) {
    //排除可能既调resolve又调reject情况
    // 表示是否调用过成功或者失败
    let called;
    // 如果循环引用报错,则reject
    if (value === promise2) {
        return reject(new TypeError('Chaining cycle detected for promise'));
    }

    if (!value || !isComplexDataType) {
        //value为普通值
        //将promise2状态改为resolve(外层函数会返回这个resolved状态的promise2)
        resolve(value)
        return
    }
    //value为thenable对象(会被认为是个Promise)
    //如果 value 处于等待态，Promise 需保持为等待态直至 value 被执行或拒绝
    //如果 value 处于其他状态，则用相同的值处理 Promise
    if (value.then && typeof value.then === 'function') {
        value.then(
            function onFulfilled(res) {
                if (called) return;
                called = true;
                //递归调用resolvePromise直到不是一个thenable对象随后resolve
                // res为
                resolvePromise(promise2, res, resolve, reject);
            },
            function onRejected(err) {
                if (called) return;
                called = true;
                reject(err);
            },
        )
    } else {
        resolve(value)
    }
}

class MyPromise {
    constructor(fn) {
        let resolve = (res) => {
            // resolve方法只能在Promise为pending状态才能调用一次,决议后不能改变Promise状态
            if (this.status === PENDING) {
                this.status = RESOLVED
                this.value = res
                // 在调用resolve函数后遍历之前then方法放入的回调,并执行
                // 用于在延时resolve情况下作为回调执行
                this.resolvedCallbacks.map(cb => cb())
            }
        }
        let reject = (err) => {
            if (this.status === REJECTED) {
                this.status = REJECTED
                this.value = err
                this.rejectedCallbacks.map(cb => cb())
            }
        }
        this.status = PENDING
        this.value = undefined
        // 存储多个then方法的所有回调
        // promise.then(res1=>{代码1....})
        // promise.then(res2=>{代码2....})
        // promise.then(res3=>{代码3....})
        this.resolvedCallbacks = []
        this.rejectedCallbacks = []

        try {
            fn(resolve, reject)
        } catch (e) {
            // 报错后执行reject
            reject(e)
        }
    }

    then(onFulfilled, onRejected) {
        //如果then参数不是function就使用默认的函数传递Promise链
        (typeof onFulfilled === 'function') || (onFulfilled = value => value)
        (typeof onRejected === 'function') || (onRejected = value => {throw value})

        //将then/catch的返回值包装成一个Promise,遵循PromiseA+规范
        let promise2 = new MyPromise((resolve, reject) => {
            switch (this.status) {

                case PENDING: {
                    // 如果Promise还没有决议,则将相应的回调放入数组存储,等待resolve/reject执行
                    //这里使用setTimeout(()=>{},0)模拟微任务
                    //Todo 这里pending状态需要用异步么?
                    setTimeout(() => {
                        this.resolvedCallbacks.push(
                            // 放入了回调函数,但这时候this.value值还是undefined
                            () => {
                                onFulfilled(this.value)
                            }
                    )
                        this.rejectedCallbacks.push(
                            () => {
                                onRejected(this.value)
                            }
                        )
                        // resolvePromise(promise2, x, resolve, reject)
                    })
                    break;
                }

                case RESOLVED: {
                    //then方法提取状态为resolve/reject的Promise对象的值后,会将提取的值作为回调函数的参数将回调函数放入微任务队列中
                    //Js会通过EventLoop在当前宏任务完成后自动处理微任务队列中的任务
                    setTimeout(() => {
                        try {
                            let res = onFulfilled(this.value)
                            resolvePromise(promise2, res, resolve, reject)
                        } catch (e) {
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
                            reject(e)
                        }
                    })
                    break
                }

            }
        })
        // debugger
        return promise2
    }

    // catch(cb) {
    //
    // }
    // static resolve(value) {
    //     //如果是thenable对象则展开一个
    //     if (value.then) {
    //
    //     } else { //非promiseList就返回一个resolved的promise
    //         setTimeout(() => {
    //             return new MyPromise(function (resolve,reject) {
    //                 resolve(value)
    //             })
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

console.log(promise)


promise
    .then(res => {
        console.log(res)
    })
// .then(
//     res => console.log(res),
//     res => {
//         console.log('reject', res)
//     }
// )


console.log(123)

