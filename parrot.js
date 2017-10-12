require("./parrot/loglevel");
const fs = require("fs");
const log = require("loglevel");
const {Runner} = require("./parrot/runner");

(async function main() {
  log.setDefaultLevel("info");
  const config = JSON.parse(fs.readFileSync(".config.json"));
  const {loglevel: ll = "info"} = config;
  log.setLevel(ll);
  log.debug("set level to", ll);
  try {
    const runner = new Runner(config);
    await runner.run();
  }
  catch (ex) {
    log.error("Parrot ded", ex);
  }
})().catch(ex => console.error("Parroting failed", ex));
