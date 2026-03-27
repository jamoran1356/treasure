# 🌐 Programmable Treasury - Frontend

Next.js dashboard para gestionar automated treasury rules en Solana.

---

## 🚀 Quick Start

```powershell
# Instalar dependencias
pnpm install

# Iniciar development server
pnpm dev

# Abrir browser
# http://localhost:3000
```

---

## 📋 Features

### ✅ Implemented (MVP)
- **Wallet Integration:** Phantom, Solflare support
- **Dashboard:** TVL, active rules, portfolio breakdown
- **Rule Management:** Create, view, enable/disable rules
- **Rule Execution:** Manual trigger (mock for now)
- **Execution History:** View past rule executions
- **Compliance Display:** KYT status indicators

### 🔜 Coming Soon (Post-Hackathon)
- Real smart contract integration
- Oracle price feeds (Pyth)
- Real-time rule execution
- Transaction signing
- Multi-signature support

---

## 🛠️ Tech Stack

- **Framework:** Next.js 14 (App Router ready)
- **Styling:** TailwindCSS
- **Blockchain:** Solana Web3.js
- **Wallet:** @solana/wallet-adapter-react
- **Language:** TypeScript

---

## 📦 Project Structure

```
app/
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── Layout.tsx
│   │   ├── StatCard.tsx
│   │   └── RuleCard.tsx
│   ├── contexts/        # React contexts
│   │   └── WalletProvider.tsx
│   ├── pages/           # Next.js pages
│   │   ├── index.tsx    # Dashboard
│   │   ├── rules/
│   │   │   ├── index.tsx  # All rules
│   │   │   └── new.tsx    # Create rule
│   │   └── history.tsx  # Execution history
│   └── styles/
│       └── globals.css
├── package.json
└── next.config.js
```

---

## 🔗 Connecting to Smart Contract

### For MVP (Mock Mode):
El frontend funciona standalone con datos mock.  
Perfecto para demo y desarrollo.

### For Production:
1. Compila smart contract: `anchor build`
2. Deploy a devnet: `anchor deploy`
3. Copia Program ID a `src/utils/constants.ts`
4. Actualiza `src/hooks/useTreasury.ts` con llamadas reales
5. Test con wallet en devnet

---

## 🎨 UI Components

### StatCard
```tsx
<StatCard
  title="Total Value Locked"
  value="$50.2M"
  icon="💎"
  change="+5.2%"
  trend="up"
/>
```

### RuleCard
```tsx
<RuleCard
  rule={rule}
  onExecute={handleExecute}
  onDisable={handleDisable}
/>
```

---

## 🔐 Security

- No private keys stored
- Wallet connection via standard adapters
- Read-only until user signs
- All transactions require explicit approval

---

## 🧪 Testing

```powershell
# Component tests (TODO)
pnpm test

# E2E tests (TODO)
pnpm test:e2e

# Linting
pnpm lint
```

---

## 📱 Responsive Design

- ✅ Desktop (1920x1080+)
- ✅ Laptop (1366x768+)
- ✅ Tablet (768x1024+)
- ⚠️ Mobile (works, but optimized for desktop)

---

## 🚀 Deployment

### Vercel (Recommended):
```bash
# Install Vercel CLI
pnpm add -g vercel

# Deploy
vercel --prod
```

### Manual Build:
```bash
pnpm build
pnpm start
```

---

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)
- [TailwindCSS](https://tailwindcss.com/docs)

---

## 🤝 Contributing

Este es un proyecto de hackathon. Post-hackathon:
1. Fork el repo
2. Create feature branch
3. Commit changes
4. Push y create PR

---

**Built for StableHacks 2026 🏆**
