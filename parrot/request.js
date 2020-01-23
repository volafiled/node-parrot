"use strict";

const request = require("request-promise-native");
const streamrequest = require("request");
const {FileCookieStore} = require("./file-cookie-store");

const store = new FileCookieStore(".cookies.json");
store.load().catch(console.warn);

const OPTS = {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_3) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/49.0.2623.87 Safari/537.36",
  },
  timeout: 20 * 1000,
  strictSSL: true,
  gzip: true,
  jar: request.jar(store),
};

const r = module.exports = request.defaults(OPTS);
const s = streamrequest.defaults(OPTS);
Object.assign(r, {
  json: r.defaults({ json: true }),
  bin: r.defaults({ encoding: null }),
  stream: s,
  streambin: s.defaults({ encoding: null }),
});
