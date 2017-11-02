"use strict";

require("colors");
const {format} = require("util");
const {parse} = require("path");

const LEVELS = new Map([
  ["critical", 1],
  ["error", 2],
  ["warn", 10],
  ["info", 20],
  ["debug", 30],
  ["trace", 30],
]);
const MAX_LENGTH = Array.from(LEVELS.keys()).
  map(e => `[]${e.green}`).
  reduce((p, c) => Math.max(p, c.length), 0);
const ALIASES = new Map([
  ["log", "info"]
]);
const NOT = new Set(["index", "lib", "bot"]);
let level = 0;

function getStack(handler) {
  const rv = {};
  Error.captureStackTrace(rv, handler);
  return rv;
}

function getActualName(stack) {
  const {name} = parse(stack);
  if (!name || NOT.has(name)) {
    const {dir} = parse(stack);
    if (dir) {
      return getActualName(dir);
    }
  }
  return name;
}

function getName(handler, args) {
  let {stack = ""} = args.find(e => e && e.stack) || getStack(handler);
  if (!stack) {
    return "";
  }
  [, stack] = stack.toString().split("\n");
  if (!stack) {
    const {stack: fallback = ""} = getStack(handler);
    [, stack] = fallback.split("\n");
  }
  if (!stack) {
    return "";
  }
  const m = stack.match(/\((.+?)\)$/, stack.trim());
  if (!m) {
    return stack.trim();
  }
  [, stack] = m;
  return getActualName(stack);
}

function adoptConsole(console) {
  function conrebind(method, color) {
    const m = ALIASES.get(method) || method;
    const l = LEVELS.get(m);
    const p = `[${m.toUpperCase()[color]}]`.padEnd(MAX_LENGTH);
    const o = console[method].bind(console);
    const handler = (...args) => {
      if (l > level) {
        return false;
      }
      const date = new Date().toString();
      try {
        o(`[${date.bold.blue}]`, `[${getName(handler, args).bold.green}]`.padEnd(30), p, ...args);
      }
      catch (ex) {
        o(`[${date.bold.blue}]`, p, ...args);
      }
      return true;
    };
    console[method] = handler;
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
  conrebind("debug", "dim");
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
  console.info("hello again");
  console.critical("critical");
  console.debug("not visible");
  setLevel("debug");
  console.debug("visible");
  console.debug("fake", {stack: "fake stack"});
  console.debug("faker", {stack: {kek: "fake stack"}});
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
