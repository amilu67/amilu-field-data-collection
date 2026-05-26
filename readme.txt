=== Amilu Field Data Collection ===
Contributors: amilu67
Tags: data collection, forms, mobile, pwa, survey
Requires at least: 6.0
Tested up to: 7.0
Requires PHP: 7.4
Stable tag: 2.1.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Mobile data collection with drag & drop form builder and offline-first PWA app.

== Description ==

Amilu Field Data Collection is a WordPress plugin for field data collection, inspired by Epicollect5. It features a drag & drop form builder with 20 field types, a Progressive Web App (PWA) for offline mobile data collection, and automatic synchronization with your WordPress site.

**Key Features:**

* Drag & drop form builder with 20 field types
* Epicollect-style flow logic (jump rules) for conditional navigation
* Offline-first PWA mobile app with auto-sync
* Barcode/QR code scanning via html5-qrcode
* GPS, photo, audio, video, signature capture
* Leaflet map visualization for geolocated entries
* REST API for mobile synchronization
* CSV export
* Security: escape late, sanitized inputs, nonce verification, timing-safe API key comparison

== Installation ==

1. Upload the `amilu-field-data-collection` folder to `/wp-content/plugins/`
2. Activate the plugin through the Plugins menu in WordPress
3. Go to Amilu Field Data Collection > Settings and generate an API key
4. Open the PWA at `https://yoursite.com/amilfida-app/` on your mobile device

== Frequently Asked Questions ==

= Does it work offline? =

Yes. The PWA stores data in IndexedDB and syncs automatically when connectivity is restored.

= What field types are supported? =

Text, number, email, phone, URL, textarea, dropdown, radio, checkbox, date, time, datetime, photo, audio, video, GPS location, barcode/QR, signature, rating, and slider.

== Changelog ==

= 2.1.1 =
* Unique prefix: all functions, classes, defines, options and database tables now use the amilfida prefix
* Updated Chart.js to 4.5.1
* All third-party libraries bundled locally (Font Awesome, Chart.js, Leaflet, html5-qrcode)
* Replaced inline script tags with wp_add_inline_script
* Replaced move_uploaded_file with wp_handle_upload
* Granular REST API permission callbacks with capability checks per endpoint
* PWA manifest and service worker served via WordPress with correct scope headers
* Fixed Font Awesome webfont paths for local loading

= 2.1.0 =
* Added Epicollect-style flow logic (jump rules) for select/radio fields
* Added Leaflet map visualization on Entries page
* Human-readable field labels in entry detail view
* Added placeholder and step field parameters
* Security hardening per WordPress Security APIs
* Responsive palette layout on mobile

= 2.0.0 =
* Complete rewrite with drag & drop form builder
* Offline-first PWA mobile app
* REST API with API key authentication
* Dashboard with Chart.js statistics
* Barcode/QR scanning with html5-qrcode

== Upgrade Notice ==

= 2.1.1 =
Prefix rename and library updates. Required for WordPress.org compliance.
