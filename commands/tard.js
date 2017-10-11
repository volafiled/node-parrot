"use strict";

const {ChatCommand} = require("./command");

const {sleep, randint, shuffle} = require.main.require("./parrot/utils");

const KILL = new Set([
  "counselor",
  "guppylord",
  "liquid",
  "siri",
  "apha"
]);

const BALLS = [
  "It is certain",
  "It is decidedly so",
  "Without a doubt",
  "Yes definitely",
  "You may rely on it",
  "As I see it, yes",
  "Most likely",
  "Outlook good",
  "Yes",
  "Signs point to yes",
  "Reply hazy try again",
  "Ask again later",
  "Better not tell you now",
  "Cannot predict now",
  "Concentrate and ask again",
  "Don't count on it",
  "My reply is no",
  "My sources say no",
  "Outlook not so good",
  "Very doubtful"
];

class Tard extends ChatCommand {
  constructor(...args) {
    super(...args);
    this.aliases = new Map([
      ["!eightball", "!8ball"],
      ["!blueballs", "!8ball"],
      ["!volarette", "!roulette"],
      ["!dice", "!roll"],
      ["!siberia", "!cyberia"],
    ]);
    this.balls = [];
  }

  get handlers() {
    return [
      "!8ball", "!eightball", "!blueballs",
      "!roulette", "!volarette",
      "!dice", "!roll",
      "!siberia", "!cyberia",
    ];
  }

  handle_8ball(room, remainder, msg) {
    if (!room.allowed(msg)) {
      return true;
    }
    if (!remainder.trim()) {
      room.chat(`${msg.nick}: You're a fag!`);
      return true;
    }

    if (/\bmod(?:erator)?\b/i.test(remainder)) {
      room.chat(`${msg.nick}: There is only one moderator, and his name is His Most Nuanced, Most Affaris, Most Lawful, Least Brown, VolaMerc 2.0 of BGO`);
      return true;
    }

    if (/\bLiquid\b/i.test(remainder)) {
      room.chat(`${msg.nick}: Liquid is a cuck!`);
      return true;
    }

    if (!this.balls.length) {
      this.balls.push(...BALLS);
      shuffle(this.balls);
    }
    room.chat(`${msg.nick}: ${this.balls.pop()}`);
    return true;
  }

  handle_roll(room, remainder, msg) {
    if (!room.allowed(msg)) {
      return true;
    }
    let many = 1;
    let sides = 6;
    const match = remainder.trim().match(/^(\d+)(?:d(\d+))$/);
    if (!match && remainder.trim()) {
      return false;
    }
    if (match) {
      many = parseInt(match[1], 10) || many;
      sides = parseInt(match[2], 10) || sides;
    }
    if (!isFinite(sides) || !isFinite(many) ||
      many < 1 || many > 10 || sides <= 1) {
      return false;
    }
    // Not stricktly necessary, but let's actually roll each dice on it's own
    const rolled = new Array(many).fill(0).map(() => randint(1, sides + 1)).
      reduce((a, b) => a + b, 0);
    room.chat(`Rolled ${rolled}`);
    return true;
  }

  async handle_roulette(room, remainder, msg) {
    if (!room.allowed(msg) || !room.active) {
      return true;
    }
    let shoot = randint(1, 7);
    if (KILL.has(msg.lnick)) {
      shoot = 6;
    }
    room.chat("loading...", {me: true});
    await sleep(2000);
    room.chat("spinning...", {me: true});
    await sleep(1000);
    room.chat("cocking...", {me: true});
    await sleep(1000);
    switch (shoot) {
    case 6:
      room.chat(`BANG, ${msg.nick} is dead`);
      return true;

    case 5:
      room.chat(`${msg.nick}, you missed but still managed to hit Counselor.\nCongrats, you killed a pede!`);
      return true;
    default:
      room.chat(`CLICK, ${msg.nick} is still foreveralone`);
      return true;
    }
  }

  handle_cyberia(room, remainder, msg) {
    room.chatNick(msg, remainder,
      "Daniel, also Maksim aka Maxim, also Nigredo, " +
      `free APKs for everybody, ${room.nonotify("kALyX")}'s friend`);
    return true;
  }
}

module.exports = (handler, options) => {
  handler.registerChatCommand(new Tard(options));
};
