# TrustCompute

Escrow for digital work between two parties who don't know each other. A seller publishes a job, a buyer locks the payment in a smart contract, and the money is released only when the delivered result is verified.

This repository is also the code for a tutorial series that takes the project from a local demo to a small, low-cost AWS deployment with an AI agent in the verification path.

> **Testnet only.** This is teaching code. It has known security gaps (listed below) and has not been audited. Never use it with real funds.

| | |
| --- | --- |
| Repository | https://github.com/daspapan/trustcompute |
| Live demo (Sepolia) | https://daspapan.github.io/trustcompute/ |
| Backend health | https://trustcompute.onrender.com/api/health (free tier; the first request after a pause can take a minute) |

## Status

| Part | State |
| --- | --- |
| Escrow contract (v1), 11 Hardhat tests | Built |
| Rust verifier (exact hash match), 3 unit tests | Built |
| Express backend with JSON file storage | Built |
| Next.js frontend, static export for GitHub Pages | Built |
| Role-based dashboards (owner, worker, seller, buyer) | Built, not yet tested end to end with live wallets |
| Sepolia deployment, Docker backend, Pages workflow | Built |
| Contract v2 (timeout refund, pull payments, auto IDs, result hash) | Planned, see [docs/LLD.md](docs/LLD.md) |
| AWS serverless backend (Lambda, DynamoDB, SQS, KMS) | Planned, see [docs/HLD.md](docs/HLD.md) |
| AI agent on Amazon Bedrock | Planned, see [docs/MLD.md](docs/MLD.md) |

## How it works today (v1)

```
Seller lists a job  ->  Buyer funds escrow  ->  Result is submitted
        ->  Rust verifier checks the hashes  ->  Worker releases payment
```

1. The seller writes a job spec: title, task and expected output.
2. The frontend hashes it with keccak256 and stores only the hash on-chain (`listVoucher`). The plain text goes to the backend.
3. The buyer pays the exact price into the contract (`purchaseVoucher`).
4. Someone submits the delivered result on the Verify page.
5. The backend runs the Rust verifier, which recomputes the spec hash and compares the result hash with the expected output's hash.
6. If the spec hash also matches the chain, the backend's worker wallet calls `releaseFunds`. Otherwise the money stays locked.

The spec hash is keccak256 of this canonical string:

```
title\ntask\nexpected
```

## Repository layout

```
contracts/   Solidity contract, Hardhat tests, deploy and seed scripts
verifier/    Rust command-line verifier (JSON in, JSON out)
backend/     Express API, calls the verifier and the contract
frontend/    Next.js app (wagmi, RainbowKit), exported as static files
docs/        HLD, MLD and LLD design documents
.github/     Workflow that publishes the frontend to GitHub Pages
```

## Roles

| Role | Who | Can do | Dashboard theme |
| --- | --- | --- | --- |
| Owner | Deployer of the contract | Add or remove workers; release or refund as an override | Light pink |
| Worker | Backend service wallet, or a human reviewer | Release or refund jobs in escrow | Light violet |
| Seller | Any wallet that has listed a job | List and cancel own jobs; receives payment | Light green |
| Buyer | Any other connected wallet | Fund jobs; receives refunds | Light blue |

The frontend reads `owner()` and `authorizedWorkers(address)` to pick the role. Hiding pages is cosmetic; the contract enforces who may call what.

## Quick start (local)

You need Node.js 20, Rust (via rustup) and Git. Use three terminals.

```bash
git clone https://github.com/daspapan/trustcompute.git
cd trustcompute
```

**Terminal 1: local chain**

```bash
cd contracts
npm install
npm test            # 11 passing
npm run node
```

**Terminal 2: deploy, seed, build the verifier**

```bash
cd contracts
BACKEND_WORKER_ADDRESS=0x70997970C51812dc3A010C7d01b50e0d17dc79C8 npm run deploy:local
npx hardhat run scripts/seed-demo.js --network localhost
cd ..
cargo build --release --manifest-path verifier/Cargo.toml
```

The deploy output must include `Authorized backend worker`. The address above is Hardhat's public test Account #1.

**Terminal 3: backend**

```bash
cd backend
npm install
cp .env.example .env     # set BACKEND_PRIVATE_KEY to Hardhat Account #1's key
npm start                # http://localhost:4000
```

**Frontend**

```bash
cd frontend
npm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_CONTRACT_ADDRESS
npm run dev                        # http://localhost:3000
```

In MetaMask add the network `http://127.0.0.1:8545`, chain ID `31337`, and import Hardhat test accounts. Use a browser profile that holds no real wallet.

## Deploying the demo

| Piece | Where | How |
| --- | --- | --- |
| Contract | Sepolia | `npm run deploy:sepolia`, then `npx hardhat verify --network sepolia <address> <owner>` |
| Backend + verifier | Any Docker host (Render free tier works) | `backend/Dockerfile`, built from the repo root |
| Frontend | GitHub Pages | `.github/workflows/pages.yml`, driven by repository variables |

