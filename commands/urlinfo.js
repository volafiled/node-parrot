"use strict";

const {AllHtmlEntities: entities} = require("html-entities");
const {ChatCommand} = require("./command");

const request = require.main.require("./parrot/request");

const {Cooldown} = require.main.require("./parrot/utils");

const {PromisePool} = require.main.require("./parrot/pool");
const POOL = new PromisePool(5);

function decode(str, times = 1) {
  for (let i = 0; i < Math.max(1, times); ++i) {
    try {
      str = entities.decode(str);
    }
    catch (ex) {
      break;
    }
  }
  return str;
}

class URLInfo extends ChatCommand {
  constructor(options) {
    super(options);
    this.cooldown = new Cooldown(5 * 60 * 1000, 10);
    this.url = POOL.wrap(this, this.onurl);
  }

  handles(room, cmd) {
    return !!cmd;
  }

  async handle(room, cmd, remainder, msg) {
    for (const url of msg.urls) {
      if (!this.needle.test(url)) {
        continue;
      }
      if (this.cooldown.has(url)) {
        continue;
      }
      try {
        if (await this.onurl(room, url)) {
          this.cooldown.set(url);
        }
      }
      catch (ex) {
        this.log.error("Failed to process url", url, ex);
      }
    }
    return false;
  }

  async extract(url, ...args) {
    const resp = await request.get(url);
    const rv = [resp];
    for (const a of args) {
      rv.push(resp.match(a));
    }
    return rv;
  }
}

module.exports = { URLInfo, decode, request };
