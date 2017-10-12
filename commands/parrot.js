"use strict";

const {ChatCommand} = require("./command");

const {getDB} = require.main.require("./parrot/db");

class Parrot extends ChatCommand {
  constructor(...args) {
    super(...args);
    this.db = null;
    getDB().then(db => this.db = db).catch(this.log.error);
  }

  handles(room, cmd) {
    if (!this.db) {
      return false;
    }
    return cmd.startsWith("!");
  }

  async handle(room, cmd, remainder, msg) {
    if (!room.allowed(msg)) {
      return false;
    }
    try {
      const lookup = cmd.substr(1).toLowerCase();
      const phrase = await this.db.get(
        "SELECT text FROM phrases WHERE phrase = ?",
        lookup);
      if (phrase && phrase.text) {
        room.chatNick(msg, remainder, phrase.text);
        return true;
      }
    }
    catch (ex) {
      this.log.error(ex);
    }
    return false;
  }
}

class ParrotCommands extends ChatCommand {
  constructor(...args) {
    super(...args);
    this.db = null;
    getDB().then(db => this.db = db).catch(this.log.error);
    this.present = new Map();
    this.phrasing = false;
  }

  get handlers() {
    return ["!define", "!phrases", "!who", "!undef", "!lock", "!unlock"];
  }

  check(room, msg) {
    if (!room.isAdmin(msg)) {
      room.chat(`${msg.nick}: You need mad cuck powers to do this`);
      return false;
    }
    return true;
  }

  async handle_define(room, remainder, msg) {
    if (!room.allowed(msg)) {
      return false;
    }
    let [lookup, text = ""] = remainder.split(/\s+(.*)$/);
    lookup = lookup.trim();
    text = text.trim();
    if (!lookup || lookup.length < 4 || !remainder) {
      room.post(`${msg.nick}: Your dick is too small!`);
      return true;
    }
    try {
      const phrase = await this.db.get(
        "SELECT text FROM phrases WHERE phrase = ?",
        lookup);
      if ((!phrase || phrase.locked) && !this.check(room, msg)) {
        return true;
      }
      await this.db.run(
        "INSERT OR REPLACE INTO phrases VALUES (?, ?, ?, ?)",
        lookup.toLowerCase(),
        text,
        room.isAdmin(msg) ? 1 : 0,
        msg.nick
      );
      room.chat("KUK");
      this.present.clear();
    }
    catch (ex) {
      this.log.error("Failed to define:", remainder, ex);
      room.chat(`I'm afraid I cannot do that, ${msg.nick}!`);
    }
    return true;
  }

  async handle_who(room, remainder, msg) {
    if (!room.allowed(msg)) {
      return false;
    }
    const [lookup] = remainder.split(/\s+(.*)$/);
    if (!lookup) {
      room.post(`${msg.nick}: Your dick is too small!`);
      return true;
    }
    try {
      const phrase = await this.db.get(
        "SELECT phrase, owner FROM phrases WHERE phrase = ?",
        lookup.toLowerCase());
      room.chat(`${msg.nick}: ${phrase.phrase} was defined by the cuck ${phrase.owner}`);
    }
    catch (ex) {
      this.log.error("Failed to who:", remainder, ex);
      room.chat(`I'm afraid I cannot do that, ${msg.nick}!`);
    }
    return true;
  }

  async lock(room, remainder, msg, lock) {
    if (!this.check(room, msg)) {
      return true;
    }
    const [lookup] = remainder.split(/\s+(.*)$/);
    try {
      await this.db.run(
        "UPDATE phrases SET locked = ? WHERE phrase = ?",
        lock,
        lookup.toLowerCase()
      );
      room.chat("KUK");
    }
    catch (ex) {
      this.log.error("Failed to change lock:", remainder, ex);
      room.chat(`I'm afraid I cannot do that, ${msg.nick}!`);
    }
    return true;
  }

  handle_unlock(room, remainder, msg) {
    return this.lock(room, remainder, msg, 0);
  }

  handle_lock(room, remainder, msg) {
    return this.lock(room, remainder, msg, 0);
  }

  async handle_undef(room, remainder, msg) {
    if (!this.check(room, msg)) {
      return true;
    }
    const [lookup] = remainder.split(/\s+(.*)$/);
    try {
      await this.db.run(
        "DELETE FROM phrases WHERE phrase = ?",
        lookup.toLowerCase()
      );
      room.chat("KUK");
      this.present.clear();
    }
    catch (ex) {
      this.log.error("Failed to undef:", remainder, ex);
      room.chat(`I'm afraid I cannot do that, ${msg.nick}!`);
    }
    return true;
  }

  async handle_phrases(room, remainder, msg) {
    if (!room.allowed(msg) || this.phrasing) {
      return false;
    }
    this.phrasing = true;
    try {
      let fid = this.present.get(room.id);
      let file = room.getFile(fid);
      if (!file) {
        const phrases = (await this.db.all(
          "SELECT phrase, text FROM phrases ORDER BY phrase")).map(e => {
          return `${e.phrase}|${e.text}`;
        }).join("\r\n");
        const res = await room.uploadFile("phrases.txt", {stream: phrases});
        if (!res && !res.id) {
          throw new Error("no file.id");
        }
        fid = res.id;
        file = await room.waitFile(fid);
      }
      if (!file) {
        throw new Error("no file");
      }
      room.chat(`${msg.nick}: @${fid}`);
      this.present.set(room.id, fid);
    }
    catch (ex) {
      this.log.error("Failed to phrases:", ex);
      room.chat(`I'm afraid I cannot do that, ${msg.nick}!`);
    }
    finally {
      this.phrasing = false;
    }
    return true;
  }
}

module.exports = (handler, options) => {
  handler.registerChatCommand(new Parrot(options));
  handler.registerChatCommand(new ParrotCommands(options));
};
