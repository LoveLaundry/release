#!/usr/bin/env node
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { respond } from "./core/ann.js";

const botRoot = fileURLToPath(new URL(".", import.meta.url));
const modelPath = process.env.MODEL_PATH || path.join(botRoot, "model/model.json");
const port = Number(process.env.PORT || 8787);
const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";

const model = JSON.parse(fs.readFileSync(modelPath, "utf8"));

const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function sendJson(response, status, body) {
  response.writeHead(status, {
    ...corsHeaders,
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function readJson(request, maxBytes = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > maxBytes) {
        reject(new Error("Request body too large"));
        request.destroy();
      }
    });
    request.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    request.on("error", reject);
  });
}

const server = http.createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    response.writeHead(204, corsHeaders);
    response.end();
    return;
  }

  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, {
      ok: true,
      model: model.name,
      intents: model.intents.length,
      training: model.training,
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/") {
    sendJson(response, 200, {
      name: "Love Laundry ANN Chat API",
      endpoints: ["GET /health", "POST /chat", "POST /predict"],
    });
    return;
  }

  if (request.method === "POST" && ["/chat", "/predict"].includes(url.pathname)) {
    try {
      const body = await readJson(request);
      const message = String(body.message || "").trim().slice(0, 1000);

      if (!message) {
        sendJson(response, 400, { error: "`message` is required." });
        return;
      }

      const lang = body.lang === "sin" ? "sin" : "en";
      const result = respond(model, message, lang);
      sendJson(response, 200, { ...result, model: model.name });
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : "Bad request" });
    }
    return;
  }

  sendJson(response, 404, { error: "Not found" });
});

server.listen(port, () => {
  console.log(`Love Laundry ANN Chat API listening on http://0.0.0.0:${port}`);
  console.log(`Model: ${modelPath}`);
});
