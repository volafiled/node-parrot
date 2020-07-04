"use strict";

const moment = require("moment");
const {URLInfo, decodeHTML, request} = require("./urlinfo");
const {ChatCommand} = require("./command");
const sanitizeHTML = require("sanitize-html");

function sanitize(str, times) {
  return decodeHTML(sanitizeHTML(str, {
    allowedAttributes: [],
    allowedTags: ["br"]
  }).replace(/<br.*?>/g, " "), times);
}

class Youtube extends URLInfo {
  constructor(...args) {
    super(...args);
    this.needle = /^https?:\/\/(?:www\.)?(?:youtu\.be\/\S+|youtube\.com\/(?:v|watch|embed)\S+)/;
    this.title = /itemprop="name"\s+content="((?:.|[\r\n])+?)"/;
    this.duration = /itemprop="duration"\s+content="((?:.|[\r\n])+?)"/;
  }

  async onurl(room, url) {
    console.debug(url);
    const data = await this.extract(
      {
        url,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
        }
      }, this.title, this.duration);
    let [, title, duration] = data;
    if (!title) {
      console.error("no title for", url);
      console.error(data);
      return false;
    }
    [, title] = title;
    title = decodeHTML(title);
    duration = duration && duration[1];
    if (duration) {
      duration = moment.duration(duration);
      room.chat(`Youtube: ${title} (${duration.format()})`);
    }
    else {
      room.chat(`Youtube: ${title}`);
    }
    return true;
  }
}

class Twitter extends URLInfo {
  constructor(...args) {
    super(...args);
    this.needle = /https:\/\/twitter\.com\/(?:.*)\/status\/\d+/;
    this.images = /property="og:image"\s+content="((?:.|[\r\n])*?)"/g;
    this.videos = /property="og:video:url"\s+content="((?:.|[\r\n])*?)"/g;
    this.title = /property="og:title"\s+content="((?:.|[\r\n])*?)"/;
    this.desc = /property="og:description"\s+content="((?:.|[\r\n])*?)"/;
    this.tco = /https?:\/\/t\.co\/[a-zA-Z0-9_-]+/g;
  }

  async onurl(room, url) {
    let [text, title, desc] = await this.extract({
        url,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
        }
      }, this.title, this.desc);

   if (!title || !desc) {
      return false;
    }
    [title, desc] = [decodeHTML(title[1], 2), decodeHTML(desc[1], 2)];
    title = title.replace(/on Twitter/, "").trim();
    desc = desc.substr(1, desc.length - 2).trim();
    desc = desc.replace(this.tco, "").trim();
    let img;
    const images = [];
    while ((img = this.images.exec(text))) {
      [, img] = img;
      if (img && !img.includes("profile_images") && !img.includes("tw_video_thumb")) {
        images.push(decodeHTML(img));
      }
    }
    const videos = [];
    while ((img = this.videos.exec(text))) {
      [, img] = img;
      if (img) {
        try {
          const u = new URL(decodeHTML(img));
          u.searchParams.delete("embed");
          u.searchParams.delete("embed_source");
          videos.push(u.toString());
        }
        catch (ex) {
          // ignored
        }
      }
    }
    text = null;
    if (videos.length) {
      room.chat(`${title}:\n${desc}\n${videos.join(" ")}`);
    }
    else if (images.length) {
      room.chat(`${title}:\n${desc}\n${images.join(" ")}`);
    }
    else {
      room.chat(`${title}:\n${desc}`);
    }
    return true;
  }
}

class Vimeo extends URLInfo {
  constructor(...args) {
    super(...args);
    this.needle = /^https?:\/\/vimeo.com\/\d+/;
    this.desc = /property="og:title"\s+content="((?:.|[\r\n])+?)"/;
  }

  async onurl(room, url) {
    const [, desc] = await this.extract(url, this.desc);
    if (!desc) {
      return false;
    }
    room.chat(`Vimeo: ${decodeHTML(desc[1])}`);
    return true;
  }
}

