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

## 2️⃣ Screenshots de TanukiTrade - GEX LEVELS

### Qué Incluir:
- **Call Walls** - C1, C2, C3 (Muros de resistencia)
- **Put Walls** - P1, P2, P3 (Muros de soporte)
- **Net GEX** - Gamma Exposure total
- **Gamma Flip** - Cambio en dirección gamma

### Cómo Capturar:

1. **TanukiTrade Setup**
   ```
   Símbolo: SPY (o tu activo)
   Vista: GEX Levels
   Mostrar: Muros de llamadas y puts
   ```

2. **Asegúrate de que sea Legible**
   - Los números de C1, C2, C3 sean claros
   - Los números de P1, P2, P3 sean claros
   - El símbolo esté visible
   - Las líneas/números estén bien contrastados

3. **Captura**
   - Incluye toda la tabla de GEX
   - O al menos los valores principales

### Ejemplo de Salida Detectada:
```
CALL WALL 1 | 472.50 | GEX
CALL WALL 2 | 475.00 | GEX
CALL WALL 3 | 477.50 | GEX
PUT WALL 1 | 465.00 | GEX
PUT WALL 2 | 462.50 | GEX
PUT WALL 3 | 460.00 | GEX
NET GEX | 125000 | GEX
GAMMA FLIP | HVL | GEX
```

**Confianza Esperada: 85-98%**

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
