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

const VIDEO_FORMATS = [
  "bestvideo[height>=3840][ext=mp4]+bestaudio[ext=m4a]",
  "bestvideo[height>=3840][ext=webm]+bestaudio[ext=webm]",
  "bestvideo[height>=2160][ext=mp4]+bestaudio[ext=m4a]",
  "bestvideo[height>=2160][ext=webm]+bestaudio[ext=webm]",
  "bestvideo[height>=1920][ext=mp4]+bestaudio[ext=m4a]",
  "bestvideo[height>=1920][ext=webm]+bestaudio[ext=webm]",
  "bestvideo[height>=1280][ext=mp4]+bestaudio[ext=m4a]",
  "bestvideo[height>=1280][ext=webm]+bestaudio[ext=webm]",
  "bestvideo[height>=1080][ext=mp4]+bestaudio[ext=m4a]",
  "bestvideo[height>=1080][ext=webm]+bestaudio[ext=webm]",
  "bestvideo[height>=720][ext=mp4]+bestaudio[ext=m4a]",
  "bestvideo[height>=720][ext=webm]+bestaudio[ext=webm]",
  "bestvideo[ext=mp4]+bestaudio[ext=m4a]",
  "bestvideo[ext=webm]+bestaudio[ext=webm]",
  "best",
  "bestvideo+bestaudio"
];

class Ripperoni extends ChatCommand {
  constructor(...args) {
    super(...args);
    const {rippers = [], source = null} = this.options;
    this.source = source;
    this.rippers = new Set(rippers);
    this.run_process = PromisePool.wrapNew(3, this, this.run_process);
    this.toopus = this.toopus.bind(this);
  }

  get handlers() {
    return ["!ripperoni", "!musiks", "!music", "!opus", "+opus"];
  }

  allowed_rip(msg) {
    /*
    if (msg.lnick == "bain") {
      return false;
    }
    */
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
    return this.rip(room, msg, remainder, null,
      "-f", VIDEO_FORMATS.join("/"));
  }

  handle_musiks(room, remainder, msg) {
    if (!this.allowed_rip(msg)) {
      room.chat("No rips for you!");
      return true;
    }
    return this.rip(room, msg, remainder, null, "-xf", "bestaudio");
  }

  handle_opus(room, remainder, msg) {
    if (!this.allowed_rip(msg)) {
      room.chat("No rips for you!");
      return true;
    }
    return this.rip(room, msg, remainder, this.toopus, "-xf", "bestaudio");
  }

  run_process(...args) {
    const spawnopts = {
      env: null,
      stdio: ["ignore", "pipe", "inherit"],
    };
    console.log(args.map(e => `'${e}'`).join(" "));
    const proc = spawn("/usr/bin/env", args, spawnopts);
    const buf = [];
    return new Promise((resolve, reject) => {
      proc.stdout.on("data", data => buf.push(data));
      proc.on("close", code => {
        if (code) {
          const ex = new Error(`Process Exit: ${code}`);
          ex.data = buf.join("");
          reject(ex);
        }
        resolve(buf.join(""));
      });
      proc.on("error", reject);
    });
  }

  async toopus(name, file) {
    const nn = path.parse(name);
    if (nn.ext === ".opus") {
      return [name, file];
    }
    nn.ext = ".opus";
    delete nn.base;
    const fn = path.format(nn);
    const opus = `${file}.opus`;
    console.error(await this.run_process(
      "ffmpeg", "-loglevel", "error",
      "-i", file,
      "-map", "a:0", "-c", "libopus",
      "-f", "opus",
      opus));
    return [fn, opus];
  }

  async rip(room, msg, remainder, cb, ...options) {
    remainder = remainder.trim();
    const [url, ...namepieces] = remainder.split(/\s+/);
    let name = namepieces.map(e => e.trim()).filter(e => e).join(" ").trim();
    if (msg.lnick === "dad") {
      name = name.replace(/realdolos/gi, "dad");
      name = name.replace(/dolos/gi, "dad");
      name = name.replace(/ｒｅａｌｄｏｌｏｓ/gi, "ⓓⓐⓓ");
      name = name.replace(/ⓡⓔⓐⓛⓓⓞⓛⓞⓢ/gi, "ⓓⓐⓓ");
      name = name.replace("rｅａｌdｏlｏｓ", "dad from Liverpool");
      name = name.replace("ʳᵉᵃˡᵈᵒˡᵒˢ", "dad from Liverpool");
    }
    else if (msg.lnick === "lain") {
      name = name.replace(/realdolos/gi, "lain");
      name = name.replace(/dolos/gi, "lain");
      name = name.replace(/ｒｅａｌｄｏｌｏｓ/gi, "lain");
      name = name.replace(/ⓡⓔⓐⓛⓓⓞⓛⓞⓢ/gi, "lain");
    }
    if (!url) {
      room.chat(`>No URL\n${msg.nick}, pls`);
      return true;
    }
    if (this.source) {
      options.unshift(`--source-address=${this.source}`);
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
          "youtube-dl", "--ignore-config", "-o", `${tmp}`, "-c", "--no-part",
          ...options, url));
      }
      catch (ex) {
        console.error(await this.run_process(
          "youtube-dl", "--ignore-config", "-o", `${tmp}.%(ext)s`, "-c", "--no-part",
          ...options, url));
      }
      const cands = await glob(`${tmp}*`);
      if (!cands.length) {
        throw new Error("No files");
      }
      files.push(...cands);
      const [cand] = cands;
      const {ext} = path.parse(cand);
      let nn = path.parse(fn);
      if (ext) {
        nn.ext = ext;
      }
      delete nn.base;
      nn = path.format(nn);
      const [finalName, finalFile] = cb ? (await cb(nn, cand)) : [nn, cand];
      if (finalFile !== cand) {
        files.push(finalFile);
      }
      const {id: fid} = await room.uploadAs(msg.nick, {
        file: finalFile,
        name: finalName
      });
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
