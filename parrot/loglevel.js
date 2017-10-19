"use strict";

require("colors");
const {format} = require("util");

const CON_PAD = 5;
const LEVELS = new Map([
  ["critical", 1],
  ["error", 2],
  ["warn", 10],
  ["info", 20],
  ["log", 20],
  ["debug", 30],
  ["trace", 30],
]);
let level = 0;

function adoptConsole(console) {
  function conrebind(m, color) {
    const l = LEVELS.get(m);
    const p = `[${m.toUpperCase().padEnd(CON_PAD, " ")[color]}]`;
    const o = console[m];
    console[m] = (...args) => {
      if (l > level) {
        return false;
      }
      o.call(console, new Date().toString().bold.blue, p, ...args);
      return true;
    };
  }

  const log = console.log.bind(console);
  console.debug = log;
  console.critical = log;
  console.trace = function trace(...args) {
    const err = {
      name: "",
      message: format.apply(null, args)
    };
    Error.captureStackTrace(err, trace);
    log(err.stack);
  };
  conrebind("critical", "red");
  conrebind("error", "red");
  conrebind("warn", "yellow");
  conrebind("log", "white");
  conrebind("info", "white");
  conrebind("debug", "gray");
  conrebind("trace", "gray");
}

function setLevel(lvl) {
  const resolved = LEVELS.get(lvl);
  if (!resolved) {
    throw new Error("Not a valid log level");
  }
  level = resolved;
}

adoptConsole(console);
setLevel("info");

module.exports = { adoptConsole, setLevel };

if (require.main === module) {
  console.log("hello");
  console.critical("critical");
  console.debug("not visible");
  setLevel("debug");
  console.debug("visible");
  try {
    setLevel("nah");
  }
  catch (ex) {
    console.error("not valid", ex);
    console.warn("be more careful");
  }
  console.trace("writing VB application to trace the perp!");
  setLevel("info");
  console.trace("writing VB application to trace the perp!");
}
