"use strict";

const {ChatCommand} = require("./command");

const {LRU} = require.main.require("./parrot/utils");

class BLACKED extends ChatCommand {
  get handlers() {
    return ["!niggers", "!obamas", "!BLACKED"];
  }

  handle_BLACKED(...args) {
    return this.handle_niggers(...args);
  }

  handle_niggers(room, remainder, msg) {
    if (!room.allowed(msg)) {
      return true;
    }
    room.chatNick(msg, remainder, `The following black gentleman cannot use this bot:\n${this.options.blacked.join(", ")}`);
    return true;
  }

  handle_obamas(room, remainder, msg) {
    if (!room.allowed(msg)) {
      return true;
    }
    room.chatNick(msg, remainder, `The following mixed gentleman use this bot not that often:\n${this.options.obamas.join(", ")}`);
    return true;
  }
}

const MODS = new LRU(20);

class CheckMod extends ChatCommand {
  get handlers() {
    return [":check"];
  }

  async handle_check(room, remainder, msg) {
    /* eslint-disable no-fallthrough */
    if (!room.allowed(msg)) {
      return true;
    }
    const mod = (remainder.trim() || "MercWMouth").toLowerCase();
    let res = MODS.get(mod);
    if (!res || res.date + 30 * 1000 < Date.now()) {
      res = await room.callREST("getUserInfo", {name: mod});
      res.date = Date.now();
      MODS.set(mod, res);
    }
    if (res.admin) {
      switch (mod) {
      case "mercwmouth":

      case "kalyx":
        room.chat(`Yes, unfortunately the fag ${res.name} is still a ((moderator))`);
        break;

      case "thejidf":
        room.chat(`Yes, the lying cheap pussy jew ${res.name} is still a ((moderator))`);
        break;

      case "liquid":
        room.chat("Hell froze over!");
        break;

      case "ptc":
        room.chat("Sweet jewprince is well and alive, unlike Y!erizon");
        break;


      default:
        room.chat(`Yes, ${res.name} is still a moderator`);
        break;
      }
    }
    else if (res.staff) {
      switch (mod) {
      case "mercwmouth":

      case "kalyx":
        room.chat(`Yes, unfortunately the fag ${res.name} is still a maginally ((trusted)) user`);
        break;

      case "liquid":
        room.chat("Trusted cuck supreme!");
        break;

      case "auxo":
        room.chat("((Trusted)) black seribain!");
        break;

      default:
        room.chat(`Yes, ${res.name} is still ((trusted))`);
        break;
      }
    }
    else {
      switch (mod) {
      case "liquid":
        room.chat("Never-Trusted Cuck Supreme!");
        break;

      default:
        if (res.name) {
          room.chat(`${res.name} is not ((trusted)) at all!`);
        }
        break;
      }
    }
    return true;
  }
}

module.exports = (handler, options) => {
  handler.registerChatCommand(new BLACKED(options));
  handler.registerChatCommand(new CheckMod(options));
};
