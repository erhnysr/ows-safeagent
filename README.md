# OWS SafeAgent

AI trading agent built on Open Wallet Standard. The agent proposes trades, OWS policy engine approves or denies — private key never exposed.

## How it works
- AI analyzes market signals
- OWS policy checks: per-tx limit, daily cap, chain allowlist
- If approved: OWS signs transaction (key stays encrypted)
- If denied: blocked before key is ever touched

## Setup
```bash
curl -fsSL https://openwallet.sh/install.sh | bash
ows wallet create --name safe-agent-wallet
ows key create --name safe-agent-token --wallet safe-agent-wallet
npm install
node server.js
```

Open http://localhost:3000

## Track
Agent Spend Governance & Identity — OWS Hackathon 2026
