const express = require("express");
const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;
app.use(express.json());
app.use(express.static("ui"));

const LOG_FILE = path.join(__dirname, "agent-log.json");
let config = { maxPerTxEth: 0.05, maxDailyEth: 0.1 };

const SIGNALS = [
  { asset: "ETH", direction: "BUY", confidence: 78, reason: "RSI oversold at 28, MACD bullish crossover", amount: 0.02 },
  { asset: "ETH", direction: "BUY", confidence: 91, reason: "Strong support at $2,800, volume spike", amount: 0.08 },
  { asset: "ETH", direction: "SELL", confidence: 65, reason: "Resistance at $3,200, overbought RSI", amount: 0.03 },
  { asset: "ETH", direction: "BUY", confidence: 55, reason: "Moderate bullish sentiment", amount: 0.004 },
  { asset: "ETH", direction: "BUY", confidence: 83, reason: "EMA golden cross, high volume", amount: 0.06 },
];

function getLog() {
  if (!fs.existsSync(LOG_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(LOG_FILE, "utf-8")); } catch { return []; }
}

function getDailySpent() {
  const today = new Date().toISOString().split("T")[0];
  return getLog().filter(d => d.timestamp.startsWith(today) && d.status === "APPROVED").reduce((s, d) => s + d.signal.amount, 0);
}

function evaluatePolicy(signal) {
  if (signal.amount > config.maxPerTxEth) return { allow: false, reason: `Per-tx limit: ${signal.amount} ETH > ${config.maxPerTxEth} ETH max` };
  const spent = getDailySpent();
  if (spent + signal.amount > config.maxDailyEth) return { allow: false, reason: `Daily limit: ${spent.toFixed(3)} + ${signal.amount} ETH > ${config.maxDailyEth} ETH cap` };
  return { allow: true, reason: `OK. Daily remaining: ${(config.maxDailyEth - spent - signal.amount).toFixed(4)} ETH` };
}

app.post("/api/agent/run", (req, res) => {
  const signal = SIGNALS[Math.floor(Math.random() * SIGNALS.length)];
  const policy = evaluatePolicy(signal);
  const status = policy.allow ? "APPROVED" : "DENIED";
  const txHash = status === "APPROVED" ? "0x" + Array.from({length:32},()=>Math.floor(Math.random()*256).toString(16).padStart(2,"0")).join("") : null;
  const decision = { timestamp: new Date().toISOString(), signal, policyResult: policy, txHash, status };
  const log = getLog(); log.push(decision); fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
  res.json(decision);
});

app.get("/api/state", (req, res) => {
  const log = getLog();
  const today = new Date().toISOString().split("T")[0];
  const todayLog = log.filter(d => d.timestamp.startsWith(today));
  res.json({ dailySpent: getDailySpent(), approved: todayLog.filter(d=>d.status==="APPROVED").length, denied: todayLog.filter(d=>d.status==="DENIED").length, log: log.slice(-50).reverse(), config });
});

app.patch("/api/config", (req, res) => {
  if (req.body.maxPerTxEth) config.maxPerTxEth = parseFloat(req.body.maxPerTxEth);
  if (req.body.maxDailyEth) config.maxDailyEth = parseFloat(req.body.maxDailyEth);
  res.json({ ok: true, config });
});

app.delete("/api/log", (req, res) => { fs.writeFileSync(LOG_FILE, "[]"); res.json({ ok: true }); });

app.listen(PORT, () => console.log(`OWS SafeAgent running at http://localhost:${PORT}`));
