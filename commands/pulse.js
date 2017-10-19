"use strict";

const {PulseCommand} = require("./command");

class Pulsor extends PulseCommand {
  get interval() {
    return 55 * 1000;
  }

  pulse() {
    console.info("Alive!".bold);
  }
}

module.exports = (handler, options) => {
  handler.registerPulseCommand(new Pulsor(options));
};
