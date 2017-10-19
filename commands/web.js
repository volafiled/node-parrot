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
    let [, title, duration] = await this.extract(
      url, this.title, this.duration);
    if (!title) {
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
    this.title = /property="og:title"\s+content="((?:.|[\r\n])*?)"/;
    this.desc = /property="og:description"\s+content="((?:.|[\r\n])*?)"/;
  }

  async onurl(room, url) {
    let [text, title, desc] = await this.extract(
      url, this.title, this.desc);
    if (!title || !desc) {
      return false;
    }
    [title, desc] = [decodeHTML(title[1], 2), decodeHTML(desc[1], 2)];
    desc = desc.substr(1, desc.length - 2);
    let img;
    const images = [];
    while ((img = this.images.exec(text))) {
      [, img] = img;
      if (img && !img.includes("profile_images")) {
        images.push(decodeHTML(img));
      }
    }
    text = null;
    if (images.length) {
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
};
