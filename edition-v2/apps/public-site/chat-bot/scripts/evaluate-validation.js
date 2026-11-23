#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { predict, respond } from "../core/ann.js";

const botRoot = fileURLToPath(new URL("..", import.meta.url));
const model = JSON.parse(fs.readFileSync(path.join(botRoot, "model/model.json"), "utf8"));
const fileArg = process.argv.indexOf("--file");
const validationFile = fileArg === -1 ? "data/validation4.json" : process.argv[fileArg + 1];
const cases = JSON.parse(fs.readFileSync(path.resolve(botRoot, validationFile), "utf8"));

// Supports both [{ text, intent }] and { intent: [text] } formats.
const flatCases = Array.isArray(cases)
  ? cases
  : Object.entries(cases).flatMap(([intent, texts]) =>
      texts.map((text) => ({ text, intent })),
    );

let correct = 0;
const misses = [];

flatCases.forEach(({ text, intent }) => {
  const result = respond(model, text, "en");
  if (result.intent === intent) {
    correct += 1;
  } else {
    const raw = predict(model, text);
    misses.push({
      text,
      expected: intent,
      got: result.intent,
      raw: raw.intent,
      confidence: result.confidence,
    });
  }
});

console.log(`Validation accuracy: ${((correct / flatCases.length) * 100).toFixed(1)}% (${correct}/${flatCases.length})`);
if (misses.length) {
  console.log("Misses:");
  misses.forEach((miss) => {
    console.log(`  "${miss.text}" -> ${miss.got} (expected ${miss.expected}, ${miss.confidence})`);
  });
}
