# Padlock

Padlock works to selectively prevent conflicting/interrupting code execution when dealing with asynchronous callbacks. Call a function with lock to execute it as soon as a lock can be attained, and unlock it at all of your possible callback end-points. Use the same lock on other functions that you don't want to interrupt, and leave functions that you don't mind interrupting your lock alone. Locked functions will execute in order as the lock can be acquired.

## Why

I wrote this to deal with node_redis in the `WATCH -> GET -> MULTI ... values using the GET ... EXEC` scenario. I repeatedly had issues with other functions happening between the `WATCH` and the `MULTI` that would send commands and interrupt my `WATCH`. I confirmed with the author that this is a known issue he plans on solving. In the meantime, I wrote this to use in any function with a `WATCH` will lock and unlock in the `EXEC` callback. I'm sure you could use this anywhere you need synchronous flow for certain events.

Could I have done this with another synchronous library? Maybe, but I found this straight and to the point.

**The biggest advantage is that functions that do not use your lock will be uninterrupted by your locked callback.** That is, you may have a lot of events and functions executing during your lock, but so long as you use your lock selectively, node.js will not wait on your lock release to run unrelated code. This is significantly different to some (maybe all?) of the synchronous libs from node.js, and should keep your service running very quickly dispite waiting on callbacks semi-synchronously.

##Install

    npm install padlock

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

    logit("the end!");

> a  
> b  
> c  
> the end! 

## License

Written by Nathan Fritz. Copyright © 2011 by &yet, LLC. Released under the terms of the MIT License:

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
