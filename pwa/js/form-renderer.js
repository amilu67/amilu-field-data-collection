/**
 * Amilu Field Data Collection PWA — Form Renderer
 * Renders form fields dynamically and collects values.
 * Integrates html5-qrcode for barcode/QR scanning.
 */
const AmilfidaForm = (() => {
    let _fields = [];
    let _values = {};
    let _scanners = {};
    let _sigCanvases = {};

    function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

    function render(container, fields) {
        _fields = fields;
        _values = {};
        _scanners = {};
        _sigCanvases = {};
        container.innerHTML = fields.map((f, i) => renderField(f, i)).join('');
        bindEvents(container);
    }

    function renderField(f, idx) {
        const req = f.required ? '<span class="required">*</span>' : '';
        const lbl = `<label>${esc(f.label)}${req}</label>`;
        const id = `field_${idx}`;
        const v = f.validation || {};

        switch (f.type) {
            case 'text':
            case 'email':
            case 'phone':
            case 'url': {
                const t = f.type === 'phone' ? 'tel' : f.type;
                return `<div class="form-group" data-idx="${idx}">${lbl}
                    <input type="${t}" id="${id}" placeholder="${esc(f.label)}" />
                    <div class="field-error"></div></div>`;
            }
            case 'number':
                return `<div class="form-group" data-idx="${idx}">${lbl}
                    <input type="number" id="${id}" placeholder="0" ${v.min != null ? `min="${v.min}"` : ''} ${v.max != null ? `max="${v.max}"` : ''} />
                    <div class="field-error"></div></div>`;
            case 'textarea':
                return `<div class="form-group" data-idx="${idx}">${lbl}
                    <textarea id="${id}" rows="3" placeholder="${esc(f.label)}"></textarea>
                    <div class="field-error"></div></div>`;
            case 'select':
                return `<div class="form-group" data-idx="${idx}">${lbl}
                    <select id="${id}"><option value="">— Select —</option>${(f.options||[]).map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select>
                    <div class="field-error"></div></div>`;
            case 'radio':
                return `<div class="form-group" data-idx="${idx}">${lbl}
                    <div class="option-group">${(f.options||[]).map((o,j) => `<label><input type="radio" name="${id}" value="${esc(o)}" />${esc(o)}</label>`).join('')}</div>
                    <div class="field-error"></div></div>`;
            case 'checkbox':
                return `<div class="form-group" data-idx="${idx}">${lbl}
                    <div class="option-group">${(f.options||[]).map((o,j) => `<label><input type="checkbox" name="${id}" value="${esc(o)}" />${esc(o)}</label>`).join('')}</div>
                    <div class="field-error"></div></div>`;
            case 'date':
                return `<div class="form-group" data-idx="${idx}">${lbl}<input type="date" id="${id}" /><div class="field-error"></div></div>`;
            case 'time':
                return `<div class="form-group" data-idx="${idx}">${lbl}<input type="time" id="${id}" /><div class="field-error"></div></div>`;
            case 'datetime':
                return `<div class="form-group" data-idx="${idx}">${lbl}<input type="datetime-local" id="${id}" /><div class="field-error"></div></div>`;
            case 'photo':
                return `<div class="form-group" data-idx="${idx}">${lbl}
                    <div class="media-capture-btn" id="${id}_btn"><i class="fa-solid fa-camera"></i> Tap to take photo</div>
                    <input type="file" id="${id}" accept="image/*" capture="environment" style="display:none" />
                    <div class="field-error"></div></div>`;
            case 'audio':
                return `<div class="form-group" data-idx="${idx}">${lbl}
                    <div class="media-capture-btn" id="${id}_btn"><i class="fa-solid fa-microphone"></i> Tap to record audio</div>
                    <input type="file" id="${id}" accept="audio/*" capture style="display:none" />
                    <div class="field-error"></div></div>`;
            case 'video':
                return `<div class="form-group" data-idx="${idx}">${lbl}
                    <div class="media-capture-btn" id="${id}_btn"><i class="fa-solid fa-video"></i> Tap to record video</div>
                    <input type="file" id="${id}" accept="video/*" capture style="display:none" />
                    <div class="field-error"></div></div>`;
            case 'location':
                return `<div class="form-group" data-idx="${idx}">${lbl}
                    <div class="media-capture-btn" id="${id}_btn"><i class="fa-solid fa-location-dot"></i> Acquire GPS position</div>
                    <div class="location-display" id="${id}_display" style="display:none;"><i class="fa-solid fa-check-circle"></i> <span></span></div>
                    <div class="field-error"></div></div>`;
            case 'barcode':
                return `<div class="form-group" data-idx="${idx}">${lbl}
                    <div class="media-capture-btn" id="${id}_btn"><i class="fa-solid fa-qrcode"></i> Scan barcode / QR code</div>
                    <div class="qr-reader-area" id="${id}_reader"></div>
                    <div class="qr-result" id="${id}_result"><i class="fa-solid fa-check"></i> <span></span></div>
                    <input type="hidden" id="${id}" />
                    <div class="field-error"></div></div>`;
            case 'signature':
                return `<div class="form-group" data-idx="${idx}">${lbl}
                    <div class="signature-area" id="${id}_area">
                        <canvas id="${id}_canvas"></canvas>
                        <button type="button" class="sig-clear" id="${id}_clear">Clear</button>
                    </div>
                    <div class="field-error"></div></div>`;
            case 'rating': {
                const max = (v.max) || 5;
                return `<div class="form-group" data-idx="${idx}">${lbl}
                    <div class="rating-group" id="${id}">${Array.from({length: max}, (_, i) => `<i class="fa-solid fa-star star" data-val="${i+1}"></i>`).join('')}</div>
                    <div class="field-error"></div></div>`;
            }
            case 'range': {
                const min = v.min ?? 0, max = v.max ?? 100;
                return `<div class="form-group" data-idx="${idx}">${lbl}
                    <div class="range-group"><input type="range" id="${id}" min="${min}" max="${max}" value="${Math.round((min+max)/2)}" /><span class="range-value">${Math.round((min+max)/2)}</span></div>
                    <div class="field-error"></div></div>`;
            }
            default:
                return `<div class="form-group" data-idx="${idx}">${lbl}<input type="text" id="${id}" /><div class="field-error"></div></div>`;
        }
    }

    function bindEvents(container) {
        _fields.forEach((f, idx) => {
            const id = `field_${idx}`;

            // Media buttons
            if (['photo', 'audio', 'video'].includes(f.type)) {
                const btn = container.querySelector(`#${id}_btn`);
                const inp = container.querySelector(`#${id}`);
                if (btn && inp) {
                    btn.addEventListener('click', () => inp.click());
                    inp.addEventListener('change', () => {
                        if (inp.files.length) btn.classList.add('has-value');
                        btn.innerHTML = `<i class="fa-solid fa-check"></i> File selected`;
                    });
                }
            }

            // Location
            if (f.type === 'location') {
                const btn = container.querySelector(`#${id}_btn`);
                if (btn) btn.addEventListener('click', () => acquireLocation(idx));
            }

            // Barcode / QR — html5-qrcode
            if (f.type === 'barcode') {
                const btn = container.querySelector(`#${id}_btn`);
                if (btn) btn.addEventListener('click', () => startScanner(idx, container));
            }

            // Signature
            if (f.type === 'signature') {
                initSignaturePad(idx, container);
            }

            // Rating
            if (f.type === 'rating') {
                const group = container.querySelector(`#${id}`);
                if (group) {
                    group.querySelectorAll('.star').forEach(star => {
                        star.addEventListener('click', () => {
                            const val = +star.dataset.val;
                            _values[idx] = val;
                            group.querySelectorAll('.star').forEach((s, i) => s.classList.toggle('active', i < val));
                        });
                    });
                }
            }

            // Range
            if (f.type === 'range') {
                const inp = container.querySelector(`#${id}`);
                const valSpan = container.querySelector(`#${id}`)?.parentElement?.querySelector('.range-value');
                if (inp && valSpan) {
                    inp.addEventListener('input', () => { valSpan.textContent = inp.value; });
                }
            }
        });
    }

    function acquireLocation(idx) {
        const id = `field_${idx}`;
        const btn = document.getElementById(`${id}_btn`);
        const disp = document.getElementById(`${id}_display`);
        if (!navigator.geolocation) { AmilfidaApp.toast('GPS not available'); return; }

        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Acquiring…';

        navigator.geolocation.getCurrentPosition(
            pos => {
                _values[idx] = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy };
                btn.style.display = 'none';
                disp.style.display = 'flex';
                disp.classList.add('acquired');
                disp.querySelector('span').textContent = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)} (±${Math.round(pos.coords.accuracy)}m)`;
            },
            err => {
                btn.innerHTML = '<i class="fa-solid fa-location-dot"></i> Retry GPS';
                AmilfidaApp.toast('GPS error: ' + err.message);
            },
            { enableHighAccuracy: true, timeout: 15000 }
        );
    }

    function startScanner(idx, container) {
        const id = `field_${idx}`;
        const readerId = `${id}_reader`;
        const resultEl = document.getElementById(`${id}_result`);
        const hiddenInput = document.getElementById(id);
        const btn = document.getElementById(`${id}_btn`);

        // If scanner already running, stop it
        if (_scanners[idx]) {
            _scanners[idx].stop().then(() => { _scanners[idx] = null; });
            return;
        }

        if (typeof Html5Qrcode === 'undefined') {
            AmilfidaApp.toast('QR library not loaded');
            return;
        }

        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Scanning…';

        const scanner = new Html5Qrcode(readerId);
        _scanners[idx] = scanner;

        scanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            decodedText => {
                _values[idx] = decodedText;
                hiddenInput.value = decodedText;
                resultEl.querySelector('span').textContent = decodedText;
                resultEl.classList.add('visible');
                btn.innerHTML = '<i class="fa-solid fa-qrcode"></i> Scan again';
                btn.classList.add('has-value');
                scanner.stop().then(() => { _scanners[idx] = null; });
            },
            () => {} // ignore scan errors
        ).catch(err => {
            btn.innerHTML = '<i class="fa-solid fa-qrcode"></i> Scan barcode / QR code';
            AmilfidaApp.toast('Camera error: ' + err);
        });
    }

    function initSignaturePad(idx, container) {
        const id = `field_${idx}`;
        const canvas = container.querySelector(`#${id}_canvas`);
        const clearBtn = container.querySelector(`#${id}_clear`);
        if (!canvas) return;

        const area = canvas.parentElement;
        const ctx = canvas.getContext('2d');
        let drawing = false;

        function resize() {
            const rect = area.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#1a1a2e';
        }
        resize();
        window.addEventListener('resize', resize);

        function getPos(e) {
            const rect = canvas.getBoundingClientRect();
            const touch = e.touches ? e.touches[0] : e;
            return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
        }

        canvas.addEventListener('pointerdown', e => { drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); });
        canvas.addEventListener('pointermove', e => { if (!drawing) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); });
        canvas.addEventListener('pointerup', () => { drawing = false; _values[idx] = canvas.toDataURL('image/png'); });
        canvas.addEventListener('pointerleave', () => { drawing = false; });

        clearBtn.addEventListener('click', () => { ctx.clearRect(0, 0, canvas.width, canvas.height); _values[idx] = null; });

        _sigCanvases[idx] = canvas;
    }

    /**
     * Validate all fields and return { valid, data, errors }.
     */
    function validate() {
        const errors = [];
        const data = {};

        _fields.forEach((f, idx) => {
            const id = `field_${idx}`;
            const group = document.querySelector(`.form-group[data-idx="${idx}"]`);
            let val = _values[idx]; // pre-filled from special fields

            // Get value from standard inputs
            if (val === undefined) {
                if (f.type === 'radio') {
                    const checked = document.querySelector(`input[name="${id}"]:checked`);
                    val = checked ? checked.value : '';
                } else if (f.type === 'checkbox') {
                    val = [...document.querySelectorAll(`input[name="${id}"]:checked`)].map(c => c.value);
                } else {
                    const el = document.getElementById(id);
                    if (el) val = el.value;
                }
            }

            // Required check
            const empty = val === '' || val === undefined || val === null || (Array.isArray(val) && val.length === 0);
            if (f.required && empty) {
                errors.push({ idx, msg: f.validation?.message || `${f.label} is required` });
                if (group) { group.classList.add('has-error'); group.querySelector('.field-error').textContent = f.validation?.message || 'This field is required'; }
            } else {
                if (group) group.classList.remove('has-error');
            }

            data[f.id || id] = val;
        });

        return { valid: errors.length === 0, data, errors };
    }

    function cleanup() {
        // Stop any running scanners
        Object.values(_scanners).forEach(s => { if (s) s.stop().catch(() => {}); });
        _scanners = {};
        _sigCanvases = {};
        _values = {};
    }

    return { render, validate, cleanup };
})();
