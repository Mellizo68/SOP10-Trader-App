# 📸 Guía de Screenshots para Image Extractor

## Cómo Preparar Screenshots para Máxima Precisión

El Image Extractor usa Claude Vision API para detectar automáticamente valores de tus gráficos. Para obtener mejor confianza en la extracción, sigue estas recomendaciones.

---

## 1️⃣ Screenshots de TradingView - MACRO (4 Horas)

### Qué Incluir:
- **AVWAP** (Anchored VWAP) - línea principal
- **APVP** (Average Price Volume Profile) - bandas alto/bajo
- **EMA 21** - Media móvil exponencial
- **SMA 200** - Media móvil simple
- **Precio Actual** - últimas velas

### Cómo Capturar:

1. **TradingView Setup**
   ```
   Símbolo: SPY (o tu activo)
   Timeframe: 4 Horas
   Indicadores visibles:
   - AVWAP (línea azul/cian)
   - APVP (bandas anaranjadas/rojas)
   - EMA 21 (línea verde)
   - SMA 200 (línea roja)
   ```

2. **Posiciona los Indicadores**
   - Que el precio actual sea claramente visible
   - Que las líneas de AVWAP, EMA21, SMA200 se vean
   - Que el APVP tenga sus extremos visibles

3. **Captura la Pantalla**
   - Mac: `Cmd + Shift + 4` → Selecciona área
   - Windows: `Windows + Shift + S`
   - O usa Print Screen

### Ejemplo de Salida Detectada:
```
CURRENT PRICE | 468.50 | PRICE
AVWAP HIGH | 470.25 | PRICE
AVWAP LOW | 466.75 | PRICE
AVWAP MONTH | 468.30 | PRICE
EMA 21 | 467.80 | PRICE
SMA 200 | 464.50 | PRICE
POC MONTH | 467.50 | PRICE
APVP HIGH | 471.00 | PRICE
APVP LOW | 465.00 | PRICE
```

**Confianza Esperada: 75-95%**

---

## 2️⃣ Screenshots de TanukiTrade - GEX DATA

TanukiTrade ofrece **3 vistas** que puedes extraer:

### 2A) SUMMARY CARD (Recomendado ⭐)

**Qué es:** Panel resumen con los datos principales clave

**Qué Incluir:**
- **NET GAMMA** - Número grande (ej: +124.25M, ↓ -3.33M 1D)
- **NET DELTA** - Número grande (ej: +3.16B, ↓ -782.74M 1D)  
- **GAMMA PROFILE** - Texto descriptivo (ej: "Positive Gamma", "Above HVL")
- **C1** - Call Wall 1 (ej: 235, +6.51%)
- **P1** - Put Wall 1 (ej: 207.5, -5.96%)
- **HVL** - High Volatility Level (ej: 212.5, -3.69%)
- **cTrans** - Call Transition si aparece (ej: 215, -2.56%)

**Cómo Capturar:**
```
1. En TanukiTrade, ve al símbolo
2. Ve a GEX tab
3. Localiza el "NET EXPOSURE" card (panel grande)
4. Captura ese panel con:
   - NET GAMMA claro
   - NET DELTA claro
   - GAMMA PROFILE section
   - Valores de C1, P1, HVL visibles
```

**Ejemplo de Salida Detectada:**
```
NET GAMMA | +124.25M | GEX
NET DELTA | +3.16B | GEX
GAMMA STATUS | Positive Gamma | GEX
C1 | 235 | GEX
P1 | 207.5 | GEX
HVL | 212.5 | GEX
```

**Confianza Esperada: 80-95%** ✨

---

### 2B) GEX CHART VIEW (Con números visibles)

**Qué es:** Gráfico de precio con GEX levels como líneas horizontales

**Qué Incluir:**
- Línea **C1** - Call Wall 1 (color, típicamente verde)
- Línea **P1** - Put Wall 1 (color, típicamente rojo)
- Línea **C2, C3** si están visibles
- Línea **P2, P3** si están visibles
- **Números en las líneas** - Debe verse el precio exacto
- **Símbolo y timeframe** para referencia

