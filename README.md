# 🎯 SOP10 Trader - Setup Validator & Trade Journal

Sistema profesional de validación de setups de opciones + Bitácora de trades con integración MCP.

## 📋 Características

✅ **Image Extractor - Auto-Extracción de Datos**
- Sube capturas de TradingView o TanukiTrade
- Claude Vision API detecta automáticamente todos los valores
- **Nuevo: Z-Score & Actividad Institucional desde ThinkorSwim**
- Auto-llena el formulario con datos extraídos
- Confianza visual del % de extracción
- Reduce tiempo manual de 15 minutos a 30 segundos

✅ **Setup Validator en Tiempo Real**
- Validación automática de confluencia (AVWAP, APVP, Muros GEX)
- Análisis CVD (divergencias alcistas/bajistas)
- **Nuevo: Integración Z-Score para detección de actividad institucional**
- Scoring de confluencia (0-100) con bonus/penalización por Z-Score
- Recomendaciones Entry/TP/SL
- Alertas y notas personalizadas
- Compatible con extracción automática de imágenes

✅ **Exit Calculator - Cálculo de Salidas**
- TP/SL automáticos según estrategia
- Risk/Reward ratio análisis
- Position sizing automático
- Soporta 13 estrategias diferentes

✅ **Market Analysis Dashboard (NEW - Fase 8, Paso 3)**
- **Real-time Market Data** desde FlashAlpha API
- **GEX (Gamma Exposure)**: Visualización de niveles de exposición gamma
- **Greeks Table**: Delta, Gamma, Theta, Vega, IV para opciones
- **Gamma Flip Alerts**: Alertas automáticas cuando hay cambio de dirección
- **Options Walls**: Muros de opciones put/call por strike
- **Volume & Open Interest**: Análisis de volumen e interés abierto
- Polling automático cada 10 segundos
- Symbol seleccionable (SPY, QQQ, TSLA, etc.)
- Refresh manual disponible

✅ **Bitácora de Trades Completa (NEW - Fase 4)**
- Auto-completa desde SetupValidator + ExitCalculator
- Registra entrada, salida y P/L automáticamente
- Tabla filtrable por Status, Estrategia, Confluencia, Symbol
- Modal para ver/editar/cerrar trades
- Cálculo automático de P/L % y posición relativa a TP/SL
- Persistencia en localStorage (sin backend)

✅ **Integración MCP Server**
- Conecta con Bebeto Server
- Análisis técnico automático
- Recomendaciones basadas en patrones

✅ **Estadísticas Overview (Tab 1 - Básico)**
- 6 Stats Cards: Total Trades, Win Rate, Profit Factor, Total P/L, Avg Win/Loss
- Quick Metrics: Mejor estrategia, Mejor trade, Racha actual
- Últimos 5 trades cerrados
- Visualización de open vs closed trades

✅ **Estadísticas Avanzadas (Tab 2 - Analytics)**
- **Equity Curve**: Línea acumulada P/L over time
- **P&L Distribution**: Histogram de rangos de P/L (Major Loss/Win, etc)
- **Strategy Breakdown**: Pie chart + tabla de trades por estrategia
- **Por Confluencia**: Desglose High/Medium/Low con win rate y avg P/L
- **Insights Automáticos**: Recomendaciones basadas en análisis

✅ **Exportación de Datos**
- Export a CSV con todos los trades
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

## ⚙️ Configuración de Image Extractor

### 1. Obtén tu API Key de Claude

1. Ve a https://console.anthropic.com
2. Log in con tu cuenta (o crea una)
3. Navega a "API Keys"
4. Click "Create Key"
5. Copia tu API key

### 2. Configura la Variable de Entorno

**Opción A: Local Development**

```bash
# En la raíz del proyecto, crea .env.local
echo "VITE_ANTHROPIC_API_KEY=sk-ant-v4-xxxxxxxxxxxxx" > .env.local
```

**Opción B: Vercel Deployment**

```bash
# Via CLI
vercel env add VITE_ANTHROPIC_API_KEY

# O en Vercel Dashboard:
# Settings → Environment Variables
# Agrega: VITE_ANTHROPIC_API_KEY = tu-clave
```

### 3. Usar Image Extractor

1. Abre la app → Tab "📸 Image Extractor"
2. Sube captura de TradingView (4H) con AVWAP, APVP, EMA21, SMA200
3. O sube captura de TanukiTrade con GEX levels (C1-C3, P1-P3)
4. Click "🚀 EXTRAER DATOS"
5. Verifica los datos extraídos (muestra % confianza)
6. Click "Cargar en Validador"
7. Los campos se auto-llenan → Completa Symbol + Strategy + DTE
8. Click "🔍 ANALIZAR SETUP"

