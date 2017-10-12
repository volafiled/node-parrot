"use strict";

const request = require("request-promise-native");

const r = module.exports = request.defaults({
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_3) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/49.0.2623.87 Safari/537.36",
  },
  timeout: 20 * 1000,
  strictSSL: true,
  gzip: true,
});
Object.assign(r, {
  json: r.defaults({ json: true }),
  bin: r.defaults({ encoding: null })
});