class LiveLeak extends URLInfo {
  constructor(...args) {
    super(...args);
    this.needle = /^https?:\/\/(www\.)?liveleak\.com\/view\?i=/;
    this.title = /property="og:title"\s+content="((?:.|[\r\n])+?)"/;
    this.desc = /property="og:description"\s+content="((?:.|[\r\n])+?)"/;
  }

  async onurl(room, url) {
    let [, title, desc] = await this.extract(url, this.title, this.desc);
    if (!title) {
      return false;
    }
    title = decodeHTML(title[1]).replace("LiveLeak.com - ", "");
    if (desc) {
      desc = decodeHTML(desc[1]);
      room.chat(`LiveLeak: ${title}\n${desc}`);
    }
    else {
      room.chat(`LiveLeak: ${title}`);
    }
    return true;
  }
}

class GithubIssues extends URLInfo {
  constructor(...args) {
    super(...args);
    this.needle = /https:\/\/github\.com\/.*?\/(?:issues|pull)\/\d+/;
  }

  async onurl(room, url) {
    const r = await request.json.get(
      url.replace("https://github.com/", "https://api.github.com/repos/").
        replace("/pull/", "/pulls/"));
    const base = `[${r.state}] "${r.title}" by ${r.user.login}`;
    let {body} = r;
    const ml = 295 - base.length;
    if (body.length > ml) {
      body = `${body.substr(0, ml)}…`;
    }
    room.chat(`${base}\n${body}`);
    return true;
  }
}

class FourChin extends URLInfo {
  constructor(options, boards) {
    super(options);
    this.boards = boards;
    this.needle = /^https?:\/\/(?:.+\.)?4chan\.org\/.+?\/thread\/\d+/;
  }

  async onurl(room, url) {
    const m = url.match(/^https?:\/\/(?:.+\.)?4chan\.org\/(.+?)\/thread\/(\d+)/);
    if (!m) {
      return false;
    }
    const board = this.boards.get(m[1]);
    const r = await request.json.get(`https://a.4cdn.org/${m[1]}/thread/${m[2]}.json`);
    const {posts: [first]} = r;
    let title = first.sub || sanitize(first.com || "");
    if (first.filename && first.ext) {
      const img = `https://i.4cdn.org/${m[1]}/${first.tim}${first.ext}`;
      const max = 280 - board.length - img.length;
      if (title.length > max) {
        title = `${title.substr(0, max)}…`;
      }
      room.chat(`🍀 4chan: ${board}\n${title}\n🖼 ${img}`);
    }
    else {
      const max = 280 - board.length;
      if (title.length > max) {
        title = `${title.substr(0, max)}…`;
      }
      room.chat(`🍀 4chan: ${board}\n${title}`);
    }
    return true;
  }
}

class Urban extends ChatCommand {
  get handlers() {
    return "!ud";
  }

  async handle_ud(room, remainder, msg) {
    if (!room.allowed(msg)) {
      return true;
    }
    remainder = remainder.trim().toLowerCase();
    if (!remainder) {
      return true;
    }
    const r = await request.json.get({
      url: "https://api.urbandictionary.com/v0/define",
      qs: { term: remainder }
    });
    if (!r || !r.list || !r.list.length) {
      return true;
    }
    const [def] = r.list;
    if (def.permalink) {
      room.chat(def.permalink);
    }
    if (def.definition) {
      room.chat(def.definition);
    }
    return true;
  }
}

module.exports = async (handler, options) => {
  let {boards} = await request.json.get("https://a.4cdn.org/boards.json");
  boards = new Map(boards.map(e => {
    return [e.board, `/${e.board}/ - ${e.title}`];
  }));
  handler.registerChatCommand(new Youtube(options));
  handler.registerChatCommand(new Twitter(options));
  handler.registerChatCommand(new Vimeo(options));
  handler.registerChatCommand(new GithubIssues(options));
  handler.registerChatCommand(new LiveLeak(options));
  handler.registerChatCommand(new FourChin(options, boards));
  handler.registerChatCommand(new Urban(options));
};