**Qué datos detecta:**

- **De TradingView (4H)**: Precio, VWAP, AVWAP, POC, APVP, EMA21, SMA200
- **De TanukiTrade GEX**: Call Walls (C1-C3), Put Walls (P1-P3), Net GEX
- **De CVD/Vol**: IV %, CVD Value, CVD EMA, Divergencias
- **Nuevo: De ThinkorSwim**: Z-Score (actividad institucional), Z-Vol, volumen extremo

## 📚 Uso

### Image Extractor

**Paso 1: Preparar Capturas**
- TradingView: Chart 4H con AVWAP + APVP visibles
- TanukiTrade: GEX view con muros claramente marcados

**Paso 2: Subir Imagen**
- Tab "📸 Image Extractor"
- Drag & drop o click para seleccionar
- Soporta PNG, JPG, WebP (máx 20MB)

**Paso 3: Análisis Automático**
- Claude Vision API analiza la imagen
- Detecta automáticamente: precios, niveles, indicadores
- Muestra confianza % (70%+ es confiable)

**Paso 4: Verificar y Cargar**
- Revisa los datos extraídos
- Opción de corregir valores manualmente
- Click "Cargar en Validador"
- Auto-llena SetupValidator

### Trade Journal (Bitácora de Trades)

#### Flujo Recomendado:
```
1. Ejecutar validation en SetupValidator
   ↓
2. Click: "📓 Crear Trade Entry"
   ↓
3. Trade Journal abre con datos pre-completos:
   - confluenceScore, targetEntry, targetTP, targetSL
   - symbol, strategy, delta, ivPercent, daysToExpiration
   ↓
4. Completar entryPrice y confirmar
   ↓
5. Cuando se cierra el trade:
   - Ir a "📈 Trades" tab
   - Click en "eye" icon
   - Ingresar exitPrice y exitDate
   - Modal auto-calcula P/L y %
   ↓
6. Ver análisis en "🔍 Analytics"
   - Equity Curve, P&L Distribution
   - Performance por Estrategia/Confluencia
```

#### Características:
- **Auto-completa**: Desde SetupValidator (confluenceScore, targets)
- **Filtrable**: Por Status, Strategy, Confluence, Symbol
- **Sortable**: Haz click en headers para ordenar
- **Export**: Descarga CSV con todos los trades
- **Analytics**: 2 tabs - Overview (básico) + Advanced (profundo)
- **Persistencia**: Todos los datos en localStorage (local)

### Market Analysis Dashboard

**Acceso**: Tab "📊 Market Data" en Trade Journal

#### Características:

1. **Symbol Input & Refresh**
   - Campo para ingresar símbolo (SPY, QQQ, TSLA, etc.)
   - Botón Refresh con spinner durante carga
   - Polling automático cada 10 segundos

2. **GEX Card**
   - Valor de GEX formateado en millones (ej: $12.5M)
   - Porcentaje de GEX con indicador de tendencia
   - Alerta de Gamma Flip cuando flipLevel > 0.7
   - Muestra dirección (UP/DOWN) y fortaleza del flip

3. **Greeks Table** (Top 5 opciones)
   - Strike Price
   - Expiration (formato abreviado: May 21)
   - Option Type (CALL/PUT badge color-coded)
   - Delta (azul) - probabilidad de ejercicio
   - Gamma (púrpura) - sensibilidad del delta
   - Theta (rojo) - decay de tiempo
   - Vega (verde) - sensibilidad a IV
   - IV% (naranja) - volatilidad implícita
   - Precio de la opción

4. **Options Walls Table**
   - Strike Price
   - Put Wall: nivel de fortaleza + cantidad de contratos
   - Call Wall: nivel de fortaleza + cantidad de contratos
   - Colores: Strong (rojo/verde), Moderate (naranja/amarillo), Weak (gris)

5. **Volume & Open Interest Table**
   - Strike Price
   - Call Open Interest
   - Call Volume
   - Put Open Interest
   - Put Volume
   - Todos en formato K (miles)

#### Flujo de Uso:

