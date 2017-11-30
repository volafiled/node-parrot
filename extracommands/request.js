"use strict";

const {ChatCommand} = require.main.require("./commands/command");
const {Cooldown} = require.main.require("./parrot/utils");

const cooldown = new Cooldown(20 * 60 * 1000, 100);

class Request extends ChatCommand {
  get handlers() {
    return "!request";
  }

  async handle_request(room, remainder, msg) {
    remainder = remainder.trim();
    if (!room.allowed(msg) || !remainder) {
      return false;
    }
    if (!msg.purple && cooldown.has(msg.lnick)) {
      room.chat(`${msg.nick}: calm your tits!`);
      return true;
    }
    try {
      const res = await room.uploadFile({
        name: `[REQUEST] ${remainder} - ${msg.nick}`,
        stream: `${msg.nick} requested this on ${new Date()}\nEverybody ignored it always`
      });
      const file = await room.waitFile(res.id);
      if (!file) {
        throw new Error("no file");
      }
      room.chat(`${msg.nick}: @${file.id}`);
      cooldown.set(msg.lnick);
    }
    catch (ex) {
      console.error("Failed to phrases:", ex);
      room.chat(`I'm afraid I cannot do that, ${msg.nick}!`);
    }
    return true;
  }
}

module.exports = (handler, options) => {
  handler.registerChatCommand(new Request(options));
};