## Configuration

**`contracts/.env`**

| Variable | Meaning |
| --- | --- |
| `SEPOLIA_RPC_URL` | RPC endpoint for Sepolia |
| `DEPLOYER_PRIVATE_KEY` | Owner wallet's private key (test wallet only) |
| `BACKEND_WORKER_ADDRESS` | Worker wallet's address, authorized at deploy |
| `ETHERSCAN_API_KEY` | For source verification |

**`backend/.env`**

| Variable | Meaning |
| --- | --- |
| `RPC_URL` | Chain RPC endpoint |
| `BACKEND_PRIVATE_KEY` | Worker wallet's private key |
| `CONTRACT_ADDRESS` | Optional locally; read from `contracts/deployments/` if empty |
| `PORT` | Defaults to 4000 |
| `VERIFIER_BIN` | Optional path to the verifier binary |

**`frontend/.env.local`** (or GitHub repository variables)

| Variable | Meaning |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Backend base URL, ending in `/api` |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Deployed contract |
| `NEXT_PUBLIC_CHAIN_ID` | `31337` local, `11155111` Sepolia |
| `NEXT_PUBLIC_RPC_URL` | Optional RPC for reads |
| `NEXT_PUBLIC_DEPLOY_BLOCK` | Block the contract was deployed in |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Optional |
| `NEXT_PUBLIC_BASE_PATH` | `/<repo-name>` on GitHub Pages, empty locally |

Never commit a `.env` file or put a private key in a `NEXT_PUBLIC_` variable.

## Backend API (v1)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Liveness check |
| GET | `/api/config` | Contract address and ABI |
| GET | `/api/jobs` | All job specs (stored jobs plus demo jobs) |
| POST | `/api/jobs` | Save a job spec: `jobId`, `title`, `task`, `expected`, optional `price` |
| POST | `/api/verify-delivery` | Check a result: `voucherId`, `status`, `delivered`; releases funds on success |
| GET | `/api/delivery-history/:voucherId?` | Past verification attempts |

## Contract (v1)

![Smart Contract Architecture Diagram](./doc/smart_contract_diagram.png)

`contracts/contracts/EscrowMarketplace.sol`, Solidity 0.8.24, OpenZeppelin `Ownable` and `ReentrancyGuard`.

| Function | Caller | Effect |
| --- | --- | --- |
| `listVoucher(id, price, specHash)` | Anyone | Creates a listing |
| `cancelListing(id)` | Seller | Cancels an unfunded listing |
| `purchaseVoucher(id)` payable | Anyone but the seller | Locks the exact price in escrow |
| `releaseFunds(id)` | Owner or worker | Pays the seller |
| `refundBuyer(id)` | Owner or worker | Returns the payment to the buyer |
| `setWorkerAuthorization(worker, bool)` | Owner | Adds or removes a worker |
| `getVoucher(id)` | Anyone | Reads a listing |

States: `Listed`, `AwaitingDelivery`, `Delivered`, `Cancelled`, `Refunded`.

## Tests

```bash
cd contracts && npm test                               # 11 contract tests
cargo test --manifest-path verifier/Cargo.toml          # 3 verifier tests
```

## Known limitations of v1

These are deliberate teaching material. Each is fixed in the planned v2.

- The verify and job endpoints have no authentication, and `GET /api/jobs` returns the expected output, so anyone can trigger a release.
- The spec hash joins fields with newlines, so two different specs can produce the same hash.
- The worker's private key sits in an environment variable and can move every escrow.
- There is no timeout: if nobody decides a job, the buyer's money stays locked.
- A seller contract that rejects ETH blocks its own payout permanently.
- Job IDs are chosen by the caller and can be taken first by someone else.
- The contract never checks the spec hash or records the result hash.
- Verification accepts exact matches only.
- Storage is a JSON file that is lost when the host restarts.

## Tutorial series

1. The problem and the demo
2. The contract, tested
3. Contract v2: four fixes, each with a failing test first
4. The Rust verifier as an AWS Lambda
5. API and DynamoDB with wallet sign-in
6. Signing payouts with AWS KMS and a queue
7. The AI agent: Bedrock, tools, guardrails and a rule engine
8. Reviewer console and the worker role
9. Events, an indexer and reconciliation
10. One-command deploy, costs and what production adds

## Design documents

- [docs/HLD.md](docs/HLD.md): goals, context, architecture and key decisions
- [docs/MLD.md](docs/MLD.md): components, flows and state machines
- [docs/LLD.md](docs/LLD.md): contract interface, data model, API contracts and algorithms

## Credits

TrustCompute is based on the NodeBridge proof of concept by its original author. The Solidity names (`Voucher`, `seller`, `buyer`) are kept from it. No licence file is included yet; agree one with the original author before reusing this code.