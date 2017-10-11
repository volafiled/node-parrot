"use strict";

const {ChatCommand} = require("./command");

const ver = require.main.require("./parrot/version");

const ischen = /^!che+n$/;

class Chen extends ChatCommand {
  handles(room, cmd) {
    return ischen.test(cmd);
  }

  handle(room, cmd, remainder, msg) {
    if (!room.allowed(msg)) {
      return true;
    }
    const repeat = Math.max(1, Math.min(40, cmd.length - 4));
    room.chat(`${msg.nick}: M${"E".repeat(repeat)}RC!`);
    return true;
  }
}

class About extends ChatCommand {
  get handlers() {
    return ["!about"];
  }

  handle_about(room, remainder, msg) {
    if (!room.allowed(msg)) {
      return true;
    }
    room.chatNick(
      msg, remainder,
      `This is ${ver.description} ${ver.version}, watch me fly at ${ver.repository}`);
    return true;
  }
}

module.exports = (handler, options) => {
  handler.registerChatCommand(new Chen(options));
  handler.registerChatCommand(new About(options));
};
