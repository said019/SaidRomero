# Solar Tracker v5.2 — PlatformIO / VS Code
**UT San Juan del Río | Tesis 2026**

---

## Requisitos

- VS Code instalado
- Extensión **PlatformIO IDE** instalada en VS Code
- ESP32 conectado por USB

---

## Estructura del proyecto

```
SolarTracker/
├── platformio.ini        ← configuración del proyecto
├── src/
│   └── main.cpp          ← código C++ del ESP32
├── data/
│   └── index.html        ← dashboard web (se sube por separado)
└── README.md
```

---

## Pasos para compilar y subir

### 1. Abrir proyecto
- En VS Code: **File → Open Folder** → selecciona la carpeta `SolarTracker`

### 2. Subir el código
```
PlatformIO (barra lateral) → esp32dev → Upload
```
O usa el botón **→** (flecha) de la barra inferior de PlatformIO.

### 3. Subir el HTML al filesystem (importante)
```
PlatformIO → esp32dev → Upload Filesystem Image
```
Esto sube `/data/index.html` al LittleFS del ESP32.  
**Sin este paso el dashboard no aparece.**

### 4. Verificar
- Abre el **Serial Monitor** (PlatformIO → Monitor)
- Verás la IP del ESP32, por ejemplo: `[WiFi] Conectado — IP: 192.168.1.XX`
- Abre esa IP en tu navegador

---

## Credenciales WiFi
Editar en `src/main.cpp`:
```cpp
const char* WIFI_SSID = "Totalplay-2.4G-0928";
const char* WIFI_PASS = "TQb7ZLCzNhWkwuGB";
```

Si no conecta a WiFi, el ESP32 crea un punto de acceso:
- **SSID:** SolarTracker  
- **Password:** solar1234  
- **URL:** http://192.168.4.1

---

## APIs Open-Meteo
- **Temperatura:** se actualiza cada 5 minutos
- **GHI + DNI:** se actualiza cada hora (datos horarios)
- Sin API key, completamente gratuito
- Coordenadas: San Juan del Río, Qro (20.3908, -99.9951)

---

## Librerías (se instalan automáticamente)
| Librería | Versión |
|----------|---------|
| Adafruit INA219 | ^1.2.1 |
| Adafruit GFX | ^1.11.9 |
| Adafruit SSD1306 | ^2.5.9 |
| ESP32Servo | ^3.0.5 |

---

## Pinout
| Pin | Función |
|-----|---------|
| GPIO 18 | Servo Horizontal |
| GPIO 19 | Servo Vertical |
| GPIO 32 | LDR Top-Left |
| GPIO 33 | LDR Top-Right |
| GPIO 25 | LDR Bottom-Left |
| GPIO 26 | LDR Bottom-Right |
| GPIO 21 | I2C SDA (INA219 + OLED) |
| GPIO 22 | I2C SCL (INA219 + OLED) |
