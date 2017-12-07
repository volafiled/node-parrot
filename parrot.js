#!/usr/bin/env node
"use strict";

const {setLevel, adoptConsole, ConsoleTee} = require("./parrot/loglevel");

process.on("uncaughtException", function(error) {
  console.critical("Uncaught exception!", error);
  process.exit(1);
});
process.on("unhandledRejection", function(error) {
  console.critical("Unhandled promise rejection!", error);
  process.exit(1);
});

const fs = require("fs");
const {Runner} = require("./parrot/runner");
const {sleep} = require("./parrot/utils");


async function run(config) {
  try {
    const runner = new Runner(config);
    await runner.run();
  }
  catch (ex) {
    console.error("Parrot ded", ex);
  }
}

(async function main() {
  setLevel("info");
  const errfile = fs.createWriteStream("errors.log", { flags: "a" });
  const errors = adoptConsole(new console.Console(errfile), {
    colors: false,
    level: "error"
  });
  Object.defineProperty(global, "console", {
    value: new ConsoleTee(console, errors),
    enumerable: true,
    configurable: true,
    writable: true
  });
  const config = JSON.parse(fs.readFileSync(".config.json"));
  const {loglevel: ll = "info"} = config;
  setLevel(ll);
  console.debug("set level to", ll);
  for (;;) {
    await run(config);
    await sleep(10 * 1000);
  }
})().catch(ex => console.error("Parroting failed", ex));
