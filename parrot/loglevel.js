"use strict";

require("colors");

const CON_PAD = 7;

function conrebind(m, color) {
  const p = m.padEnd(CON_PAD, " ")[color];
  const o = console[m];
  console[m] = (...args) => {
    return o.call(console, new Date().toString().bold.blue, p, ...args);
  };
}

console.debug = (...args) => console.log(...args);
conrebind("error", "red");
conrebind("warn", "yellow");
conrebind("log", "white");
conrebind("info", "white");
conrebind("debug", "gray");
