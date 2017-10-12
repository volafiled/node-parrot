"use strict";

const DEFAULTS = [
  "admin",
  "chen",
  "parrot",
  "pulse",
  "tard",
  "collector",
  "web",
  "info",
];

module.exports = function(handler, options) {
  options.log.info(options);
  for (const d of DEFAULTS) {
    require(`./${d}`)(handler, options);
  }
};
