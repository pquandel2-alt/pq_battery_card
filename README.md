# 🔋 Battery Card

Eine übersichtliche Lovelace-Karte für Home Assistant im Glasmorphism-Stil. Zeigt alle Batterie-Sensoren auf einen Blick – mit dynamischem Icon je nach Ladestand, farbigem Balken und einem visuellen Editor zur einfachen Verwaltung.

## ✨ Features

- **Visueller Editor** – Geräte per Knopfdruck automatisch laden oder einzeln hinzufügen, kein YAML nötig
- **Dynamisches Batterie-Icon** – wechselt von `mdi:battery` bis `mdi:battery-alert` je nach Ladestand
- **Farbkodierung** – Grün (>60%) → Gelb (>40%) → Orange (>20%) → Rot (≤20%)
- **Ladebalken** – kompakter Fortschrittsbalken pro Gerät
- **Kritisch-Badge** – Kopfzeile zeigt Anzahl kritischer Batterien (≤20%) auf einen Blick
- **Filter** – nur Geräte unter einem bestimmten Ladestand anzeigen
- **Sortierung** – nach Ladestand (niedrigster zuerst), absteigend oder alphabetisch
- **1–3 Spalten** – kompaktes Grid für viele Geräte
- **Max. Höhe** – scrollbare Liste bei vielen Einträgen
- **Glasmorphism-Design** – passend zu den anderen Widgets

## 📦 Installation

### Über HACS (empfohlen)

1. HACS → Frontend → ⋮ → **Custom Repositories**
2. URL: `https://github.com/pquandel2-alt/pq_battery_card` → Typ: **Lovelace**
3. Installieren und Seite neu laden

### Manuell

1. `battery-card.js` nach `/config/www/` kopieren
2. In `configuration.yaml` unter `lovelace → resources` eintragen:
   ```yaml
   resources:
     - url: /local/battery-card.js
       type: module
   ```

## ⚙️ Konfiguration

### Über den visuellen Editor (empfohlen)

1. Karte hinzufügen → **Battery Card** auswählen
2. Auf **„Alle Batterien automatisch laden"** klicken – alle erkannten Batterie-Sensoren werden in die Liste geladen
3. Einzelne Geräte über **×** entfernen oder weitere über das Suchfeld manuell hinzufügen

### Per YAML

#### Minimal – Geräte manuell angeben

```yaml
type: custom:battery-card
entities:
  - sensor.tursensor_schlafzimmer_battery
  - sensor.bewegungsmelder_flur_battery
```

#### Nur kritische Batterien anzeigen

```yaml
type: custom:battery-card
entities:
  - sensor.tursensor_schlafzimmer_battery
  - sensor.bewegungsmelder_flur_battery
min_level_filter: 20
title: Kritische Batterien
```

#### Vollständig

```yaml
type: custom:battery-card
entities:
  - sensor.tursensor_schlafzimmer_battery
  - sensor.bewegungsmelder_flur_battery
title: Batterien
show_header: true
show_bar: true
columns: 2
sort: asc
min_level_filter: null
max_height: 300
border_radius: 16
icon_size: 22
```

## 🔧 Optionen

| Option | Typ | Standard | Beschreibung |
|---|---|---|---|
| `entities` | liste | `[]` | Liste der anzuzeigenden Batterie-Sensoren |
| `title` | string | `Batterien` | Titel in der Kopfzeile |
| `show_header` | boolean | `true` | Kopfzeile mit Titel und Zähler anzeigen |
| `show_bar` | boolean | `true` | Ladebalken anzeigen |
| `columns` | number | `1` | Anzahl Spalten (1–3) |
| `sort` | string | `asc` | Sortierung: `asc`, `desc`, `name` |
| `min_level_filter` | number | – | Nur Geräte unter diesem Ladestand anzeigen |
| `max_height` | number | `0` | Max. Kartenhöhe in px (0 = unbegrenzt) |
| `border_radius` | number | `16` | Eckenradius in px |
| `icon_size` | number | `22` | Icon-Größe in px |

## 🎨 Farbkodierung

| Ladestand | Farbe | Bedeutung |
|---|---|---|
| > 60% | 🟢 Grün | Gut |
| 41–60% | 🟡 Gelb | Mittel |
| 21–40% | 🟠 Orange | Niedrig |
| ≤ 20% | 🔴 Rot | Kritisch |

## 📊 Sortierung

| Wert | Beschreibung |
|---|---|
| `asc` | Niedrigster Ladestand zuerst (Standard – kritische Geräte oben) |
| `desc` | Höchster Ladestand zuerst |
| `name` | Alphabetisch nach Gerätename |

## 🔗 Verwandte Projekte

- [Glass Button Card](https://github.com/pquandel2-alt/pq_glass-button-card) – Konfigurierbarer Button im gleichen Glasstil
- [Trash Widget Card](https://github.com/pquandel2-alt/pq_trash_widget_card) – Müllabholtermin im gleichen Glasstil
- [Weather Widget Card](https://github.com/pquandel2-alt/pq_weather_widget_card) – Wetter im gleichen Glasstil
