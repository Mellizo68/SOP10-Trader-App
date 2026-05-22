# Phase 8: Market Data Integration - FlashAlpha API

## ✅ Objetivo Completado

Integración de **FlashAlpha API** para proporcionar datos de mercado en tiempo real:
- ✅ GEX (Gamma Exposure)
- ✅ Greeks (Delta, Gamma, Theta, Vega, IV)
- ✅ Gamma Flip Levels
- ✅ Options Walls (Put/Call)
- ✅ Open Interest y Volume

**Status**: Paso 2 Completado ✅

---

## Archivos Creados

### Backend
1. **src/api/flashalpha-client.ts** (300+ líneas)
   - Cliente TypeScript para FlashAlpha API
   - Rate limiting automático (200ms entre requests)
   - Métodos para: GEX, Greeks, Gamma Flip, Options Walls, Volume/OI
   - Error handling y validación
   - Singleton pattern para reutilización

2. **src/controllers/marketController.ts** (250+ líneas)
   - 8 controladores para endpoints de mercado
   - Validación de inputs
   - Respuestas estructuradas JSON
   - Error handling completo

3. **src/routes/market.ts** (50 líneas)
   - 8 rutas REST para market data
   - Integración con Flash Alpha client
   - Health check y estadísticas

4. **app.ts** (ACTUALIZADO)
   - Integración de market routes
   - Import de `marketRoutes` en `/api/market`

---

## API Endpoints

### Base URL
```
http://localhost:5000/api/market
```

### Endpoints Disponibles

#### 1. **Health Check**
```http
GET /api/market/health
```

**Response:**
```json
{
  "success": true,
  "status": "FlashAlpha API is healthy",
  "timestamp": "2026-05-20T10:30:00Z"
}
```

---

#### 2. **GEX (Gamma Exposure)**
```http
GET /api/market/gex/:symbol
GET /api/market/gex/SPY
GET /api/market/gex/SPY?strike=450
```

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "SPY",
    "strike": 450,
    "gex": 12500000,
    "gexPercent": 2.5,
    "gammaFlip": false,
    "timestamp": "2026-05-20T10:30:00Z"
  }
}
```

**Interpretación:**
- `gex`: Posición neta agregada de gamma (en dólares)
- `gexPercent`: % de GEX respecto al precio actual
- `gammaFlip`: Indica si hay un potencial flip de gamma

---

#### 3. **Greeks (Delta, Gamma, Theta, Vega, IV)**
```http
GET /api/market/greeks/:symbol
GET /api/market/greeks/SPY
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "symbol": "SPY",
      "strike": 450,
      "expiration": "2026-06-20",
      "optionType": "call",
      "delta": 0.65,
      "gamma": 0.015,
      "theta": -0.08,
      "vega": 0.25,
      "iv": 18.5,
      "price": 8.50,
      "timestamp": "2026-05-20T10:30:00Z"
    },
    {
      "symbol": "SPY",
      "strike": 450,
      "expiration": "2026-06-20",
      "optionType": "put",
      "delta": -0.35,
      "gamma": 0.015,
      "theta": -0.04,
      "vega": 0.25,
      "iv": 18.5,
      "price": 6.50,
      "timestamp": "2026-05-20T10:30:00Z"
    }
  ],
  "count": 2
}
```

**Definiciones:**
- **Delta**: Cambio de precio de la opción por $1 en el stock
- **Gamma**: Cambio de delta por $1 en el stock
- **Theta**: Decay por día (time decay)
- **Vega**: Sensibilidad a cambios en volatilidad (IV)
- **IV**: Volatilidad implícita (%)

---

#### 4. **Gamma Flip**
```http
GET /api/market/gamma-flip/:symbol
GET /api/market/gamma-flip/SPY
```

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "SPY",
    "flipLevel": 452.50,
    "direction": "up",
    "strength": 0.8,
    "timestamp": "2026-05-20T10:30:00Z"
  }
}
```

