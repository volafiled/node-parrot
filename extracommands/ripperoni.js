"use strict";

const {spawn} = require("child_process");
const fs = require("fs");
const path = require("path");
const {promisify} = require("util");

const uuid = require.main.require("uuid/v1");
let glob = require.main.require("glob");
const {ChatCommand} = require.main.require("./commands/command");
const {PromisePool} = require.main.require("./parrot/pool");

glob = promisify(glob);
const unlink = promisify(fs.unlink);

class Ripperoni extends ChatCommand {
  constructor(...args) {
    super(...args);
    const {rippers = []} = this.options;
    this.rippers = new Set(rippers);
    this.run_process = PromisePool.wrapNew(3, this, this.run_process);
  }

  get handlers() {
    return ["!ripperoni", "!musiks", "!music"];
  }

  allowed_rip(msg) {
    if (msg.purple) {
      return true;
    }
    if (msg.green && this.rippers.has(msg.lnick)) {
      return true;
    }
    return false;
  }

  handle_music(room, remainder, msg) {
    return this.handle_musiks(room, remainder, msg);
  }

  handle_ripperoni(room, remainder, msg) {
    if (!this.allowed_rip(msg)) {
      room.chat("No rips for you!");
      return true;
    }
    return this.rip(room, msg, remainder, "-f", "best");
  }

  handle_musiks(room, remainder, msg) {
    if (!this.allowed_rip(msg)) {
      room.chat("No rips for you!");
      return true;
    }
    return this.rip(room, msg, remainder, "-xf", "bestaudio");
  }

  run_process(...args) {
    const spawnopts = {
      env: null,
      stdio: ["ignore", "pipe", "inherit"],
    };
    const proc = spawn("/usr/bin/env", args, spawnopts);
    const buf = [];
    return new Promise((resolve, reject) => {
      proc.stdout.on("data", data => buf.push(data));
      proc.on("close", code => {
        if (code) {
          reject(new Error(`Process Exit: ${code}`));
        }
        resolve(buf.join(""));
      });
      proc.on("error", reject);
    });
  }

  async rip(room, msg, remainder, ...options) {
    remainder = remainder.trim();
    const [url, ...namepieces] = remainder.split(/\s+/);
    const name = namepieces.map(e => e.trim()).filter(e => e).join(" ").trim();
    if (!url) {
      room.chat(`>No URL\n${msg.nick}, pls`);
      return true;
    }
    const tmp = `ripperoni-${uuid()}`;
    const files = [tmp];
    try {
      let fn = await this.run_process(
        "youtube-dl", "--get-filename", "--ignore-config", ...options, url);
      fn = fn.trim();
      if (name) {
        const nn = path.parse(fn);
        nn.name = name;
        delete nn.base;
        fn = path.format(nn);
      }

      room.chat(`▶︎ ${fn}`);
      try {
        console.error(await this.run_process(
          "youtube-dl", "--ignore-config", "-o", tmp, "-c", "--no-part",
          ...options, url));
      }
      catch (ex) {
        console.error(await this.run_process(
          "youtube-dl", "--ignore-config", "-o", `${tmp}.%(ext)s`, "-c", "--no-part",
          ...options, url));
      }
      let fid;
      try {
        const {id} = await room.uploadAs(msg.nick, {
          file: `${tmp}`,
          name: fn
        });
        fid = id;
      }
      catch (ex) {
        if (ex.code !== "ENOENT") {
          throw ex;
        }
        const cands = await glob(`${tmp}.*`);
        if (!cands.length) {
          throw new Error("No files");
        }
        files.push(...cands);
        const [cand] = cands;
        const {ext} = path.parse(cand);
        let nn = path.parse(fn);
        nn.ext = ext;
        delete nn.base;
        nn = path.format(nn);
        const {id} = await room.uploadFile({file: cand, name: nn});
        fid = id;
      }
      const file = await room.waitFile(fid, 120 * 1000);
      if (file) {
        room.chat(`✓ @${file.id}`);
      }
    }
    catch (ex) {
      console.error(ex);
      room.chat(`⚠️ Failed: ${url}`);
    }
    finally {
      for (const file of files) {
        try {
          await unlink(file);
        }
        catch (ex) {
          // ignored
        }
      }
    }
    return true;
  }
}

module.exports = (handler, options) => {
  handler.registerChatCommand(new Ripperoni(options));
};
