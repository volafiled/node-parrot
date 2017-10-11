"use strict";

const {PulseCommand} = require("./command");

class Pulsor extends PulseCommand {
  get interval() {
    return 10 * 1000;
  }

  pulse() {
    this.log.info("pulsed");
  }
}

class LargePulsor extends PulseCommand {
  get interval() {
    return 55 * 1000;
  }

  pulse() {
    this.log.info("pulsed large");
  }
}

module.exports = (handler, options) => {
  handler.registerPulseCommand(new Pulsor(options));
  handler.registerPulseCommand(new LargePulsor(options));
};