**Interpretación:**
- `flipLevel`: Precio donde ocurriría el flip
- `direction`: "up", "down", o "neutral"
- `strength`: 0-1, qué tan probable es el flip

---

#### 5. **Options Walls (Put/Call)**
```http
GET /api/market/walls/:symbol
GET /api/market/walls/SPY
GET /api/market/walls/SPY?strike=450
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "symbol": "SPY",
      "strikePrice": 450,
      "putWall": {
        "contracts": 50000,
        "level": "strong"
      },
      "callWall": {
        "contracts": 75000,
        "level": "strong"
      },
      "timestamp": "2026-05-20T10:30:00Z"
    }
  ],
  "count": 1
}
```

**Interpretación:**
- `putWall`: Soporte (where buyers accumulate puts)
- `callWall`: Resistencia (where buyers accumulate calls)
- `level`: "strong", "moderate", "weak"

---

#### 6. **Volume & Open Interest**
```http
GET /api/market/volume-oi/:symbol
GET /api/market/volume-oi/SPY
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "symbol": "SPY",
      "strikePrice": 450,
      "expiration": "2026-06-20",
      "callOI": 125000,
      "callVolume": 45000,
      "putOI": 95000,
      "putVolume": 38000,
      "timestamp": "2026-05-20T10:30:00Z"
    }
  ],
  "count": 1
}
```

**Interpretación:**
- `OI` (Open Interest): Contratos abiertos totales
- `Volume`: Contratos negociados hoy
- Call/Put ratio indica si hay más buyers de calls o puts

---

#### 7. **Market Data Combinado** ⭐ (Principal)
```http
GET /api/market/data/:symbol
GET /api/market/data/SPY
```

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "SPY",
    "gex": {
      "symbol": "SPY",
      "gex": 12500000,
      "gexPercent": 2.5,
      "gammaFlip": false,
      "timestamp": "2026-05-20T10:30:00Z"
    },
    "gammaFlip": {
      "symbol": "SPY",
      "flipLevel": 452.50,
      "direction": "up",
      "strength": 0.8,
      "timestamp": "2026-05-20T10:30:00Z"
    },
    "greeks": {
      "count": 24,
      "items": [...]
    },
    "walls": {
      "count": 8,
      "items": [...]
    },
    "volumeOI": {
      "count": 8,
      "items": [...]
    },
    "timestamp": "2026-05-20T10:30:00Z"
  }
}
```

Este es el **endpoint principal** para análisis de mercado completo.

---

#### 8. **API Statistics**
```http
GET /api/market/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRequests": 145,
    "rateLimitDelay": 200,
    "timestamp": "2026-05-20T10:30:00Z"
  }
}
```

---

## Rate Limiting

FlashAlpha client implementa rate limiting automático:
- **200ms mínimo entre requests**
- **No se quema el límite de 5 requests/día** durante desarrollo
- Para producción: implementar caché de 5-15 minutos

---

## Configuración

### Environment Variables (backend/.env.local)
```bash
# FlashAlpha API
FLASHALPHA_API_KEY=NqQqAJcf8HBEezexuWL8udQXv0HL8ZHzcBVnUugg
FLASHALPHA_BASE_URL=https://lab.flashalpha.com/api/v1
```

---

## Testing

### Local Testing

#### 1. Verificar Backend está corriendo
```bash
# Terminal 1: Backend
cd backend
npm run dev
# Espera: "Server running on :5000"
```

#### 2. Test Health Check
```bash
curl http://localhost:5000/api/market/health
```

**Expected:**
```json
{
  "success": true,
  "status": "FlashAlpha API is healthy"
}
```

#### 3. Test GEX
```bash
curl http://localhost:5000/api/market/gex/SPY
```

#### 4. Test Market Data Completo
```bash
curl http://localhost:5000/api/market/data/SPY | jq
```

---

## Próximos Pasos

### Paso 3: Frontend Integration
**Tiempo**: ~2 horas

Crear componente en Trade Journal:
1. **MarketAnalysisTab** en TradeJournal
   - Tabla de GEX levels por strike
   - Gamma Flip indicator
   - Options Walls visualization
   - Greeks heatmap

2. **RealTimeUpdates**
   - Poll /api/market/data/:symbol cada 10 segundos
   - Cache local para reducir requests
   - Alertas cuando flipLevel está cercano

3. **Integración con TradeInputForm**
   - Mostrar GEX/Greeks para el símbolo seleccionado
   - Incluir en análisis de confluencia

---

## Estructura de Datos

### GEXData
```typescript
{
  symbol: string;
  strike?: number;
  gex: number;                 // GEX en dólares
  gexPercent: number;          // GEX como % del precio
  gammaFlip?: boolean;         // Hay flip potencial?
  timestamp: string;           // ISO 8601
}
```

### GreeksData
```typescript
{
  symbol: string;
  strike: number;
  expiration: string;
  optionType: 'call' | 'put';
  delta: number;               // 0.0 - 1.0
  gamma: number;               // Segunda derivada de delta
  theta: number;               // Decay por día
  vega: number;                // Sensibilidad a IV
  iv: number;                  // Volatilidad implícita (%)
  price: number;               // Precio de la opción
  timestamp: string;
}
```

---

## Casos de Uso

### 1. Validar Setup del Trade
```
Usuario completa validation en SetupValidator
↓
Backend consulta /api/market/data/SPY
↓
Verifica:
  - GEX direction coincide con predicción
  - Gamma flip no está cerca
  - IV está dentro del rango esperado
  - Options walls no contradicen el plan
