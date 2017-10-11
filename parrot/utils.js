"use strict";

const LRU = require("lru-cache");
const {sleep, deadline} = require("volapi/lib/util");

class Cooldown extends LRU {
  constructor(timeout, max = 50) {
    super(max);
    this.timeout = timeout || 10 * 60 * 1000;
  }

  has(key) {
    const to = super.get(key);
    if (to && to + this.timeout > Date.now()) {
      return true;
    }
    super.del(key);
    return false;
  }

  set(key) {
    super.set(key, Date.now());
  }
}

function randint(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

function shuffle(array) {
  for (let i = array.length; i; i--) {
    const j = Math.floor(Math.random() * i);
    [array[i - 1], array[j]] = [array[j], array[i - 1]];
  }
}


module.exports = {
  sleep,
  deadline,
  LRU,
  randint,
  shuffle,
  Cooldown
};
