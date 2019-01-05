const PENDING = 'pending'
const RESOLVED = 'resolved'
const REJECTED = 'rejected'


//决议Promise
function resolvePromise(promise2, value, resolve, reject) {
    //排除可能既调resolve又调用reject情况
    // 表示是否已经决议
    let called;
    // 如果循环引用则reject
    if (value === promise2) {
        return reject(new TypeError('Chaining cycle detected for promise'));
    }


    //value为thenable对象(会被认为是个Promise)
    //如果 value 处于pending，Promise 需保持为等待态直至 value 被执行或拒绝
    //如果 value 处于其他状态，则用相同的值处理 Promise
    if (value && value.then && typeof value.then === 'function') {
        value.then(
            // 传入onFulfilled/onRejected函数（此时这2个函数未执行）
            function onFulfilled(res) {
                if (called) return;

                called = true;
                //递归调用resolvePromise直到传入的value不是一个Promise对象为止
                // 传递promise2是为了通过闭包保留promise2
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
        // 存储多个then方法时的所有回调
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
        //如果then参数不是function就使用默认的函数继续向后传递Promise链
        (typeof onFulfilled === 'function') || (onFulfilled = res => res)
        (typeof onRejected === 'function') || (onRejected = err => {throw err})

        //将then/catch的返回值包装成一个Promise
        let promise2 = new MyPromise((resolve, reject) => {
            switch (this.status) {

                case PENDING: {
                    // 如果Promise还没有决议,则将相应的回调放入数组存储,等待resolve/reject执行后将回调放入微任务队列
                    //这里使用setTimeout(()=>{},0)模拟微任务
                    //pending状态也需要让promise是完全异步的,在宏任务完成后才执行
                    setTimeout(() => {
                        this.resolvedCallbacks.push(
                            //放入了一个函数，等待执行（执行这个箭头函数等同于执行onFulfilled/onRejected函数）
                            // 放入了回调函数,但这时候this.value值还是undefined
                            () => {
                                let res = onFulfilled(this.value)
                                resolvePromise(promise2, res, resolve, reject)

                            }
                        )
                        this.rejectedCallbacks.push(
                            () => {
                                let err = onRejected(this.value)
                                resolvePromise(promise2, err, resolve, reject)
                            }
                        )
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
                            reject(e)
                        }
                    })
                    break
                }

            }
        })
        // debugger
        //返回一个promise
        return promise2
    }
    catch(onRejected){
        return this.then(null,onRejected);
    }
}


let promise = new MyPromise(resolve => {
    resolve(1)
})