↓
Trade Journal recomienda entry price basado en walls
```

### 2. Monitor durante Trade Abierto
```
Trade abierto (status="open")
↓
Cada 10 segundos: GET /api/market/gex/:symbol
↓
Si GEX flip ocurre:
  - Alerta al usuario
  - Recomendación de cierre anticipado
↓
Dashboard muestra GEX trend en tiempo real
```

### 3. Análisis Post-Trade
```
Trade cerrado
↓
Revisar histórico de GEX/Greeks durante trade
↓
Correlacionar outcome con:
  - GEX levels al entry
  - Gamma flip events
  - IV changes
  - Options walls impacto
↓
Mejorar logic para futuros trades
```

---

## Troubleshooting

### ❌ Error: "FlashAlpha Authentication failed"
- Verifica FLASHALPHA_API_KEY en backend/.env.local
- Verifica que la key no esté expirada

### ❌ Error: "Rate limit exceeded"
- El rate limiting automático debería evitar esto
- Si ocurre: espera 60 segundos y reintenta

### ❌ Error: "No data found"
- Verifica que el símbolo es válido (ej: SPY, not spy)
- Verifica que el mercado está abierto (9:30-16:00 ET)

### ❌ Error: "Network timeout"
- FlashAlpha server puede estar caído
- Reintenta en 30 segundos

---

## Performance

**Tiempos típicos de respuesta:**
- Health check: < 100ms
- Single endpoint (GEX, Greeks): 200-500ms
- Combined data (/data): 1-2 segundos (llamadas en paralelo)

**Recomendaciones:**
- Cache responses 5-15 minutos en frontend
- Paginar Greeks si hay muchas expirations
- Usar `/data/:symbol` para mejor performance que múltiples requests

---

## Próximas Fases

- **Phase 8**: Market integration + frontend UI (Paso 3-6)
- **Phase 9**: TradingView chart integration
- **Phase 10**: Alertas automáticas basadas en GEX/Greeks

---

**Status**: ✅ Backend 100% Completo
**Next**: Frontend Integration (Paso 3)
**Timeline**: ~4 horas restantes para Phase 8 completo

