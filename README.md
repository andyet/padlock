# Padlock

Padlock works to prevent unexpected code execution when dealing with asynchronous callbacks. Call a function with lock to execute it as soon as a lock can be attained, and unlock it at all of your possible callback end-points. Use the same lock on other functions that you don't want to interrupt. Code will execute in order as the lock can be acquired.

## Examples

### Out of Order
    var Padlock = require("./padlock.js").Padlock;

    var lock = new Padlock();

    //a set of functions where one is asynchronous and could get out of order
    console.log("start");
    setTimeout(function() {
        console.log("middle");
    }, 200);
    console.log("end");

#### Output
     start
     end
     middle

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

#### Output
    start
    middle
    end

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

#### Output
    a
    b
    c
    the end!
