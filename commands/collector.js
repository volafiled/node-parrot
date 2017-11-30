"use strict";

const sqlite = require("sqlite");
const moment = require("moment");
const {ChatCommand} = require("./command");

const {getDB} = require.main.require("./parrot/db");

const TO_LOG = new Map([
  ["mercwmouth", "merc"],
  ["deadpool", "merc"],
  ["red", "red"],
  ["lmmortal", "spencer"],
  ["macauhai", "soggy"],
]);

async function setupDB() {
  const db = await sqlite.open("merc.db", {Promise});
  for (const name of TO_LOG.values()) {
    await db.run(
      `CREATE TABLE IF NOT EXISTS ${name} (ts INT PRIMARY KEY, msg TEXT)`);
  }
  return db;
}

async function setupSeen() {
  const db = await getDB();
  await db.run(
    "CREATE TABLE IF NOT EXISTS seen (user TEXT PRIMARY KEY, time INT)");
  return db;
}

const ALIASES = new Map([
  ["auxo's waifu", "triggu"],
  ["doiosodolos", "Daniel"],
  ["cirno", "Daniel"],
  ["haskell", "Daniel"],
  ["ekecheiria", "Daniel"],
  ["baronbone", "Daniel"],
  ["cyberia", "Daniel"],
  ["countcoccyx", "Daniel"],
  ["doc", "Dongmaster"],
  ["jewmobile", "TheJIDF"],
  ["jew", "TheJIDF"],
  ["thejew", "TheJIDF"],
  ["mrshlomo", "TheJIDF"],
  ["pedo", "Counselor"],
  ["pede", "Counselor"],
  ["briseis", "Counselor"],
  ["notnot", "Counselor"],
  ["counselorpedro", "Counselor"],
  ["marky", "SuperMarky"],
  ["mcgill", "SuperMarky"],
  ["voladolos", "SuperMarky"],
  ["affarisdolos", "RealDolos"],
  ["gnuwin7dolos", "RealDolos"],
  ["cuck", "RealDolos"],
  ["merc", "MercWMouth"],
  ["cunt", "MercWMouth"],
  ["kak", "MercWMouth"],
  ["dolosodolos", "MODChatBotGladio"],
  ["fakedolos", "kreg"],
  ["laindolos", "kreg"],
  ["fakekreg", "kreg"],
  ["DaVinci", "Ian"],
  ["CuckDolos", "Ian"],
  ["DolosCuck", "Ian"],
  ["apha", "Polish plebbit pedo"],
  ["siri", "Polish plebbit pedo"],
  ["wombatfucker", "NEPTVola"],
  ["fuhrer", "Lain"],
  ["terrorist", "bain"],
  ["a terrorist", "bain"],
  ["rapist", "bain"],
  ["a rapist", "bain"],
]);

class Collector extends ChatCommand {
  constructor(options, db, seen) {
    super(options);
    this.db = db;
    this.seen = seen;
  }

  async handle(room, msg) {
    if (!msg.white) {
      const db = TO_LOG.get(msg.lnick);
      if (db) {
        await this.db.run(
          `INSERT INTO ${db} VALUES(?, ?)`,
          Date.now(), msg.message.trim());
        console.debug("logged to", db);
      }
    }
    const corrected = ALIASES.get(msg.lnick) || msg.lnick;
    const add = [corrected];
    if (msg.purple) {
      add.push(`@${corrected}`);
    }
    if (msg.user) {
      add.push(`+${corrected}`);
    }
    const now = Date.now();
    await Promise.all(add.map(e => this.seen.run(
      "INSERT OR REPLACE INTO seen VALUES(?, ?)",
      e, now)));
  }
}

class Seen extends ChatCommand {
  constructor(options, seen) {
    super(options);
    this.seen = seen;
  }

  get handlers() {
    return "!seen";
  }

  async handle_seen(room, remainder, msg) {
    if (!room.allowed(msg)) {
      return true;
    }
    remainder = remainder.trim();
    const corrected = remainder.toLowerCase();
    const alias = ALIASES.get(corrected);
    const nick = (alias && alias.toLowerCase()) || corrected;
    if (corrected === "lain" || corrected === "+lain") {
      room.chat(`${remainder} was never here, will never come here, and does not care about volafile at all!\nPlease donate!!!`);
      return true;
    }
    try {
      let ts = await this.seen.get(
        "SELECT time FROM seen WHERE user = ?",
        nick);
      if (!ts) {
        ts = await this.seen.get("SELECT time FROM seen WHERE user = ?",
          remainder);
      }
      let add = "";
      switch (nick) {
      case "liquid":
        add = "\nHe is still not a mod tho!";
        break;

      case "auxo":
        add = "\nHe is still a black seribain cuck!";
        break;
      default:
        break;
      }

      if (ts) {
        room.chat(`${alias || remainder} was last seen ${moment(ts.time).fromNow()}${add}`);
      }
      else {
        room.chat(`${alias || remainder} was never seen!`);
      }
    }
    catch (ex) {
      console.error("Failed to fetch seen", ex);
    }
    return true;
  }
}

class Redard extends ChatCommand {
  constructor(options, db) {
    super(options);
    this.db = db;
  }

  handles() {
    return true;
  }

  async handle(room, cmd, remainder, msg) {
    if (!room.allowed(msg)) {
      return false;
    }
    if (!/\bredard(ed)?\b/i.test(msg.message)) {
      return false;
    }
    const res = await this.db.get(
      "SELECT msg FROM red ORDER BY RANDOM() LIMIT 1");
    if (!res) {
      return false;
    }
    room.chat(`>Red: ${res.msg}`, {me: true});
    return true;
  }
}

module.exports = async (handler, options) => {
  const db = await setupDB();
  const seen = await setupSeen();
  handler.registerChatCommand(new Collector(options, db, seen), true);
  handler.registerChatCommand(new Seen(options, seen));
  handler.registerChatCommand(new Redard(options, db));
};
