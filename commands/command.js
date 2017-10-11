"use strict";

class Command {
  constructor(options = {}) {
    this.options = options;
    this.log = options.log;
  }

  get disabled() {
    return !!this.options.disabled;
  }

  toString() {
    const {constructor: {name = "Unknown"}} = this;
    return `<Command(${name})>`;
  }
}

class ChatCommand extends Command {
  handles(room, cmd) {
    room = cmd;
    return false;
  }

  handle(room, cmd, remainder, msg) {
    if (this.aliases) {
      cmd = this.aliases.get(cmd) || cmd;
    }
    cmd = cmd.replace(/^[.!_-]+/, "");
    const scmd = `handle_${cmd}`;
    if (scmd in this) {
      return this[scmd](room, remainder, msg);
    }
    throw new Error("Not implemented");
  }
}

class FileCommand extends Command {
  onfile(room, file) {
    room = file;
    throw new Error("Not implemented");
  }
}

class PulseCommand extends Command {
  get interval() {
    throw new Error("Not implemented");
  }

  pulse() {
    throw new Error("Not implemented");
  }
}

module.exports = { Command, ChatCommand, FileCommand, PulseCommand };
