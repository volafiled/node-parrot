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
const CMAX_LENGTH = Array.from(LEVELS.keys()).
  map(e => `[]${e.green}`).
  reduce((p, c) => Math.max(p, c.length), 0);
const MAX_LENGTH = Array.from(LEVELS.keys()).
  map(e => `[]${e}`).
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
  [, stack] = stack.toString().split("\n").filter(e => !e.includes(__filename));
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

function adoptConsole(console, options) {
  options = options || {};
  const {colors = true} = options;
  const {level: olevel} = options;
  if (olevel) {
    setLevel(olevel, console);
  }

  function conrebind(method, color) {
    const m = ALIASES.get(method) || method;
    const l = LEVELS.get(m);
    const p = colors ?
      `[${m.toUpperCase()[color]}]`.padEnd(CMAX_LENGTH) :
      `[${m.toUpperCase()}]`.padEnd(MAX_LENGTH);
    const o = console[method].bind(console);
    const handler = (...args) => {
      let {level: clevel = 0} = console;
      if (!clevel) {
        clevel = level;
      }
      if (l > clevel) {
        return false;
      }
      const date = colors ?
        new Date().toString().bold.blue :
        new Date().toString();
      try {
        const name = colors ?
          getName(handler, args).bold.green :
          getName(handler, args);
        const pad = colors ? 30 : 11;
        o(`[${date}]`, `[${name}]`.padEnd(pad), p, ...args);
      }
      catch (ex) {
        o(`[${date}]`, p, ...args);
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
  return console;
}

function setLevel(lvl, cons) {
  const resolved = LEVELS.get(lvl);
  if (!resolved) {
    throw new Error("Not a valid log level");
  }
  if (!cons) {
    level = resolved;
  }
  else {
    cons.level = resolved;
  }
}

adoptConsole(console);
setLevel("info");

const proxy = {
  "get"(target, property) {
    if (property === "Console") {
      return target.first.Console;
    }
    let prop = target.cache.get(property);
    if (prop) {
      return prop;
    }
    prop = target.first[property];
    if (typeof prop !== "function") {
      throw new TypeError(`Can only access functions/methods: ${typeof (prop)} ${property} ${prop}`);
    }
    const props = target.teed.map(o => {
      return {o, m: o[property]};
    });
    prop = function(...args) {
      let rv;
      for (const p of props) {
        try {
          const crv = p.m.apply(p.o, args);
          if (typeof rv === "undefined") {
            rv = crv;
          }
        }
        catch (ex) {
          // ignore
        }
      }
      return rv;
    };
    target.cache.set(property, prop);
    return prop;
  }
};

class ConsoleTee {
  constructor(...teed) {
    this.teed = Array.from(teed);
    [this.first] = this.teed;
    this.cache = new Map();
    return new Proxy(this, proxy);
  }
}

module.exports = { adoptConsole, setLevel, ConsoleTee };

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
  const cons2 = new console.Console(process.stdout);
  const cons3 = adoptConsole(
    new console.Console(process.stdout), {level: "error"});
  const cons4 = adoptConsole(
    new console.Console(process.stdout), {colors: 0});
  const tee = new ConsoleTee(console, cons2, cons3, cons4);
  tee.error("tee test");
  tee.info("tee test2");
}
