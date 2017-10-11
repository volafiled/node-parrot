"use strict";

const sqlite = require("sqlite");

let _db;
async function getDBInternal() {
  const db = await sqlite.open("phrases2.db", {Promise});
  await Promise.all([
    db.run(`CREATE TABLE IF NOT EXISTS phrases (
               phrase TEXT PRIMARY KEY,
               text TEXT,
               locked INT,
               owner TEXT
            )`),
    db.run(`CREATE TABLE IF NOT EXISTS files (
               phrase TEXT PRIMARY KEY,
               id TEXT,
               name TEXT,
               locked INT,
               owner TEXT
              )`),
    db.run(`CREATE TABLE IF NOT EXISTS rooms (
               room TEXT PRIMARY KEY,
               title TEXT,
               users INT,
               files INT,
               alive INT DEFAULT 1,
               firstadded INT DEFAULT 0
              )`),
  ]);
  return db;
}

function getDB() {
  if (_db) {
    return _db;
  }
  return _db = getDBInternal();
}

module.exports = { getDB };
