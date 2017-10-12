"use strict";

const log = require("loglevel");
const {Room, ManyRooms} = require("volapi");
const {Cooldown} = require("./utils");
const {Command} = require("../commands/command");

class CommandHandler {
  constructor(mroom) {
    this.config = mroom.config;
    this.commands = new Map();
    this.generic = new Set();
    this.always = new Set();
    this.files = new Set();
    this.pulses = new Set();
  }

  registerChatCommand(cmd, always) {
    log.debug(cmd.toString());
    if (!(cmd instanceof Command)) {
      throw new Error("Invalid chat command");
    }
    if (always) {
      this.always.add(cmd);
      return;
    }
    if (!("handlers" in cmd)) {
      this.generic.add(cmd);
      return;
    }
    let {handlers = []} = cmd;
    if (!Array.isArray(handlers)) {
      handlers = Array.of(handlers);
    }
    for (const h of handlers) {
      this.commands.set(h, cmd);
    }
  }

  registerFileCommand(cmd) {
    log.debug(cmd.toString());
    if (!(cmd instanceof Command)) {
      throw new Error("Invalid file command");
    }
    this.files.add(cmd);
  }

  registerPulseCommand(cmd) {
    log.debug(cmd.toString());
    if (!(cmd instanceof Command)) {
      throw new Error("Invalid pulse command");
    }
    this.pulses.add(cmd);
  }

  async loadAdditionalCommands(cmds, defaults) {
    for (let def of cmds) {
      if (typeof def === "string") {
        def = {cmd: def};
      }
      const {cmd, options} = def;
      const coptions = Object.assign({log}, defaults, options);
      try {
        await require(cmd)(this, coptions);
      }
      catch (ex) {
        if (!cmd.includes(".")) {
          try {
            await require("../commands/{cmd}")(this, coptions);
            continue;
          }
          catch (iex) {
            // ignored
          }
        }
        throw ex;
      }
    }
  }

  startPulse() {
    Array.from(this.pulses).forEach(cmd => {
      try {
        let interval = cmd.interval | 0;
        interval -= (interval % 100);
        if (!interval) {
          return;
        }
        const iid = setInterval(async() => {
          try {
            let res = cmd.pulse();
            if (res && res.then) {
              res = await res;
            }
            if (res === false) {
              clearInterval(iid);
            }
          }
          catch (ex) {
            log.error("pulse", cmd.toString(), "failed".red, ex);
          }
        }, interval);
      }
      catch (ex) {
        log.debug(".pulse threw", ex);
      }
    });
  }
}

function toLower(arr) {
  return arr.map(e => e.toLowerCase());
}

class BotRoom extends Room {
  constructor(room, nick, options) {
    log.debug("constructor", room, nick, options);
    super(room, nick, options);
    const {botConfig = {}} = options;
    this.botConfig = botConfig;
    log.debug("inited room with config", botConfig);
  }

  get active() {
    return !!this.botConfig.active;
  }

  nonotify(str) {
    return `${str[0]}\u2060${str.substr(1)}`;
  }

  chat(...args) {
    if (!this.active) {
      return;
    }
    super.chat(...args);
  }

  chatNick(msg, maybeNick, text) {
    const nick = (maybeNick && maybeNick.trim()) || msg.nick;
    this.chat(`${nick}: ${text}`);
  }

  allowed(msg) {
    return msg && (!this.botConfig.greenmasterrace || msg.white);
  }

  isAdmin(msg) {
    return msg.user && this.botConfig.admins.some(e => e === msg.lnick);
  }
}

class Runner extends ManyRooms {
  constructor(config) {
    config = Object.assign({active: true}, config, {
      admins: Array.from(new Set(toLower(config.admins || ["RealDolos"]))),
      blacked: Array.from(new Set(toLower(config.blacked || []))),
      obamas: Array.from(new Set(toLower(config.obamas || []))),
    });

    super(config.rooms, config.nick, Object.assign({
      Room: BotRoom,
      botConfig: config
    }, config.options));

    const {passwd = null} = config;
    this.passwd = passwd;
    this.config = config;
    delete this.config.rooms;
    delete this.config.options;
    delete this.config.passwd;

    this.obamas = new Cooldown(10 * 1000);
    this.handler = new CommandHandler(this);
  }

  async run() {
    const {commands = []} = this.config;
    delete this.config.commands;
    await this.handler.loadAdditionalCommands(commands, this.config);

    await super.init(this.passwd);
    this.on("close", (room, reason) => {
      log.info("Room", room.toString().bold, "closed, because", reason.yellow);
    });
    this.on("error", (room, reason) => {
      log.info("Room", room.toString().bold, "errored, because", reason.red);
    });
    this.on("chat", this.onchat.bind(this));
    this.on("file", this.onfile.bind(this));
    this.handler.startPulse();
    await super.connect();

    log.info("Parrot is now running");
    return await super.run();
  }

  async onfile(room, file) {
    log.debug("file", room.toString(), file.toString());
    for (const command of this.handler.files) {
      try {
        let res = command.onfile(room, file);
        if (res && res.then) {
          res = await res;
        }
        if (res === true) {
          return;
        }
      }
      catch (ex) {
        log.error("File handler", command.toString(), "threw", ex);
      }
    }
  }

  async onchat(room, msg) {
    if (msg.self || msg.system) {
      return;
    }
    log.debug("msg", room.toString(), msg.toString());
    msg.lnick = msg.nick.toLowerCase();

    const always = [];
    for (const command of this.handler.always) {
      try {
        always.push(command.handle(room, msg));
      }
      catch (ex) {
        log.error("Always handler", command.toString(), "threw", ex);
      }
    }

    if (this.config.blacked.some(e => msg.lnick.includes(e))) {
      log.info("Ignored message from BLACKED", msg.nick);
      return;
    }
    if (this.config.obamas.some(e => msg.lnick.includes(e))) {
      if (this.obamas.has(msg.lnick)) {
        log.info("Ignored message from OBAMA", msg.nick);
        return;
      }
      this.obamas.set(msg.lnick);
    }

    try {
      const [cmd = "", remainder = ""] = msg.message.split(/\s+(.*)$/);
      if (!cmd) {
        return;
      }

      const specific = this.handler.commands.get(cmd);
      if (specific) {
        try {
          log.debug("calling specific", specific);
          let res = specific.handle(room, cmd, remainder, msg);
          if (res && res.then) {
            res = await res;
          }
          if (res === true) {
            return;
          }
        }
        catch (ex) {
          log.error("CommandHandler", specific.toString(), "threw", ex);
        }
      }

      for (const command of this.handler.generic) {
        try {
          if (!command.handles(room, cmd)) {
            log.debug("command does not handle", cmd);
            continue;
          }
          let res = command.handle(room, cmd, remainder, msg);
          if (res && res.then) {
            res = await res;
          }
          if (res === true) {
            return;
          }
        }
        catch (ex) {
          log.error("Handler", command.toString(), "threw", ex);
        }
      }
    }
    finally {
      try {
        if (always.length) {
          await Promise.all(always);
        }
      }
      catch (ex) {
        log.error("Async always threw", ex);
      }
    }
  }
}

module.exports = { Runner };

