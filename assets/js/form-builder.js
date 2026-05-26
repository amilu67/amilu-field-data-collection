/**
 * Amilu Field Data Collection WP — Drag & Drop Form Builder
 * Uses native HTML5 Drag & Drop API + Font Awesome 6 icons.
 */
(function () {
    'use strict';

    /* ── Field type registry ─────────────────────────────────── */
    const FIELD_TYPES = {
        // Basic
        text:      { label: 'Text',       icon: 'fa-solid fa-font',              group: 'basic' },
        number:    { label: 'Number',     icon: 'fa-solid fa-hashtag',            group: 'basic' },
        email:     { label: 'Email',      icon: 'fa-solid fa-envelope',           group: 'basic' },
        phone:     { label: 'Phone',      icon: 'fa-solid fa-phone',              group: 'basic' },
        url:       { label: 'URL',        icon: 'fa-solid fa-link',               group: 'basic' },
        textarea:  { label: 'Textarea',   icon: 'fa-solid fa-align-left',         group: 'basic' },
        // Choice
        select:    { label: 'Dropdown',   icon: 'fa-solid fa-caret-down',         group: 'choice' },
        radio:     { label: 'Radio',      icon: 'fa-solid fa-circle-dot',         group: 'choice' },
        checkbox:  { label: 'Checkbox',   icon: 'fa-solid fa-square-check',       group: 'choice' },
        // Date / Time
        date:      { label: 'Date',       icon: 'fa-solid fa-calendar-day',       group: 'datetime' },
        time:      { label: 'Time',       icon: 'fa-solid fa-clock',              group: 'datetime' },
        datetime:  { label: 'Date+Time',  icon: 'fa-solid fa-calendar-clock',     group: 'datetime' },
        // Media
        photo:     { label: 'Photo',      icon: 'fa-solid fa-camera',             group: 'media' },
        audio:     { label: 'Audio',      icon: 'fa-solid fa-microphone',         group: 'media' },
        video:     { label: 'Video',      icon: 'fa-solid fa-video',              group: 'media' },
        // Advanced
        location:  { label: 'Location',   icon: 'fa-solid fa-location-dot',       group: 'advanced' },
        barcode:   { label: 'Barcode/QR', icon: 'fa-solid fa-qrcode',             group: 'advanced' },
        signature: { label: 'Signature',  icon: 'fa-solid fa-signature',          group: 'advanced' },
        rating:    { label: 'Rating',     icon: 'fa-solid fa-star',               group: 'advanced' },
        range:     { label: 'Slider',     icon: 'fa-solid fa-sliders',            group: 'advanced' },
    };

    const GROUP_LABELS = {
        basic:    'Basic Fields',
        choice:   'Choice Fields',
        datetime: 'Date & Time',
        media:    'Media Capture',
        advanced: 'Advanced',
    };

    /* ── State ────────────────────────────────────────────────── */
    let fields = [];
    let selectedIndex = -1;
    let dragSrcIndex = -1;
    let dragFromPalette = null;

    /* ── DOM refs (set in init) ───────────────────────────────── */
    let $dropzone, $props, $textarea, $countBadge, $previewScreen;

    /* ── Helpers ──────────────────────────────────────────────── */
    const uid = () => 'field_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

    function save() {
        if ($textarea) $textarea.value = JSON.stringify({ fields });
    }

    /* ── Palette rendering ────────────────────────────────────── */
    function buildPalette(container) {
        const grouped = {};
        for (const [type, meta] of Object.entries(FIELD_TYPES)) {
            (grouped[meta.group] = grouped[meta.group] || []).push({ type, ...meta });
        }
        let html = '';
        for (const [group, items] of Object.entries(grouped)) {
            html += `<div class="amilfida-palette-group">
                <div class="amilfida-palette-group-title">${GROUP_LABELS[group] || group}</div>`;
            for (const item of items) {
                html += `<div class="amilfida-palette-item" draggable="true" data-type="${item.type}">
                    <i class="${item.icon}"></i> ${item.label}
                </div>`;
            }
            html += '</div>';
        }
        container.innerHTML = html;

        // Palette drag events
        container.querySelectorAll('.amilfida-palette-item').forEach(el => {
            el.addEventListener('dragstart', e => {
                dragFromPalette = el.dataset.type;
                dragSrcIndex = -1;
                el.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('text/plain', el.dataset.type);
            });
            el.addEventListener('dragend', () => {
                el.classList.remove('dragging');
                dragFromPalette = null;
            });
        });
    }

    /* ── Drop zone rendering ──────────────────────────────────── */
    function renderDropzone() {
        if (fields.length === 0) {
            $dropzone.innerHTML = `<div class="amilfida-dropzone-empty">
                <i class="fa-solid fa-arrow-down-to-bracket"></i>
                <p><strong>Drag fields here</strong></p>
                <p>Choose from the palette on the left</p>
            </div>`;
        } else {
            $dropzone.innerHTML = fields.map((f, i) => {
                const meta = FIELD_TYPES[f.type] || FIELD_TYPES.text;
                const hasJumps = f.jumps && (f.jumps.length > 0 || f.jump_always);
                const jumpBadge = hasJumps
                    ? '<span class="amilfida-field-jump-badge" title="Has flow logic"><i class="fa-solid fa-code-branch"></i></span>'
                    : '';
                return `<div class="amilfida-field-card ${i === selectedIndex ? 'selected' : ''}"
                             draggable="true" data-index="${i}">
                    <span class="amilfida-drag-handle"><i class="fa-solid fa-grip-vertical"></i></span>
                    <span class="amilfida-field-icon amilfida-type-${f.type}"><i class="${meta.icon}"></i></span>
                    <div class="amilfida-field-info">
                        <div class="field-label">${escHtml(f.label)}</div>
                        <div class="field-type">${meta.label}${jumpBadge}</div>
                    </div>
                    ${f.required ? '<span class="amilfida-field-required">REQUIRED</span>' : ''}
                    <div class="amilfida-field-actions">
                        <button type="button" class="btn-dup" title="Duplicate" data-idx="${i}"><i class="fa-solid fa-clone"></i></button>
                        <button type="button" class="btn-delete" title="Delete" data-idx="${i}"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>`;
            }).join('');
        }
        $countBadge.textContent = fields.length + ' field' + (fields.length !== 1 ? 's' : '');
        bindCardEvents();
        save();
        renderPreview();
    }

    function bindCardEvents() {
        $dropzone.querySelectorAll('.amilfida-field-card').forEach(card => {
            card.addEventListener('click', () => {
                selectedIndex = +card.dataset.index;
                renderDropzone();
                renderProperties();
            });
            // Drag from canvas (reorder)
            card.addEventListener('dragstart', e => {
                dragSrcIndex = +card.dataset.index;
                dragFromPalette = null;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', dragSrcIndex);
                setTimeout(() => card.style.opacity = '.35', 0);
            });
            card.addEventListener('dragend', () => { card.style.opacity = ''; });
        });

        // Delete / Duplicate buttons
        $dropzone.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const idx = +btn.dataset.idx;
                fields.splice(idx, 1);
                if (selectedIndex >= fields.length) selectedIndex = fields.length - 1;
                if (selectedIndex === idx) selectedIndex = -1;
                renderDropzone();
                renderProperties();
            });
        });
        $dropzone.querySelectorAll('.btn-dup').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const idx = +btn.dataset.idx;
                const clone = JSON.parse(JSON.stringify(fields[idx]));
                clone.id = uid();
                clone.label += ' (copy)';
                fields.splice(idx + 1, 0, clone);
                selectedIndex = idx + 1;
                renderDropzone();
                renderProperties();
            });
        });
    }

    /* ── Drop zone DnD handlers ───────────────────────────────── */
    function initDropzone() {
        $dropzone.addEventListener('dragover', e => {
            e.preventDefault();
            e.dataTransfer.dropEffect = dragFromPalette ? 'copy' : 'move';
            $dropzone.classList.add('drag-over');
        });
        $dropzone.addEventListener('dragleave', () => $dropzone.classList.remove('drag-over'));
        $dropzone.addEventListener('drop', e => {
            e.preventDefault();
            $dropzone.classList.remove('drag-over');

            // Determine drop index
            const cards = [...$dropzone.querySelectorAll('.amilfida-field-card')];
            let dropIdx = fields.length;
            for (let i = 0; i < cards.length; i++) {
                const rect = cards[i].getBoundingClientRect();
                if (e.clientY < rect.top + rect.height / 2) { dropIdx = i; break; }
            }

            if (dragFromPalette) {
                // Add new field from palette
                const newField = createDefaultField(dragFromPalette);
                fields.splice(dropIdx, 0, newField);
                selectedIndex = dropIdx;
            } else if (dragSrcIndex >= 0) {
                // Reorder
                const moved = fields.splice(dragSrcIndex, 1)[0];
                const adjusted = dropIdx > dragSrcIndex ? dropIdx - 1 : dropIdx;
                fields.splice(adjusted, 0, moved);
                selectedIndex = adjusted;
            }
            dragFromPalette = null;
            dragSrcIndex = -1;
            renderDropzone();
            renderProperties();
        });
    }

    function createDefaultField(type) {
        const meta = FIELD_TYPES[type] || FIELD_TYPES.text;
        const f = {
            id: uid(),
            type,
            label: 'New ' + meta.label,
            required: false,
            validation: {},
        };
        if (['select', 'radio', 'checkbox'].includes(type)) {
            f.options = ['Option 1', 'Option 2'];
        }
        if (type === 'rating') {
            f.validation = { max: 5 };
        }
        if (type === 'range') {
            f.validation = { min: 0, max: 100 };
        }
        return f;
    }

    /* ── Properties panel ─────────────────────────────────────── */
    function renderProperties() {
        if (selectedIndex < 0 || selectedIndex >= fields.length) {
            $props.innerHTML = `<div class="amilfida-properties-empty">
                <i class="fa-solid fa-hand-pointer"></i>
                Select a field to edit its properties
            </div>`;
            return;
        }
        const f = fields[selectedIndex];
        const meta = FIELD_TYPES[f.type] || FIELD_TYPES.text;
        const v = f.validation || {};

        let html = `
            <div class="amilfida-prop-group">
                <label>Field Type</label>
                <div style="display:flex;align-items:center;gap:8px;">
                    <span class="amilfida-field-icon amilfida-type-${f.type}" style="width:26px;height:26px;font-size:12px;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;color:#fff;">
                        <i class="${meta.icon}"></i>
                    </span>
                    <strong style="font-size:13px;">${meta.label}</strong>
                </div>
            </div>
            <div class="amilfida-prop-group">
                <label for="prop-label">Label</label>
                <input type="text" id="prop-label" value="${escAttr(f.label)}" />
            </div>
            <div class="amilfida-prop-group amilfida-prop-toggle">
                <label style="margin:0;">Required</label>
                <div class="amilfida-toggle">
                    <input type="checkbox" id="prop-required" ${f.required ? 'checked' : ''} />
                    <span class="amilfida-toggle-slider"></span>
                </div>
            </div>`;

        // Options for choice fields
        if (f.options) {
            html += `<div class="amilfida-prop-group">
                <label for="prop-options">Options (one per line)</label>
                <textarea id="prop-options">${escHtml((f.options || []).join('\n'))}</textarea>
            </div>`;
        }

        // Placeholder for text-like fields
        if (['text', 'textarea', 'email', 'phone', 'url', 'number'].includes(f.type)) {
            html += `<div class="amilfida-prop-group">
                <label for="prop-placeholder">Placeholder</label>
                <input type="text" id="prop-placeholder" value="${escAttr(f.placeholder || '')}" placeholder="Hint text shown in empty field" />
            </div>`;
        }

        // Validation for text-like
        if (['text', 'textarea', 'email', 'phone', 'url'].includes(f.type)) {
            html += `<div class="amilfida-prop-group">
                <label>Min Length</label>
                <input type="number" id="prop-v-minLength" value="${v.minLength ?? ''}" min="0" />
            </div>
            <div class="amilfida-prop-group">
                <label>Max Length</label>
                <input type="number" id="prop-v-maxLength" value="${v.maxLength ?? ''}" min="0" />
            </div>
            <div class="amilfida-prop-group">
                <label>Pattern (Regex)</label>
                <input type="text" id="prop-v-pattern" value="${escAttr(v.pattern || '')}" placeholder="e.g. ^[A-Z]{2}\\d{4}$" />
            </div>`;
        }

        // Validation for number / range / rating
        if (['number', 'range', 'rating'].includes(f.type)) {
            html += `<div class="amilfida-prop-group">
                <label>Min Value</label>
                <input type="number" id="prop-v-min" value="${v.min ?? ''}" step="any" />
            </div>
            <div class="amilfida-prop-group">
                <label>Max Value</label>
                <input type="number" id="prop-v-max" value="${v.max ?? ''}" step="any" />
            </div>`;
        }

        // Step for number / range
        if (['number', 'range'].includes(f.type)) {
            html += `<div class="amilfida-prop-group">
                <label>Step</label>
                <input type="number" id="prop-v-step" value="${v.step ?? ''}" min="0" step="any" placeholder="e.g. 0.5" />
            </div>`;
        }

        // Custom error message for all
        html += `<div class="amilfida-prop-group">
            <label>Custom Error Message</label>
            <input type="text" id="prop-v-message" value="${escAttr(v.message || '')}" placeholder="Validation error text" />
        </div>`;

        // ── Flow Logic (Epicollect-style jumps) ──
        html += renderFlowLogic(f, selectedIndex);

        $props.innerHTML = html;
        bindPropertyEvents();
        bindFlowEvents(f);
    }

    function bindPropertyEvents() {
        const f = fields[selectedIndex];
        if (!f) return;
        const v = f.validation = f.validation || {};

        on('prop-label',       'input',  val => { f.label = val; renderDropzone(); });
        on('prop-required',    'change', (_, el) => { f.required = el.checked; renderDropzone(); });
        on('prop-placeholder', 'input',  val => { f.placeholder = val || undefined; save(); });
        on('prop-options',     'input',  val => { f.options = val.split('\n').filter(o => o.trim()); renderPreview(); save(); });
        on('prop-v-minLength', 'input',  val => { v.minLength = intOrUndef(val); save(); });
        on('prop-v-maxLength', 'input',  val => { v.maxLength = intOrUndef(val); save(); });
        on('prop-v-pattern',   'input',  val => { v.pattern = val || undefined; save(); });
        on('prop-v-min',       'input',  val => { v.min = numOrUndef(val); renderPreview(); save(); });
        on('prop-v-max',       'input',  val => { v.max = numOrUndef(val); renderPreview(); save(); });
        on('prop-v-step',      'input',  val => { v.step = numOrUndef(val); save(); });
        on('prop-v-message',   'input',  val => { v.message = val || undefined; save(); });
    }

    function on(id, evt, cb) {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener(evt, () => cb(el.type === 'checkbox' ? el.checked : el.value, el));
    }

    function intOrUndef(v) { const n = parseInt(v, 10); return isNaN(n) ? undefined : n; }
    function numOrUndef(v) { const n = parseFloat(v); return isNaN(n) ? undefined : n; }

    /* ── Flow Logic (Epicollect-style jump/skip) ──────────────── */

    /**
     * Build destination <select> options for jump targets.
     * Options: next field (default), every other field by label, END (end of form).
     */
    function jumpDestOptions(currentIdx, selectedDest) {
        let opts = `<option value="" ${!selectedDest ? 'selected' : ''}>Next question</option>`;
        fields.forEach((f, i) => {
            if (i === currentIdx) return;
            const sel = selectedDest === f.id ? 'selected' : '';
            opts += `<option value="${f.id}" ${sel}>${escHtml(f.label)} (#${i + 1})</option>`;
        });
        opts += `<option value="END" ${selectedDest === 'END' ? 'selected' : ''}>End of form</option>`;
        return opts;
    }

    /**
     * Render the Flow Logic section in the properties panel.
     * - For select/radio: per-option jump rules (like Epicollect)
     * - For all fields: "Always jump to" rule
     */
    function renderFlowLogic(f, idx) {
        const isChoice = ['select', 'radio'].includes(f.type);
        if (!f.jumps) f.jumps = [];

        let html = `<div class="amilfida-prop-group" style="border-top:2px solid #667eea;margin-top:8px;padding-top:14px;">
            <label style="color:#667eea;font-size:12px;"><i class="fa-solid fa-code-branch"></i> FLOW LOGIC</label>
            <p style="font-size:11px;color:#8b949e;margin:4px 0 10px;">Control which question appears next based on the answer.</p>`;

        if (isChoice && f.options && f.options.length > 0) {
            html += `<div style="font-size:11px;font-weight:600;color:#57606a;margin-bottom:6px;">If answer is…</div>`;
            f.options.forEach((opt, oi) => {
                const existing = f.jumps.find(j => j.value === opt);
                const dest = existing ? existing.dest : '';
                html += `<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
                    <span style="flex:0 0 auto;font-size:12px;color:#24292f;min-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escAttr(opt)}">${escHtml(opt)}</span>
                    <i class="fa-solid fa-arrow-right" style="color:#8b949e;font-size:10px;"></i>
                    <select class="flow-option-jump" data-option="${oi}" style="flex:1;padding:5px 8px;border:1px solid #d0d7de;border-radius:5px;font-size:12px;">
                        ${jumpDestOptions(idx, dest)}
                    </select>
                </div>`;
            });
            html += `<hr style="border:none;border-top:1px solid #eaedf0;margin:10px 0;">`;
        }

        // Always jump to (for non-choice fields, or as override)
        html += `<div style="font-size:11px;font-weight:600;color:#57606a;margin-bottom:6px;">${isChoice ? 'Default (no match)' : 'Always jump to'}</div>
            <select id="flow-always-jump" style="width:100%;padding:6px 8px;border:1px solid #d0d7de;border-radius:5px;font-size:12px;">
                ${jumpDestOptions(idx, f.jump_always || '')}
            </select>`;

        html += `</div>`;
        return html;
    }

    /**
     * Bind events for the flow logic controls.
     */
    function bindFlowEvents(f) {
        // Per-option jumps (select/radio)
        document.querySelectorAll('.flow-option-jump').forEach(sel => {
            sel.addEventListener('change', () => {
                const optIdx = +sel.dataset.option;
                const optVal = f.options[optIdx];
                const dest = sel.value;
                if (!f.jumps) f.jumps = [];
                // Remove existing jump for this option
                f.jumps = f.jumps.filter(j => j.value !== optVal);
                // Add new one if not default
                if (dest) {
                    f.jumps.push({ value: optVal, dest: dest });
                }
                save();
                renderDropzone();
            });
        });

        // Always jump
        const alwaysEl = document.getElementById('flow-always-jump');
        if (alwaysEl) {
            alwaysEl.addEventListener('change', () => {
                f.jump_always = alwaysEl.value || undefined;
                save();
                renderDropzone();
            });
        }
    }

    /* ── Live Preview ─────────────────────────────────────────── */
    function renderPreview() {
        if (!$previewScreen) return;
        if (fields.length === 0) {
            $previewScreen.innerHTML = '<p style="text-align:center;color:#8b949e;padding:40px 0;">Add fields to see a preview</p>';
            return;
        }
        $previewScreen.innerHTML = fields.map(f => {
            const meta = FIELD_TYPES[f.type] || FIELD_TYPES.text;
            const req = f.required ? '<span class="required-star">*</span>' : '';
            const lbl = `<label>${escHtml(f.label)}${req}</label>`;

            switch (f.type) {
                case 'text':
                case 'email':
                case 'phone':
                case 'url':
                    return `<div class="preview-field">${lbl}<input type="${f.type === 'phone' ? 'tel' : f.type}" placeholder="${meta.label}…" disabled /></div>`;
                case 'number':
                    return `<div class="preview-field">${lbl}<input type="number" placeholder="0" disabled /></div>`;
                case 'textarea':
                    return `<div class="preview-field">${lbl}<textarea rows="3" placeholder="Type here…" disabled></textarea></div>`;
                case 'select':
                    return `<div class="preview-field">${lbl}<select disabled><option>— Select —</option>${(f.options||[]).map(o=>`<option>${escHtml(o)}</option>`).join('')}</select></div>`;
                case 'radio':
                    return `<div class="preview-field">${lbl}<div class="preview-radio-group">${(f.options||[]).map(o=>`<label><input type="radio" disabled />${escHtml(o)}</label>`).join('')}</div></div>`;
                case 'checkbox':
                    return `<div class="preview-field">${lbl}<div class="preview-checkbox-group">${(f.options||[]).map(o=>`<label><input type="checkbox" disabled />${escHtml(o)}</label>`).join('')}</div></div>`;
                case 'date':
                    return `<div class="preview-field">${lbl}<input type="date" disabled /></div>`;
                case 'time':
                    return `<div class="preview-field">${lbl}<input type="time" disabled /></div>`;
                case 'datetime':
                    return `<div class="preview-field">${lbl}<input type="datetime-local" disabled /></div>`;
                case 'photo':
                    return `<div class="preview-field">${lbl}<div class="preview-media-btn"><i class="fa-solid fa-camera"></i> Tap to take photo</div></div>`;
                case 'audio':
                    return `<div class="preview-field">${lbl}<div class="preview-media-btn"><i class="fa-solid fa-microphone"></i> Tap to record audio</div></div>`;
                case 'video':
                    return `<div class="preview-field">${lbl}<div class="preview-media-btn"><i class="fa-solid fa-video"></i> Tap to record video</div></div>`;
                case 'location':
                    return `<div class="preview-field">${lbl}<div class="preview-location-box"><i class="fa-solid fa-location-dot"></i> Acquire GPS position</div></div>`;
                case 'barcode':
                    return `<div class="preview-field">${lbl}<div class="preview-media-btn"><i class="fa-solid fa-qrcode"></i> Scan barcode / QR code</div></div>`;
                case 'signature':
                    return `<div class="preview-field">${lbl}<div class="preview-media-btn" style="min-height:100px;"><i class="fa-solid fa-signature"></i> Tap to sign</div></div>`;
                case 'rating': {
                    const max = (f.validation && f.validation.max) || 5;
                    return `<div class="preview-field">${lbl}<div class="preview-rating">${'<i class="fa-solid fa-star"></i>'.repeat(max)}</div></div>`;
                }
                case 'range': {
                    const min = (f.validation && f.validation.min) ?? 0;
                    const max = (f.validation && f.validation.max) ?? 100;
                    return `<div class="preview-field">${lbl}<input type="range" class="preview-range" min="${min}" max="${max}" disabled /></div>`;
                }
                default:
                    return `<div class="preview-field">${lbl}<input type="text" disabled /></div>`;
            }
        }).join('');
    }

    /* ── Escape helpers ───────────────────────────────────────── */
    function escHtml(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
    function escAttr(s) { return (s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

    /* ── Init ─────────────────────────────────────────────────── */
    function init() {
        const builder = document.getElementById('amilfida-form-builder');
        if (!builder) return;

        $textarea = document.getElementById('amilfida_form_structure');
        $dropzone = builder.querySelector('.amilfida-dropzone');
        $props = builder.querySelector('.amilfida-properties-body');
        $countBadge = builder.querySelector('.amilfida-canvas-count');
        $previewScreen = builder.querySelector('.amilfida-phone-screen');

        // Build palette
        buildPalette(builder.querySelector('.amilfida-palette-body'));

        // Load existing
        try {
            const data = JSON.parse($textarea.value);
            fields = Array.isArray(data.fields) ? data.fields : [];
        } catch (_) { fields = []; }

        initDropzone();
        renderDropzone();
        renderProperties();

        // Preview toggle
        const toggle = builder.querySelector('.amilfida-preview-toggle');
        const body = builder.querySelector('.amilfida-preview-body');
        if (toggle && body) {
            toggle.addEventListener('click', () => {
                toggle.classList.toggle('open');
                body.classList.toggle('open');
                if (body.classList.contains('open')) renderPreview();
            });
        }
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
