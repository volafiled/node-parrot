#!/usr/bin/env node
"use strict";

require("./parrot/loglevel");
const fs = require("fs");
const log = require("loglevel");
const {Runner} = require("./parrot/runner");
const {sleep} = require("./parrot/utils");


async function run(config) {
  try {
    const runner = new Runner(config);
    await runner.run();
  }
  catch (ex) {
    log.error("Parrot ded", ex);
  }
}

(async function main() {
  log.setDefaultLevel("info");
  const config = JSON.parse(fs.readFileSync(".config.json"));
  const {loglevel: ll = "info"} = config;
  log.setLevel(ll);
  log.debug("set level to", ll);
  for (;;) {
    await run(config);
    await sleep(60 * 1000);
  }
})().catch(ex => console.error("Parroting failed", ex));