**Cómo Capturar:**
```
1. En TanukiTrade Chart
2. Asegúrate de que GEX Levels estén habilitados
3. Zoom in si es necesario para que los números sean claros
4. Captura el área con las líneas de muros
```

**Ejemplo de Salida:**
```
CALL WALL 1 | 235 | GEX
CALL WALL 2 | 240 | GEX
PUT WALL 1 | 207.5 | GEX
PUT WALL 2 | 200 | GEX
```

**Confianza Esperada: 75-90%**

---

### 2C) OPTIONS CHAIN MATRIX (Tabla completa - Recomendado 🌟)

**Qué es:** Tabla/matriz con datos de múltiples fechas de expiración

**Qué Incluir:**
- **EXPIRY** - Fechas (05/22, 05/26, 05/29, 06/12, etc.)
- **IVX** - Implied Volatility Index (ej: 87.3, 61.0)
- **C/P SKEW** - Call/Put Skew ratio (ej: 237.26, 238.01)
- **NETGEX** - Net Gamma para cada expiry (ej: 119.3M, 129.6M)
- **C1** - Call Wall nivel 1 (ej: 235, 235, 235)
- **P1** - Put Wall nivel 1 (ej: 207.5, 212.5, etc.)
- **DEX** - Delta Exposure si aparece
- Otras columnas: AGEX, ADEX, PROFILE, 0%, etc.

**Cómo Capturar:**
```
1. En TanukiTrade, localiza "Options Chain" o "Matrix" view
2. Asegúrate de ver VARIAS expiry dates (al menos 5-10)
3. Los números deben ser CLAROS y LEGIBLES
4. Captura la TABLA COMPLETA o al menos las primeras 10 filas
```

**Ejemplo de Salida (Tabla):**
```
EXPIRY | 05/22 | IVX | 87.3 | SKEW | 237.26 | NETGEX | 119.3M | C1 | 235 | P1 | 207.5 | EXPIRY
EXPIRY | 05/26 | IVX | 61.0 | SKEW | 238.01 | NETGEX | 129.6M | C1 | 235 | P1 | 212.5 | EXPIRY
EXPIRY | 05/29 | IVX | 59.7 | SKEW | 238.77 | NETGEX | 130.7M | C1 | 240 | P1 | 207.5 | EXPIRY
```

**Confianza Esperada: 85-98%** ⭐⭐⭐

---

### ¿Cuál Captura Usar?

| Necesitas... | Usa Vista | Por Qué |
|------------|----------|--------|
| **Datos rápidos GEX** | 2A (Summary) | Más rápido, todos los datos en un panel |
| **Evolución expiries** | 2C (Matrix) | Ves todas las fechas y cómo cambian |
| **Vista visual** | 2B (Chart) | Ves muros en contexto del precio |
| **Mejor confianza** | 2C (Matrix) | Números más legibles, tabla clara |

**Recomendación:** 👉 Usa **2C (Options Chain Matrix)** para máxima precisión

---

## 3️⃣ Screenshots de CVD & Volumen Institucional

### Qué Incluir:
- **IV Percent** - Volatilidad implícita
- **CVD Value** - Cumulative Volume Delta
- **CVD EMA** - Media de CVD
- **CVD DIVERGENCIA** - Bullish o Bearish
- **Volumen Institucional** - Velas cyan/magenta

### Cómo Capturar:

1. **TradingView Setup (1 Hora)**
   ```
   Timeframe: 1 Hora
   Indicadores:
   - IV % (en panel superior o tabla)
   - CVD (en panel inferior)
   - CVD EMA (línea sobre CVD)
   ```

2. **Mostrar Claramente**
   - El IV % en algún lado visible
   - El CVD con línea clara
   - Las divergencias marcadas

### Ejemplo de Salida:
```
IV PERCENT | 42.5 | VOLATILITY
CVD VALUE | 5234 | VOLATILITY
CVD EMA | 4890 | VOLATILITY
CVD DELTA | 344 | VOLATILITY
CVD DIVERGENCIA | BULLISH | VOLATILITY
VOLUMEN INSTITUCIONAL | TRUE | VOLATILITY
```

