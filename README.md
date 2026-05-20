# 🎯 SOP10 Trader - Setup Validator & Trade Journal

Sistema profesional de validación de setups de opciones + Bitácora de trades con integración MCP.

## 📋 Características

✅ **Setup Validator en Tiempo Real**
- Validación automática de confluencia (AVWAP, APVP, Muros GEX)
- Análisis CVD (divergencias alcistas/bajistas)
- Scoring de confluencia (0-100)
- Recomendaciones Entry/TP/SL
- Alertas y notas personalizadas

✅ **Bitácora de Trades Completa**
- Tracking de todas tus operaciones
- P/L automático
- Estadísticas por estrategia
- Análisis de winrate

✅ **Integración MCP Server**
- Conecta con Bebeto Server
- Análisis técnico automático
- Recomendaciones basadas en patrones

✅ **Exportación de Datos**
- Export a CSV/JSON
- Integración Notion (próximamente)
- Screenshots organizados

## 🚀 Instalación Rápida

### Opción 1: Cloning + Local Development

```bash
cd /Users/bebeto/SOP10-Trader-App
npm install
npm run dev
```

Abre http://localhost:3000

### Opción 2: Deploy a Vercel (Recomendado)

```bash
# 1. Instala Vercel CLI
npm i -g vercel

# 2. Deploy
cd /Users/bebeto/SOP10-Trader-App
vercel

# Sigue el wizard - ¡Listo!
```

Tu app estará en: `https://sop10-trader-[random].vercel.app`

## 📚 Uso

### Setup Validator

1. **Ingresa datos de GEX** (TanukiTrade App)
   - Call Wall
   - Put Wall
   - Net GEX
   - Gamma Positivo

2. **Ingresa Price Action** (TradingView)
   - Precio actual
   - VWAP (mes)
   - AVWAP ±2SD
   - APVP High/Low
   - EMA21, SMA200

3. **Ingresa CVD + Vol** (TradingView/Thinkorswim)
   - IV Percent
   - CVD Value & EMA
   - Divergencia (bullish/bearish)
   - Volumen Institucional

4. **Ingresa Opciones**
   - Símbolo
   - Estrategia
   - Strike
   - Delta
   - DTE

5. **Click: 🔍 ANALIZAR SETUP**
   - Obtienes Confluence Score
   - Recomendación automática
   - Entry/TP/SL targets
   - Warnings y notas

## 🏗️ Stack Técnico

**Frontend:**
- React 18 + TypeScript
- Tailwind CSS
- Vite
- Recharts (gráficos)

**Build & Deploy:**
- Vercel (hosting)
- Node.js 18+

## 🔌 Integración MCP Bebeto

El Setup Validator se integra con tu MCP Server Bebeto para:

```typescript
// En futuras versiones:
- bebeto_sop10_setup_validation
- bebeto_cvd_analysis
- bebeto_confluence_score
- bebeto_trade_management
```

## 📊 Próximas Fases

- [ ] Fase 2: Bitácora de Trades + Estadísticas
- [ ] Fase 3: API Backend (PostgreSQL)
- [ ] Fase 4: Dashboard con gráficos avanzados
- [ ] Fase 5: Integración Notion API
- [ ] Fase 6: Mobile app (React Native)

## 🛠️ Desarrollo Local

```bash
# Instalar deps
npm install

# Dev server (hot reload)
npm run dev

# Build para producción
npm run build

# Preview build
npm run preview
```

## 📝 Estructura de Archivos

```
SOP10-Trader-App/
├── src/
│   ├── components/
│   │   └── SetupValidator.tsx
│   ├── services/
│   │   └── setupValidator.ts
│   ├── types/
│   │   └── index.ts
│   ├── styles/
│   │   └── App.css
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vercel.json
```

## 🎯 Guía Rápida SOP10

### Criterios de Validación

```
✅ IV Percent: > 50 (idealmente > 75)
✅ Gamma Positivo: Sí (pilar fundamental)
✅ CVD Divergencia: Bullish o Bearish (confirmación)
✅ Confluencia: AVWAP + APVP + Muros GEX
✅ Tendencia: EMA21 > SMA200 (alcista) o inverso
✅ DTE: 30-45 días
✅ Delta: 20-30 OTM o 10-20 ITM
```

### Scoring

- **80-100**: Setup excelente ⭐⭐⭐
- **65-79**: Setup válido ⭐⭐
- **50-64**: Setup débil ⭐
- **<50**: Esperar mejor confluencia

### Take Profit & Stop Loss

- **Crédito**: TP 50% prima recibida
- **Débito**: TP 200% del costo (el doble)
- **SL**: -200% o cierre fuera del muro

## 🆘 Troubleshooting

### npm install falla
```bash
npm cache clean --force
rm -rf node_modules
npm install
```

### Puerto 3000 ocupado
```bash
npm run dev -- --port 3001
```

### Build error
```bash
npm run build -- --debug
```

## 📧 Soporte

- GitHub Issues: [SOP10-Trader](https://github.com/tu-usuario/sop10-trader)
- Discord: [Comunidad SOP10](https://discord.gg/...)

## 📄 Licencia

MIT © 2026 - SOP10 Trader

---

**Hecho con ❤️ para traders profesionales**
