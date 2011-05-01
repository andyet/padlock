var EventEmitter = require("events").EventEmitter;

/**
 * Padlock works to prevent unexpected code execution when dealing with
 * asynchronous callbacks. Call a function with lock to execute it as soon as a
 * lock can be attained, and unlock it at all of your possible callback end-
 * points. Use the same lock on other functions that you don't want to
 * interrupt. Code will execute in order as the lock can be acquired.
 */
function Padlock() {
    EventEmitter.call(this);
    this.locked = false;
    this.blocked_queue = Array();
    this.lockid = 0;
}

//extend Padlock with EventEmitter
Padlock.super_ = EventEmitter;
Padlock.prototype = Object.create(EventEmitter.prototype, {
    constructor: {
        value: Padlock,
        enumerable: false
    }
});

/**
 * Acquire a lock or queue up a function. Will never execute or queue callack
 * if lock is succesful, unlike runwithlock().
 *
 * @param callback -- function to call when lock is acquired
 * @param args
 * @param ctx -- context (this) for callback (optional)
 * @param timeout -- number of seconds before timeout event (optional)
 *
 * @return new lockid
 */
function padlock_acquire(callback, args, ctx, timeout, implicit) {
    if(this.locked === true) {
        this.blocked_queue.push([callback, args, ctx, implicit]);
        return false;
    } 
    ++this.lockid;
    this.lockid %= 65000;
    this.locked = true;
    var lastlocked = this.lockid;
    if(timeout) {
        setTimeout(function () {
            if(lastlocked == this.lockid) {
                this.emit('timeout', this.lockid);
            }
        }.bind(this), timeout);
    }
    this.emit('locked', this.lockid);
    return this.lockid;
}

/**
 * Acquire a lock and run callback or queue up the callback. Will execute
 * callback if initial lock attempt is successful, unlike acquire.
 *
 * @param callback -- function to call when lock is acquired
 * @param args
 * @param ctx -- context (this) for callback (optional)
 * @param timeout -- number of seconds before timeout event (optional)
 *
 * @return new lockid
 */
function padlock_runwithlock(callback, args, ctx, timeout) {
    var lockid = this.acquire(callback, args, ctx, timeout, true);
    if(lockid) {
        if(ctx === undefined) {
            callback.apply(this, args);
        } else {
            callback.apply(ctx, args);
        }
    }
    return lockid;
}

// Check to see if the lock is currently acquired.
function padlock_islocked() {
    return this.locked;
}

/**
 * Undo the lock, optionally only if it is a specific lockid.
 *
 * @param lockid (optional)
 */
function padlock_release(lockid) {
    if(lockid === undefined || lockid == this.lockid) {
        this.locked = false;
        process.nextTick(function () {
            this.runblocked();
        }.bind(this));
        this.emit('unlocked', this.lockid);
        return true;
    }
    return false;
}

// Run blocked functions in queue (internally called)
function padlock_runblocked() {
    while(!this.locked) {
        var callbackd = this.blocked_queue.shift();
        if(callbackd === undefined) { break; }
        if(true) { 
            this.locked = true 
        }
        if(callbackd[2] === undefined) {
            callbackd[0].apply(this, callbackd[1]);
        } else {
            callbackd[0].apply(callbackd[2], callbackd[1]);
        }
    }
}

/**
 * Wrap a function call in a function that requires a lock to be acquired to
 * run.
 *
 * @param callback -- function to wrap
 * @param ctx -- "this" for callback (optional)
 * @param timeout -- timeout for all locks acquired by return function
 *
 * @return wrapper function
 */
function padlock_require(callback, ctx, timeout) {
    var withlock = function() {
        var args = arguments;
        this.runwithlock(callback, args, ctx, timeout);
    }.bind(this);
    return withlock;
}

Padlock.prototype.acquire = padlock_acquire;
Padlock.prototype.runwithlock = padlock_runwithlock;
Padlock.prototype.islocked = padlock_islocked;
Padlock.prototype.release = padlock_release;
Padlock.prototype.unlock = padlock_release;
Padlock.prototype.runblocked = padlock_runblocked;
Padlock.prototype.require = padlock_require;

exports.Padlock = Padlock;