**Confianza Esperada: 70-90%**

---

## 🎯 Tips para Máxima Precisión

### ✅ HACER:
- [ ] Captura con buena iluminación de pantalla
- [ ] Zoom in si es necesario (pero legible)
- [ ] Números y etiquetas claras y legibles
- [ ] Fondo sin mucho ruido visual
- [ ] Captura de pantalla completa del área relevante
- [ ] Usar PNG o JPG (máxima calidad)

### ❌ NO HACER:
- [ ] Usar fotos de teléfono (usar screenshot)
- [ ] Números muy pequeños o borrosos
- [ ] Fondos muy oscuros sin contraste
- [ ] Pantalla con muchos indicadores diferentes
- [ ] Valores parcialmente cortados
- [ ] Imágenes con mucho zoom out

---

## 📊 Confianza de Extracción

| Confianza | Interpretación | Acción |
|-----------|-----------------|--------|
| **90-100%** | Excelente | Confía en los datos |
| **75-89%** | Muy bueno | Verifica 1-2 campos |
| **60-74%** | Bueno | Revisa la mayoría de campos |
| **40-59%** | Aceptable | Introduce correcciones |
| **<40%** | Pobre | Ingresa datos manualmente |

---

## 🔧 Troubleshooting de Extracción

### Problema: Confianza Baja (< 60%)

**Causas Comunes:**
1. Números muy pequeños o borrosos
2. Indicadores superpuestos
3. Fondos oscuros sin contraste

**Soluciones:**
- Zoom in en TradingView/TanukiTrade
- Captura solo el área relevante
- Ajusta contraste de pantalla
- Usa tema claro en los indicadores

### Problema: Valores No Detectados

**Si falta IV %:**
- Asegúrate que esté visible en la captura
- Puede estar en panel separado

**Si faltan GEX Muros:**
- Aumenta el zoom en TanukiTrade
- Captura la tabla completa

**Si falta CVD:**
- CVD suele estar en panel inferior
- Captura un área más amplia vertical

### Problema: Valores Incorrectos

**Ejemplo:** Detecta 4850.25 cuando es 4850.5

**Causa:** Última decimal poco clara

**Soluciones:**
1. Manual correction en el modal de resultados
2. Re-captura con mejor zoom
3. Usa el campo de verification para confirmar

---

## 📈 Workflow Óptimo

```
1. Abre TradingView 4H
   ├─ Configura AVWAP, APVP
   ├─ Configura EMA21, SMA200
   └─ Screenshot #1 (Macro View)

2. Abre TanukiTrade GEX
   ├─ Selecciona tu símbolo
   ├─ Muestra muros C1-C3, P1-P3
   └─ Screenshot #2 (GEX View)

3. En Image Extractor
   ├─ Sube Screenshot #1
   ├─ Verifica Price Action
   ├─ Sube Screenshot #2
   └─ Verifica GEX Levels

4. Auto-llena SetupValidator
   ├─ Confirma datos extraídos
   ├─ Completa Symbol + Strategy + DTE
   └─ Valida setup
```

---

## 🤖 Preguntas Frecuentes

**P: ¿Puedo usar screenshots de phone?**
A: No recomendado. El OCR funciona mejor con capturas de pantalla nativa del OS.

**P: ¿Qué tamaño debe tener la imagen?**
A: Entre 500x500px y 4000x4000px. Máximo 20MB (usualmente PNG es < 5MB).

**P: ¿Funciona con cualquier broker?**
A: El Image Extractor detecta números, no plataformas específicas. Funciona con:
- TradingView ✅
- ThinkorSwim ✅
- E*TRADE ✅
- Interactive Brokers ✅
- TanukiTrade ✅

**P: ¿Puedo editar los valores detectados?**
A: Sí, en el modal de resultados hay opción para verificar y corregir cada valor.

**P: ¿Mis imágenes se suben al servidor?**
A: Las imágenes se envían a Claude API (Anthropic) para análisis. No se almacenan en nuestros servidores. Revisa la política de privacidad de Anthropic.

---

**¡Listo! 🎉 Tus screenshots están optimizados para extracción automática.**
