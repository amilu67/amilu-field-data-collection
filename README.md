# Amilu Field Data Collection

**Plugin WordPress per la raccolta dati sul campo con app mobile PWA offline-first.**

Ispirato a [Epicollect5](https://five.epicollect.net/), Amilu Field Data Collection permette di creare form personalizzati tramite un editor drag & drop, raccogliere dati sul campo con un'app mobile installabile (PWA), e sincronizzare tutto con il tuo sito WordPress.

![WordPress](https://img.shields.io/badge/WordPress-6.0%2B-blue?logo=wordpress)
![PHP](https://img.shields.io/badge/PHP-7.4%2B-777BB4?logo=php)
![License](https://img.shields.io/badge/License-GPL%20v2-green)
![Version](https://img.shields.io/badge/Version-2.1.0-667eea)

---

## Funzionalità

### Form Builder Drag & Drop
- **20 tipi di campo**: text, number, email, phone, URL, textarea, dropdown, radio, checkbox, date, time, datetime, photo, audio, video, location (GPS), barcode/QR, signature, rating, slider
- **Drag & drop** dalla palette al canvas con riordinamento libero
- **Pannello proprietà** per ogni campo: label, required, placeholder, validazione (min/max/step/pattern/regex)
- **Flow logic stile Epicollect**: per i campi select/radio, definisci regole "se l'utente sceglie X → salta al campo Y"
- **Anteprima mobile live** in un mockup telefono
- **Font Awesome 6** per le icone di tutti i tipi di campo

### App Mobile PWA
- **Offline-first**: funziona senza connessione, i dati sono salvati in IndexedDB
- **Installabile** su qualsiasi dispositivo mobile (Android, iOS) come app nativa
- **Sincronizzazione automatica** quando torna la connessione
- **Scansione barcode/QR** con la fotocamera tramite [html5-qrcode](https://github.com/mebjas/html5-qrcode)
- **GPS, foto, audio, video, firma digitale, rating a stelle**
- **UI Material Design** con bottom navigation, toast, animazioni

### Admin WordPress
- **Dashboard** con statistiche, grafici (Chart.js), e link rapidi
- **Visualizzazione entries** con mappa Leaflet interattiva per le entry geolocalizzate
- **Modale dettaglio** con label leggibili dei campi (non codici)
- **Export CSV** dei dati raccolti
- **Cancellazione entries** con soft-delete via AJAX
- **Gestione API key** per l'autenticazione mobile
- **REST API** completa per la sincronizzazione

### Sicurezza
- Conformità alle [WordPress Security APIs](https://developer.wordpress.org/apis/security/)
- Escape late su tutti gli output (`esc_html()`, `esc_attr()`, `esc_url()`)
- Sanitizzazione ricorsiva della struttura form (field types safelist, cast numerico, `sanitize_text_field`)
- Timing-safe API key comparison (`hash_equals`)
- SQL injection prevention (whitelist ORDER BY, `$wpdb->prepare`)
- Validazione UUID e datetime su input
- File upload: whitelist MIME + estensioni, `wp_check_filetype`, limite 50 MB
- Nonce verification su tutte le azioni admin e AJAX
- `uninstall.php` per pulizia completa alla rimozione

---

## Requisiti

- WordPress 6.0+
- PHP 7.4+
- MySQL 5.7+ / MariaDB 10.3+
- HTTPS consigliato (necessario per PWA e geolocation)

---

## Installazione

### Da GitHub (manuale)

1. Scarica lo zip del repository o clona:
   ```bash
   git clone https://github.com/amilu67/amilu-field-data-collection.git mfdatacollection
   ```
2. Copia la cartella `mfdatacollection` in `wp-content/plugins/`
3. Attiva il plugin da **Plugin → Plugin installati** in WordPress
4. Vai su **Amilu Field Data Collection → Settings** e genera una API key

### Da ZIP

1. Scarica il file `.zip` dalla pagina [Releases](https://github.com/amilu67/amilu-field-data-collection/releases)
2. In WordPress: **Plugin → Aggiungi nuovo → Carica plugin**
3. Seleziona lo zip e clicca **Installa ora**

---

## Utilizzo

### 1. Crea un progetto
- Vai su **Amilu Field Data Collection → New Project**
- Usa il form builder drag & drop per creare il modulo
- Configura la flow logic per i campi a scelta (opzionale)
- Pubblica il progetto

### 2. Configura l'app mobile
- Vai su **Amilu Field Data Collection → Settings**
- Genera una API key
- Apri l'URL della PWA: `https://tuosito.it/mfdc-app/`
- Nell'app, vai in **Settings** e inserisci API URL e API Key
- Installa l'app sul dispositivo (banner "Aggiungi alla Home")

### 3. Raccogli dati
- Apri l'app mobile, seleziona il progetto
- Compila il form (funziona anche offline)
- I dati si sincronizzano automaticamente quando c'è connessione

### 4. Visualizza i dati
- In WordPress: **Amilu Field Data Collection → Entries**
- Seleziona un progetto per vedere tabella + mappa
- Clicca **View** per il dettaglio, **Delete** per rimuovere
- **Export to CSV** per scaricare i dati

---

## Struttura del progetto

```
mfdatacollection/
├── mfdatacollection.php      # File principale del plugin
├── uninstall.php              # Pulizia dati alla disinstallazione
├── includes/
│   ├── Installer.php          # Creazione tabelle DB e directory
│   ├── Admin/
│   │   └── Admin.php          # Dashboard, entries, settings admin
│   ├── API/
│   │   └── RestAPI.php        # REST API per la PWA
│   ├── Database/
│   │   └── EntryManager.php   # CRUD entries e media
│   └── PostTypes/
│       └── Project.php        # Custom post type + form builder
├── assets/
│   ├── css/
│   │   ├── admin.css          # Stili admin WordPress
│   │   └── form-builder.css   # Stili form builder drag & drop
│   └── js/
│       ├── admin.js           # JS admin (charts, modal, map, delete)
│       └── form-builder.js    # JS form builder (DnD, properties, flow logic)
└── pwa/
    ├── index.html             # Shell dell'app PWA
    ├── manifest.json          # PWA manifest
    ├── sw.js                  # Service Worker (offline caching)
    ├── css/
    │   └── app.css            # Stili mobile Material Design
    ├── js/
    │   ├── app.js             # SPA router e logica principale
    │   ├── db.js              # IndexedDB wrapper
    │   ├── sync.js            # Motore di sincronizzazione
    │   └── form-renderer.js   # Renderer form dinamico + html5-qrcode
    └── icons/
        ├── icon-192.svg       # Icona PWA 192px
        └── icon-512.svg       # Icona PWA 512px
```

---

## REST API

Base URL: `https://tuosito.it/wp-json/mfdc/v1`

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/projects` | Lista progetti attivi |
| `GET` | `/projects/{id}` | Dettaglio progetto + form structure |
| `POST` | `/entries` | Crea nuova entry |
| `GET` | `/entries/{id}` | Dettaglio entry |
| `GET` | `/projects/{id}/entries` | Entries di un progetto (paginato) |
| `POST` | `/media` | Upload file media |
| `POST` | `/sync` | Sync batch di entries |

**Autenticazione**: header `X-API-Key: <your-key>` oppure cookie WordPress per utenti loggati.

---

## Librerie esterne (via CDN)

- [Font Awesome 6 Free](https://fontawesome.com/) — icone
- [Chart.js 4](https://www.chartjs.org/) — grafici dashboard
- [Leaflet 1.9](https://leafletjs.com/) — mappa entries
- [html5-qrcode](https://github.com/mebjas/html5-qrcode) — scanner barcode/QR nella PWA

---

## Changelog

### 2.1.0
- Aggiunta flow logic (jump rules) stile Epicollect per campi select/radio
- Mappa Leaflet nella pagina Entries con popup e accesso ai dettagli
- Label leggibili nella visualizzazione entries (risoluzione field_id → label)
- Parametri campo: placeholder, step, min/max con supporto valore 0
- Sicurezza: sanitizzazione ricorsiva form structure, validazione UUID/datetime
- Fix badge dashboard responsive
- Fix palette form builder su mobile (layout chip compatto)

### 2.0.0
- Riscrittura completa del plugin
- Form builder drag & drop con 20 tipi di campo e Font Awesome
- App mobile PWA offline-first con sincronizzazione automatica
- Scanner barcode/QR con html5-qrcode
- REST API con autenticazione API key (hash_equals)
- Dashboard con statistiche e grafici
- Sicurezza: escape late, sanitizzazione input, SQL injection prevention

---

## Licenza

GPL v2 or later — [https://www.gnu.org/licenses/gpl-2.0.html](https://www.gnu.org/licenses/gpl-2.0.html)

---

## Autore

**Michele Fioretti** — [@amilu67](https://github.com/amilu67)
