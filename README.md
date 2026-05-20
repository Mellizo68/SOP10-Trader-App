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
- [ ] **Fase 4**: Bitácora de Trades + Estadísticas
- [ ] **Fase 5**: API Backend (PostgreSQL)
- [ ] **Fase 6**: Dashboard con gráficos avanzados
- [ ] **Fase 7**: Integración Notion API
- [ ] **Fase 8**: MCP Server Bebeto Integration
- [ ] **Fase 9**: Mobile app (React Native)

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
│   │   ├── ImageExtractor.tsx          (NEW: Auto-extracción de imágenes)
│   │   ├── SetupValidator.tsx          (Validación de setups)
│   │   ├── ExitCalculator.tsx          (Cálculo TP/SL)
│   │   └── SetupValidator.tsx
│   ├── services/
│   │   ├── imageExtractor.ts           (NEW: Claude Vision integration)
│   │   └── setupValidator.ts           (Lógica de validación)
│   ├── types/
│   │   └── index.ts                    (TypeScript interfaces)
│   ├── styles/
│   │   └── App.css
│   ├── App.tsx                         (App principal)
│   └── main.tsx
├── .env.example                        (NEW: Ejemplo de variables)
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
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
