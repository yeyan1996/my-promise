const PENDING = 'pending'
const RESOLVED = 'resolved'
const REJECTED = 'rejected'


//决议Promise
function resolvePromise(promise2, value, resolve, reject) {
    // 防止作为返回值的 promise 可能既调resolve又调用reject情况
    let called;
    // 如果循环引用则reject
    if (value === promise2) {
        return reject(new TypeError('Chaining cycle detected for promise'));
    }

    /**尝试展开Promise**/
    //value为thenable对象(会被认为是个Promise)
    //如果 value 处于pending，Promise 需保持为等待态直至 value 被执行或拒绝
    //如果 value 处于其他状态，则用相同的值处理 Promise
    if (value && value.then && typeof value.then === 'function') {
        value.then(
            //定义如何展开这个Promise
            // 内部给 then 方法自定义了 onFulfilled/onRejected 函数，规定处理逻辑
            // 当作为返回值的 promise 被决议后再决议这个 then 方法生成的 promise(promise2)
            function onFulfilled(res) {
                if (called) return;
                called = true;
                // 递归调用resolvePromise直到传入的value不是一个Promise对象为止
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
        //如果value不是一个Promise，通过闭包的resolve函数决议then方法返回的promise2
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
            // 调用 reject 方法同样只可能是在 pending 状态
            if (this.status === PENDING) {
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
        onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : res => res
        onRejected = typeof onRejected === 'function' ? onRejected : err => {
            throw err
        }

        //将then/catch的返回值包装成一个Promise
        let promise2 = new MyPromise((resolve, reject) => {
            switch (this.status) {

                case PENDING: {
                    // 如果Promise还没有决议,则将相应的回调放入数组存储,等待resolve/reject执行后将回调放入微任务队列
                    // pending状态需要同步调用，因为需要及时将回调放到callback中，不能异步执行否则会多次触发一些行为

                    this.resolvedCallbacks.push(
                        // 放入回调函数,但这时候this.value值还是undefined
                        () => {
                            try {
                                let res = onFulfilled(this.value)
                                resolvePromise(promise2, res, resolve, reject)
                            } catch (e) {
                                reject(e)
                            }
                        }
                    )


                    this.rejectedCallbacks.push(
                        () => {
                            try {
                                let err = onRejected(this.value)
                                resolvePromise(promise2, err, resolve, reject)
                            } catch (e) {
                                reject(e)
                            }
                        }
                    )

                    break;
                }

                case RESOLVED: {
                    //then方法提取状态为resolve/reject的Promise对象的值后,会将提取的值作为回调函数的参数将回调函数放入微任务队列中
                    //Js会通过EventLoop在当前宏任务完成后自动处理微任务队列中的任务
                    //这里使用setTimeout模拟微任务
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
        //返回一个promise
        return promise2
    }

    catch(onRejected) {
        return this.then(null, onRejected);
    }

    finally(callback){
        return MyPromise.resolve(this).then(callback,callback)
    }

    static resolve(value) {
        if (value instanceof this) {
            return value
        }
        //规范中Promise.resolve必须是同步调用的
        return new MyPromise((resolve) => {
            resolve(value)
        })
    }

    static reject(err) {
        return new MyPromise((resolve, reject) => {
            reject(err)
        })
    }

    static all(arr) {
        if(!Array.isArray(arr)) throw new Error('argument is not an Array')
        return new MyPromise((resolve, reject) => {
            let resolvedValues = []

            let onResolve = (res) => {
                resolvedValues.push(res)
                if (resolvedValues.length === arr.length) {
                    resolve(resolvedValues)
                }
            }

            arr.map(item => MyPromise.resolve(item)).forEach(item => {
                item.then(onResolve, reject)
            })

        })
    }

    static race(arr){
        if(!Array.isArray(arr)) throw new Error('argument is not an Array')
        return new MyPromise((resolve,reject)=>{
            arr.map(item => MyPromise.resolve(item)).forEach(item=>{
                item.then(resolve,reject)
            })
        })
    }
}


let promise = new MyPromise((resolve,reject)=>{
    setTimeout(() => {
        reject(1)
    }, 500)
})

let promise2 = new MyPromise((resolve, reject) => {
    setTimeout(() => {
        resolve(2)
    }, 2000)
})


let promise3 = new MyPromise((resolve, reject) => {
    setTimeout(() => {
        resolve(3)
    }, 1000)
})


let promise4 = new MyPromise((resolve, reject) => {
    setTimeout(() => {
        resolve(4)
    }, 5500)
})


// MyPromise.all([promise2, promise3, promise4]).then(res => console.log(res), err => console.log(err))
// MyPromise.race([promise2, promise3, promise4]).then(res => console.log(res), err => console.log(err))
// promise.then(res=> console.log(res),err=> console.log(err)).finally(()=> console.log('completed')).then(res=> console.log(res))