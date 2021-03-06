#!/usr/bin/env node
"use strict";

const fs = require("fs");
const log = require("./parrot/loglevel");

process.on("uncaughtException", function(error) {
  console.critical("Uncaught exception!", error);
  process.exit(1);
});
process.on("unhandledRejection", function(error) {
  console.critical("Unhandled promise rejection!", error);
  process.exit(1);
});

const {Runner} = require("./parrot/main");

async function run(config) {
  try {
    const runner = new Runner(config);
    const reap = async () => {
      console.warn("Received HUP");
      await runner.close();
    };
    process.on("SIGHUP", reap);
    try {
      await runner.run();
    }
    finally {
      process.removeListener("SIGHUP", reap);
    }
  }
  catch (ex) {
    console.error("Parrot ded", ex);
  }
}

function setupLogging() {
  const errfile = fs.createWriteStream("errors.log", { flags: "a" });
  const errors = log.patch(new console.Console(errfile), {
    colors: false,
    level: "error"
  });
  log.install(console, errors);
}

async function main() {
  setupLogging();

  let config = JSON.parse(fs.readFileSync(".config.json"));

  const {loglevel: ll = "info"} = config;
  log.setLevel(ll);
  console.debug("set level to", ll);

  const {sleep} = require("./parrot/utils");

  for (;;) {
    config = JSON.parse(fs.readFileSync(".config.json"));
    await run(config);
    await sleep(10 * 1000);
  }
}
main().catch(ex => console.error("Parroting failed", ex));
