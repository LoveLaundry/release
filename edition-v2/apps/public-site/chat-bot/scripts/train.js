#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { trainModel } from "../core/ann.js";

const botRoot = fileURLToPath(new URL("..", import.meta.url));
const siteRoot = path.resolve(botRoot, "..");

function parseArgs(argv) {
  const args = {
    data: path.join(botRoot, "data/intents.json"),
    out: path.join(botRoot, "model/model.json"),
    publicOut: path.join(siteRoot, "public/bot-model.json"),
    epochs: 250,
    lr: 0.008,
    batchSize: 24,
    hidden: [128, 64],
    minDocFreq: 2,
    maxFeatures: 3000,
    minConfidence: 0.34,
    l2: 0.0002,
    select: "best",
    seed: 42,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key.startsWith("--") || value === undefined) continue;

    switch (key) {
      case "--data": args.data = path.resolve(value); break;
      case "--out": args.out = path.resolve(value); break;
      case "--public-out": args.publicOut = path.resolve(value); break;
      case "--epochs": args.epochs = Number(value); break;
      case "--lr": args.lr = Number(value); break;
      case "--batch-size": args.batchSize = Number(value); break;
      case "--hidden": args.hidden = value.split(",").map(Number).filter(Boolean); break;
      case "--min-df": args.minDocFreq = Number(value); break;
      case "--max-features": args.maxFeatures = Number(value); break;
      case "--min-confidence": args.minConfidence = Number(value); break;
      case "--l2": args.l2 = Number(value); break;
      case "--select": args.select = value; break;
      case "--seed": args.seed = Number(value); break;
      default: break;
    }
    i += 1;
  }

  return args;
}

const args = parseArgs(process.argv.slice(2));

if (!Number.isFinite(args.epochs) || args.epochs <= 0) throw new Error("--epochs must be positive");
if (!Number.isFinite(args.lr) || args.lr <= 0) throw new Error("--lr must be positive");
if (!args.hidden.length) throw new Error("--hidden must be a comma-separated list, e.g. 128,64");
if (!["best", "final"].includes(args.select)) throw new Error("--select must be best or final");

const data = JSON.parse(fs.readFileSync(args.data, "utf8"));
const keywordsPath = path.join(botRoot, "data/keywords.json");
if (fs.existsSync(keywordsPath)) {
  data.keywords = JSON.parse(fs.readFileSync(keywordsPath, "utf8"));
}
const { model, stats } = trainModel(data, {
  epochs: args.epochs,
  learningRate: args.lr,
  batchSize: args.batchSize,
  hidden: args.hidden,
  minDocFreq: args.minDocFreq,
  maxFeatures: args.maxFeatures,
  minConfidence: args.minConfidence,
  l2: args.l2,
  select: args.select,
  seed: args.seed,
});

fs.mkdirSync(path.dirname(args.out), { recursive: true });
fs.mkdirSync(path.dirname(args.publicOut), { recursive: true });
const serialized = JSON.stringify(model);
fs.writeFileSync(args.out, serialized);
fs.writeFileSync(args.publicOut, serialized);

console.log("Training complete");
console.log(`  examples      : ${stats.examples}`);
console.log(`  intents       : ${stats.intents}`);
console.log(`  features      : ${stats.features}`);
console.log(`  hidden        : ${args.hidden.join(" x ")}`);
console.log(`  epochs        : ${args.epochs}`);
console.log(`  l2            : ${args.l2}`);
console.log(`  test accuracy : ${(stats.testAccuracy * 100).toFixed(1)}%`);
console.log(`  model         : ${args.out}`);
console.log(`  browser copy  : ${args.publicOut}`);
