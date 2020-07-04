"use strict";

const {ChatCommand} = require("./command");

const request = require.main.require("./parrot/request");

const {Cooldown, decodeHTML} = require.main.require("./parrot/utils");

const {PromisePool} = require.main.require("./parrot/pool");
const POOL = new PromisePool(5);

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
        console.error("Failed to process url", url, ex);
      }
    }
    return false;
  }

  async extract(url,...args) {
    if (typeof url === "string") {
      url = {
        url,
        method: "GET",
      };
    }
    if (!url.method) {
      url.method = "GET";
    }
    const resp = await request(url);
    const rv = [resp];
    for (const a of args) {
      rv.push(resp.match(a));
    }
    return rv;
  }
}

module.exports = { URLInfo, decodeHTML, request };
