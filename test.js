var Padlock = require("./padlock.js").Padlock;
var assert = require("assert");

var list1 = [];
var list2 = [];
var list3 = [];

var lock = new Padlock();

function updateList1(x) {
    list1.push(x);
}

function updateList2(x) {
    list2.push(x);
    lock.release();
}

function updateList3(x) {
    list3.push(x);
    lock.release();
}

function updateList3Eventually(x) {
    if(lock.acquire(setTimeout, [function () {
        list3.push(x);
        lock.release();
    }, 300])); 
}

//a set of functions where one is asynchronous and could get out of order
updateList1("start");
setTimeout(function() {
    list1.push("bad - middle");
}, 200);
updateList1("end");


//ensuring order
lock.runwithlock(updateList2, ["start"]);
lock.runwithlock(setTimeout, [function() {
    list2.push("middle");
    lock.release();
}, 200]);
lock.runwithlock(updateList2, ["end"]);

updateList3 = lock.require(updateList3);

updateList3("start");
updateList3Eventually("middle");
updateList3("end");

lock.on('timeout', function(lockid, callback, args) {
    console.log("Timed out: ", callback.toString());
});

lock.runwithlock(function() {
    console.log("Hi, I won't unlock.");
}, null, null, 3000);

lock.runwithlock(function() {
    console.log(list1, list2, list3);
    assert.ok((list1[0] == 'start' && list1[1] == 'end'), "Asserting out of order list 1...");
    assert.ok((list2[0] == 'start' && list3[2] == 'end'), "Asserting order list 2...");
    assert.ok((list3[0] == 'start' && list3[2] == 'end'), "Asserting order list 3...");
    console.log("3 tests pass");
    lock.release();
});

setTimeout(function() { console.log('done'); }, 6000);