```
1. Abre Trade Journal → Tab "📊 Market Data"
2. Ingresa o cambia el Symbol (ej: SPY)
3. Observa:
   - GEX levels y gamma flip alerts
   - Greeks para las opciones más relevantes
   - Muros de opciones donde hay concentración
   - Volumen e interés abierto
4. Click "Refresh" para actualizar manualmente
   (O espera 10 segundos para polling automático)
5. Usa datos para confirmar entries/exits en tus trades
```

#### Estado de Carga:
- Loading spinner mientras se obtienen datos del backend
- Error alerts si la API no responde
- Last updated timestamp

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

## 📊 Desarrollo por Fases

- [x] **Fase 1**: Setup Validator Core ✅ COMPLETADO
- [x] **Fase 2**: Exit Calculator ✅ COMPLETADO
- [x] **Fase 3**: Image Extractor (Claude Vision) ✅ COMPLETADO
- [x] **Fase 4**: Bitácora de Trades + Estadísticas ✅ COMPLETADO
- [x] **Fase 5**: API Backend + PostgreSQL ✅ COMPLETADO
- [ ] **Fase 6**: Dashboard con gráficos avanzados
- [ ] **Fase 7**: Integración Notion API
- [ ] **Fase 8**: MCP Server Bebeto Integration
- [ ] **Fase 9**: Mobile app (React Native)

### 🆕 Fase 5: API Backend + PostgreSQL - COMPLETADO ✅

**Lo que se implementó:**
- ✅ Express.js REST API (TypeScript)
- ✅ PostgreSQL database con schema completo
- ✅ 6 endpoints de trades (CRUD + close)
- ✅ 3 endpoints de estadísticas (overview + by-strategy + by-confluence)
- ✅ Arquitectura offline-first con sync automático
- ✅ Sincronización de background (non-blocking)
- ✅ Docker Compose para desarrollo local
- ✅ Railway deployment configuration
- ✅ Build successful: Frontend + Backend compilados

**Cómo funciona:**
```
App (React)
    ↓
TradeJournalService (localStorage)
    ↓ (background sync)
API Client (Express)
    ↓
PostgreSQL (cloud persistence)
```

**Características:**
- Sincronización bidireccional: UI → localStorage → API → DB
- Offline-first: Si no hay conexión, funciona desde cache local
- Auto-sync: Cuando vuelves online, sincroniza automáticamente
- Validación: Todos los inputs validados antes de guardar
- Errores: Manejo elegante con fallback a localStorage

**Próximos pasos:**
1. Local testing con Docker: `docker compose up`
2. Deployment a Railway
3. Testing en producción

Ver detalles en: `PHASE5_IMPLEMENTATION.md` y `PHASE5_TESTING_DEPLOYMENT.md`

## 🛠️ Desarrollo Local

### Frontend Only (Fases 1-4)
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

### Full Stack with Backend (Fase 5+)
```bash
# Terminal 1: PostgreSQL
docker compose up -d

# Terminal 2: Backend
cd backend
npm install
npm run dev
# Server en: http://localhost:5000

# Terminal 3: Frontend
npm install
npm run dev
# App en: http://localhost:3000
```

### Backend Only
```bash
cd backend
npm install
npm run build      # Compile TypeScript
npm start          # Production mode
npm run dev        # Development mode
```

## 📝 Estructura de Archivos

