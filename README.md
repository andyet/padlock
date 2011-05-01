# Padlock

Padlock works to prevent unexpected code execution when dealing with asynchronous callbacks. Call a function with lock to execute it as soon as a lock can be attained, and unlock it at all of your possible callback end-points. Use the same lock on other functions that you don't want to interrupt. Code will execute in order as the lock can be acquired.

#Why

I wrote this to deal with node_redis in the `WATCH -> GET -> MULTI ... values using the GET ... EXEC` scenario. I repeatedly had issues with other functions happening between the `WATCH` and the `MULTI` that would send commands and interrupt my `WATCH`. I confirmed that this is a known issue that he'd like to solve with the author. So I wrote this to use where any function with a `WATCH` will lock and unlock in the `EXEC` callback.

Could I have done this with another synchronous library? Maybe, but I found this straight and to the point.

**The biggest advantage is that functions that do not use your lock will be uninterrupted by your locked callback.** That is, you may have a lot of events and functions executing during your lock, but so long as you use your lock selectively, node.js will not wait on your lock release to run unrelated code. This is significantly different to some (maybe all?) of the synchronous libs from node.js, and should keep your service running very quickly dispite waiting on callbacks semi-synchronously.

## Examples

### Out of Order
    var Padlock = require("padlock").Padlock;

    var lock = new Padlock();

    //a set of functions where one is asynchronous and could get out of order
    console.log("start");
    setTimeout(function() {
        console.log("middle");
    }, 200);
    console.log("end");

> start
> end
> middle

### Ensuring Order
    lock.runwithlock(function () {
        console.log("start");
        lock.release();
    });
    lock.runwithlock(setTimeout, [function() {
        console.log("middle");
        lock.release();
    }, 200]);
    lock.runwithlock(function () {
        console.log("end");
        lock.release();
    });

>  start
>  middle
>  end

### Replacing a Function with a Lock Requirement
    function logit(x) {
        console.log(x);
        lock.release();
    }

    logit = lock.require(logit);

    logit("a");
    lock.acquire(setTimeout, [function() {
        console.log("b");
        lock.release();
    }, 200]);
    logit("c");

    lock.runwithlock(function() {
        console.log("the end!");
        lock.release();
    });

> a
> b
> c
> the end!
