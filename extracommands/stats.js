"use strict";

const {ChatCommand} = require.main.require("./commands/command");
const {PromisePool} = require.main.require("./parrot/pool");

function makeNumberFormatter(fracDigits) {
  const rv = new Intl.NumberFormat(undefined, {
        style: "decimal",
        useGrouping: false,
        minimumFractionDigits: fracDigits,
        maximumFractionDigits: fracDigits
      });
  return rv.format.bind(rv);
}

const fmt0 = makeNumberFormatter(0);
const fmt1 = makeNumberFormatter(1);
const fmt2 = makeNumberFormatter(2);
const fmt3 = makeNumberFormatter(3);

const SIZE_UNITS = [
    ["B", fmt0],
    ["KiB", fmt1],
    ["MiB", fmt2],
    ["GiB", fmt2],
    ["TiB", fmt3],
    ["PiB", fmt3],
];
const SIZE_NUINITS = SIZE_UNITS.length;
const SIZE_SCALE = 875;
const SIZE_KILO = 1024;

function formatSize(size, fractions = true) {
  const neg = size < 0;
  size = Math.abs(size);
  let i = 0;
  while (size > SIZE_SCALE && ++i < SIZE_NUINITS) {
    size /= SIZE_KILO;
  }
  if (neg) {
    size = -size;
  }
  const [unit, fmt] = SIZE_UNITS[i];
  return `${fractions ? fmt(size) : fmt0(size)} ${unit}`;
}

class Datapoint {
  constructor(metric) {
    this.metric = metric;
    this.values = [];
  }

  push(value) {
    this.values.push(value);
  }

  get total() {
    return this.values.reduce((p, c) => p + c, 0);
  }

  get avg() {
    const {length} = this.values;
    return length ? this.total / length : 0;
  }
}

class Datamap extends Map {
  set(metric, value) {
    let lm = metric.toLowerCase();
    let v = super.get(lm);
    if (!v) {
      super.set(lm, v = new Datapoint(metric));
    }
    v.push(value);
  }

  get total() {
    return Array.from(this.values()).reduce((p, c) => p + c.total, 0);
  }

  get length() {
    return Array.from(this.values()).reduce((p, c) => p + c.values.length, 0);
  }

  get avg() {
    const {size} = this;
    return size ? this.total / size : 0;
  }

  toString(maxlen=290) {
    if (!this.size) {
      return "I am looking into the eternal void of emptiness";
    }
    let rv = [`${formatSize(this.total)} in ${fmt0(this.length)} files`];
    let clen = rv[0].length;
    let idx = 1;
    const values = Array.from(this.values());
    values.sort((a, b) => a.total - b.total);
    for (let p of values) {
      const m = `#${idx++} ${p.metric}: ${formatSize(p.total)} (${fmt0(p.values.length)}, Ø${formatSize(p.avg)})`;
      const alen = (rv.length) * 2 + clen + m.length;
      if (alen > maxlen) {
        break;
      }
      rv.push(m);
      clen += m.length;
    }
    return rv.join(", ");
  }
}

class StatsCommand extends ChatCommand {
  constructor(...args) {
    super(...args);
  }

  get handlers() {
    return ["!roomstats", ".roomstats", "!typestats", ".typestats"];
  }

  handle_roomstats(room, remainder, msg) {
    if (!room.allowed(msg)) {
      return false;
    }

    const mapped = new Datamap();
    for (const file of room.files) {
      if (file.white) {
        mapped.set("WHITE", file.size);
      }
      else {
        mapped.set(file.uploader, file.size);
      }
    }
    room.chat(mapped.toString());
    return true;
  }

  handle_typestats(room, remainder, msg) {
    if (!room.allowed(msg)) {
      return false;
    }

    const mapped = new Datamap();
    for (const file of room.files) {
      if (!file.type) {
        mapped.set("file", file.size);
      }
      else {
        mapped.set(file.type, file.size);
      }
    }
    room.chat(mapped.toString());
    return true;
  }
}

module.exports = (handler, options) => {
  handler.registerChatCommand(new StatsCommand(options));
};