```
SOP10-Trader-App/
├── src/
│   ├── components/
│   │   ├── ImageExtractor.tsx                (Auto-extracción de imágenes)
│   │   ├── SetupValidator.tsx                (Validación de setups)
│   │   ├── ExitCalculator.tsx                (Cálculo TP/SL)
│   │   ├── TradeJournal.tsx                  (NEW: Bitácora de trades)
│   │   └── TradeJournal/
│   │       ├── OverviewTab.tsx               (Stats cards y quick metrics)
│   │       ├── TradeInputForm.tsx            (Crear nuevo trade)
│   │       ├── TradeHistoryTable.tsx         (Tabla de trades con filtros)
│   │       ├── TradeDetailModal.tsx          (Ver/editar/cerrar trades)
│   │       ├── AnalyticsTab.tsx              (Análisis avanzado + charts)
│   │       ├── GEXCard.tsx                   (NEW: Market Data - Gamma Exposure)
│   │       ├── GreeksTable.tsx               (NEW: Market Data - Greeks)
│   │       └── MarketAnalysisTab.tsx         (NEW: Market Data Dashboard)
│   ├── hooks/
│   │   └── useMarketData.ts                  (NEW: Custom hook - Market data polling)
│   ├── services/
│   │   ├── imageExtractor.ts                 (Claude Vision integration)
│   │   ├── setupValidator.ts                 (Lógica de validación)
│   │   └── tradeJournalService.ts            (NEW: CRUD + estadísticas de trades)
│   ├── utils/
│   │   └── localStorage.ts                   (NEW: Persistencia de datos)
│   ├── types/
│   │   └── index.ts                          (TypeScript interfaces)
│   ├── styles/
│   │   └── App.css
│   ├── App.tsx                               (App principal)
│   └── main.tsx
├── .env.example                              (Ejemplo de variables)
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── vercel.json
├── backend/                                  (NEW: Market Data API - Fase 8)
│   ├── src/
│   │   ├── api/
│   │   │   └── flashalpha-client.ts         (FlashAlpha API client)
│   │   ├── controllers/
│   │   │   └── marketController.ts          (Market data endpoints)
│   │   ├── routes/
│   │   │   └── market.ts                    (Market data routes)
│   │   ├── middleware/
│   │   │   ├── errorHandler.ts              (Global error handling)
│   │   │   └── auth.ts                      (Auth middleware)
│   │   ├── utils/
│   │   │   └── validators.ts                (Request validation)
│   │   ├── types.ts                         (TypeScript interfaces)
│   │   ├── app.ts                           (Express app setup)
│   │   └── server.ts                        (Server entry point)
│   ├── .env.example                         (Backend env template)
│   ├── .env.local                           (Backend env local)
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
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
✨ Z-Score Institucional: > +2.0 (ideal) o < -2.0 (esperar)
```

**Z-Score Impact en Confluencia:**
- Z-Score > +2.0: +15 puntos (Actividad institucional fuerte COMPRA)
- Z-Score < -2.0: -10 puntos (Actividad institucional fuerte VENTA - esperar)

### Scoring

- **80-100**: Setup excelente ⭐⭐⭐
- **65-79**: Setup válido ⭐⭐
- **50-64**: Setup débil ⭐
- **<50**: Esperar mejor confluencia

### Take Profit & Stop Loss

- **Crédito**: TP 50% prima recibida
- **Débito**: TP 200% del costo (el doble)
- **SL**: -200% o cierre fuera del muro

## ⚙️ Configuración Market Data API (Fase 8)

### Backend Setup

El backend expone endpoints para obtener datos de mercado en tiempo real desde FlashAlpha API:

```bash
# Terminal 1: Backend
cd backend
npm install
npm run build      # Compile TypeScript
npm start          # Inicia en http://localhost:5001

# Terminal 2: Frontend
cd SOP10-Trader-App
npm install
npm run dev        # Inicia en http://localhost:3000
```

### Variables de Entorno (Backend)

En `backend/.env.local`:
```bash
# Port & Environment
PORT=5001
NODE_ENV=development

# FlashAlpha API
FLASHALPHA_API_KEY=your_api_key_here
FLASHALPHA_BASE_URL=https://api.flashalpha.co

# Database (Fase 5)
DATABASE_URL=postgresql://user:password@localhost:5432/sop10
```

### API Endpoints

**Market Data General:**
```
GET /api/market/data/:symbol
```

Retorna objeto con:
- `gex`: Gamma Exposure data
- `gammaFlip`: Gamma flip alerts
- `greeks`: Array de Greeks (Delta, Gamma, Theta, Vega, IV)
- `walls`: Options walls (put/call)
- `volumeOI`: Volume & Open Interest data

**Individual Endpoints:**
```
GET /api/market/gex/:symbol
GET /api/market/greeks/:symbol
GET /api/market/gamma-flip/:symbol
GET /api/market/walls/:symbol
GET /api/market/volume-oi/:symbol
GET /api/market/health
GET /api/market/stats
```

### Frontend Integration

El frontend usa un custom hook `useMarketData(symbol)`:

```typescript
const { data, loading, error, lastUpdated, refetch } = useMarketData('SPY');

// data.gex: GEX data
// data.gammaFlip: Gamma flip warnings
// data.greeks.items: Array de Greeks
// data.walls.items: Options walls
// data.volumeOI.items: Volume & OI
```

El hook implementa:
- Polling automático cada 10 segundos
- Rate limiting (200ms entre requests)
- Manejo de errores con reintentos
- Estados de loading y error

### Testing

```bash
# Test API directamente
curl http://localhost:5001/api/market/data/SPY | jq

# Frontend dev server (con proxy automático)
npm run dev
# Navega a http://localhost:3000
# Abre Trade Journal → Tab "📊 Market Data"
```

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
