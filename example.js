class Promise{
    constructor(executor){
        this.state = 'pending';
        this.value = undefined;
        this.reason = undefined;
        this.onResolvedCallbacks = [];
        this.onRejectedCallbacks = [];
        let resolve = value => {
            if (this.state === 'pending') {
                this.state = 'fulfilled';
                this.value = value;
                this.onResolvedCallbacks.forEach(fn=>fn());
            }
        };
        let reject = reason => {
            if (this.state === 'pending') {
                this.state = 'rejected';
                this.reason = reason;
                this.onRejectedCallbacks.forEach(fn=>fn());
            }
        };
        try{
            executor(resolve, reject);
        } catch (err) {
            reject(err);
        }
    }
    then(onFulfilled,onRejected) {
        // onFulfilled如果不是函数，就忽略onFulfilled，直接返回value
        onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value;
        // onRejected如果不是函数，就忽略onRejected，直接扔出错误
        onRejected = typeof onRejected === 'function' ? onRejected : err => { throw err };
        let promise2 = new Promise((resolve, reject) => {
            if (this.state === 'fulfilled') {
                // 异步
                setTimeout(() => {
                    try {
                        let x = onFulfilled(this.value);
                        resolvePromise(promise2, x, resolve, reject);
                    } catch (e) {
                        reject(e);
                    }
                }, 0);
            };
            if (this.state === 'rejected') {
                // 异步
                setTimeout(() => {
                    // 如果报错
                    try {
                        let x = onRejected(this.reason);
                        resolvePromise(promise2, x, resolve, reject);
                    } catch (e) {
                        reject(e);
                    }
                }, 0);
            };
            if (this.state === 'pending') {
                this.onResolvedCallbacks.push(() => {
                    // 异步
                    setTimeout(() => {
                        try {
                            let x = onFulfilled(this.value);
                            resolvePromise(promise2, x, resolve, reject);
                        } catch (e) {
                            reject(e);
                        }
                    }, 0);
                });
                this.onRejectedCallbacks.push(() => {
                    // 异步
                    setTimeout(() => {
                        try {
                            let x = onRejected(this.reason);
                            resolvePromise(promise2, x, resolve, reject);
                        } catch (e) {
                            reject(e);
                        }
                    }, 0)
                });
            };
        });
        // 返回promise，完成链式
        return promise2;
    }
}

let promise = new Promise(resolve=>{
    resolve(456)
})

promise.then(res=> console.log(res)).then(res=> console.log(res))