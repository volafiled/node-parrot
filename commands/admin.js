"use strict";

const {ChatCommand} = require("./command");

class Admin extends ChatCommand {
  get handlers() {
    return [".active", ".ded"];
  }

  handle_active(room, remainder, msg) {
    if (!room.isAdmin(msg)) {
      room.chat(`${msg.nick}: Sodomize yourself`);
      return true;
    }
    if (room.botConfig.active) {
      return true;
    }
    room.botConfig.active = true;
    room.chat("Let the spam commence");
    return true;
  }

  handle_ded(room, remainder, msg) {
    if (!room.isAdmin(msg)) {
      room.chat(`${msg.nick}: Sodomize yourself`);
      return true;
    }
    if (!room.botConfig.active) {
      return true;
    }
    room.chat("Segmentation fault");
    room.botConfig.active = false;
    return true;
  }
}

module.exports = (handler, options) => {
  handler.registerChatCommand(new Admin(options));
};
