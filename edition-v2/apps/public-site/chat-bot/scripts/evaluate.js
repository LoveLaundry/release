#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { predict, respond } from "../core/ann.js";

const botRoot = fileURLToPath(new URL("..", import.meta.url));
const model = JSON.parse(fs.readFileSync(path.join(botRoot, "model/model.json"), "utf8"));
const data = JSON.parse(fs.readFileSync(path.join(botRoot, "data/intents.json"), "utf8"));

const queryIndex = process.argv.indexOf("--query");
if (queryIndex !== -1) {
  const text = process.argv[queryIndex + 1] || "";
  const lang = process.argv[queryIndex + 2] === "sin" ? "sin" : "en";
  console.log(JSON.stringify(respond(model, text, lang), null, 2));
  process.exit(0);
}

let correct = 0;
let total = 0;
const perIntent = new Map();

data.intents.forEach((intent) => {
  intent.examples.forEach((text) => {
    const prediction = predict(model, text);
    const hit = prediction.intent === intent.id;
    if (hit) correct += 1;
    total += 1;
    const entry = perIntent.get(intent.id) || { correct: 0, total: 0 };
    entry.total += 1;
    if (hit) entry.correct += 1;
    perIntent.set(intent.id, entry);
  });
});

console.log(`Overall accuracy: ${((correct / total) * 100).toFixed(1)}% (${correct}/${total})`);
console.log("Lowest intents:");
[...perIntent.entries()]
  .map(([id, value]) => ({ id, accuracy: value.correct / value.total, ...value }))
  .sort((a, b) => a.accuracy - b.accuracy)
  .slice(0, 8)
  .forEach((entry) => {
    console.log(`  ${entry.id.padEnd(20)} ${(entry.accuracy * 100).toFixed(1)}%`);
  });
