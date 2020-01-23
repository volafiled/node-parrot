"use strict";
const {promises: fs} = require("fs");
const {promisify} = require("util");
const {MemoryCookieStore, Cookie, CookieJar, canonicalDomain} = require("tough-cookie");

class FileCookieStore extends MemoryCookieStore {
  constructor(path) {
    if (!path) {
      throw new Error("No path provided");
    }
    super();
    Object.defineProperty(this, "path", {
      value: path
    });
    Object.defineProperty(this, "_saver", {
      value: null,
      writable: true
    });
  }

  putCookie(...args) {
    super.putCookie(...args);
    if (!this._saver) {
      this._saver = setImmediate(() => {
        this._saver = null;
        this.save().catch(console.error);
      });
    }
  }

  async deserializeTxtFile(file) {
    const raw_data = await fs.readFile(file, {encoding: "utf-8"});
    const lines = raw_data.split(/\r\n|\n/);
    const magic = lines[0];

    if (!magic || !/^#(?: Netscape)? HTTP Cookie File/.test(magic)) {
        throw new Error(file + " does not look like a netscape cookies file");
    }

    const put = promisify(this.putCookie.bind(this));

    for (let line of lines) {
      if (/^\s*$/.test(line) || (/^\s*#/.test(line) && !/^#HttpOnly_/.test(line))) {
          continue;
      }

      let httpOnly = false;
      if (/^#HttpOnly_/.test(line)) {
          httpOnly = true;
          line = line.replace(/^#HttpOnly_(.*)/,"$1");
      }

      const parsed = line.split(/\t/);
      if (parsed.length != 7) {
        continue;
      }
      const domain = canonicalDomain(parsed[0]);
      const cookie = new Cookie({
          domain,
          path: parsed[2],
          secure: parsed[3] == 'TRUE' ? true : false,
          expires: parseInt(parsed[4]) ? new Date(parsed[4] * 1000) : 'Infinity',
          key: decodeURIComponent(parsed[5]),
          value: decodeURIComponent(parsed[6]),
          httpOnly,
          hostOnly: !!/^\./.test(domain),
      });
      await put(cookie);
    }
  }

  async load() {
    const cookies = JSON.parse(await fs.readFile(this.path, {encoding: "utf-8"}));
    await promisify(CookieJar.deserialize)({cookies}, this);
  }

  *list() {
    for (const domain of Object.values(this.idx)) {
      for (const path of Object.values(domain)) {
        for (const cookie of Object.values(path)) {
          yield cookie;
        }
      }
    }
  }

  async save() {
    for (const i = 0; i < 10; ++i) {
        const tmp = this.path + "." + Date.now();
      try {
        await fs.writeFile(tmp, JSON.stringify(Array.from(this.list()), undefined, 2), {
          flag: "wx"
        });
        await fs.rename(tmp, this.path);
        return;
      }
      catch (ex) {
        await fs.unlink(tmp).catch(() => {});
        await new Promise(r => setTimeout(r, 10));
      }
    }
    throw new Error("Failed to save");
  }

  toJSON() {
    return this.idx;
  }
}

async function main() {
  const store = new FileCookieStore("../cookies.json");
  await store.load();
  await store.deserializeTxtFile("../cookies.txt");
  console.log("imported!");
}

if (require.main == module) {
  main().catch(console.error);
}

module.exports = {FileCookieStore};
