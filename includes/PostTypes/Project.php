<?php
namespace MFDataCollection\PostTypes;

if (!defined('ABSPATH')) {
    exit;
}

class Project {
    public function __construct() {
        add_action('init', [$this, 'register_post_type']);
        add_action('add_meta_boxes', [$this, 'add_meta_boxes']);
        add_action('save_post_mfdc_project', [$this, 'save_meta_boxes']);
    }

    public function register_post_type() {
        $labels = [
            'name'               => __('Projects', 'amilu-field-data-collection'),
            'singular_name'      => __('Project', 'amilu-field-data-collection'),
            'add_new'            => __('Add New', 'amilu-field-data-collection'),
            'add_new_item'       => __('Add New Project', 'amilu-field-data-collection'),
            'edit_item'          => __('Edit Project', 'amilu-field-data-collection'),
            'new_item'           => __('New Project', 'amilu-field-data-collection'),
            'view_item'          => __('View Project', 'amilu-field-data-collection'),
            'search_items'       => __('Search Projects', 'amilu-field-data-collection'),
            'not_found'          => __('No projects found', 'amilu-field-data-collection'),
            'not_found_in_trash' => __('No projects found in trash', 'amilu-field-data-collection'),
        ];

        register_post_type('mfdc_project', [
            'labels'        => $labels,
            'public'        => false,
            'show_ui'       => true,
            'show_in_menu'  => false, // shown inside our custom menu
            'menu_icon'     => 'dashicons-clipboard',
            'capability_type' => 'post',
            'hierarchical'  => false,
            'supports'      => ['title', 'editor', 'author'],
            'has_archive'   => false,
            'show_in_rest'  => true,
            'rest_base'     => 'mfdc-projects',
        ]);
    }

    public function add_meta_boxes() {
        add_meta_box(
            'mfdc_project_form',
            __('Form Builder — Drag & Drop', 'amilu-field-data-collection'),
            [$this, 'render_form_builder'],
            'mfdc_project',
            'normal',
            'high'
        );

        add_meta_box(
            'mfdc_project_settings',
            __('Project Settings', 'amilu-field-data-collection'),
            [$this, 'render_settings'],
            'mfdc_project',
            'side',
            'default'
        );
    }

    /**
     * Render the 3-panel drag & drop form builder.
     * All logic lives in assets/js/form-builder.js.
     */
    public function render_form_builder($post) {
        wp_nonce_field('mfdc_project_meta', 'mfdc_project_nonce');

        $form_structure = get_post_meta($post->ID, '_mfdc_form_structure', true);
        if (empty($form_structure)) {
            $form_structure = wp_json_encode(['fields' => []]);
        }
        ?>
        <div id="mfdc-form-builder" class="mfdc-builder">
            <!-- Left: Palette -->
            <div class="mfdc-palette">
                <div class="mfdc-palette-header"><i class="fa-solid fa-puzzle-piece"></i> Fields</div>
                <div class="mfdc-palette-body"></div>
            </div>

            <!-- Center: Canvas -->
            <div class="mfdc-canvas">
                <div class="mfdc-canvas-header">
                    <h3><i class="fa-solid fa-layer-group"></i> Form Fields</h3>
                    <span class="mfdc-canvas-count">0 fields</span>
                </div>
                <div class="mfdc-dropzone"></div>
            </div>

            <!-- Right: Properties -->
            <div class="mfdc-properties">
                <div class="mfdc-properties-header"><i class="fa-solid fa-sliders"></i> Properties</div>
                <div class="mfdc-properties-body"></div>
            </div>

            <!-- Bottom: Live Preview -->
            <div class="mfdc-preview-panel">
                <div class="mfdc-preview-toggle">
                    <i class="fa-solid fa-chevron-right"></i>
                    <span><i class="fa-solid fa-mobile-screen"></i> Mobile Preview</span>
                </div>
                <div class="mfdc-preview-body">
                    <div class="mfdc-phone-frame">
                        <div class="mfdc-phone-notch"><div class="mfdc-phone-notch-inner"></div></div>
                        <div class="mfdc-phone-screen"></div>
                        <div class="mfdc-phone-submit"><button type="button">Submit Entry</button></div>
                    </div>
                </div>
            </div>
        </div>

        <textarea name="mfdc_form_structure" id="mfdc_form_structure" style="display:none;"><?php echo esc_textarea($form_structure); ?></textarea>
        <?php
    }

    public function render_settings($post) {
        $status          = get_post_meta($post->ID, '_mfdc_status', true);
        $allow_anonymous = get_post_meta($post->ID, '_mfdc_allow_anonymous', true);
        ?>
        <p>
            <label><strong><?php esc_html_e('Status:', 'amilu-field-data-collection'); ?></strong></label><br>
            <select name="mfdc_status" class="widefat">
                <option value="active" <?php selected($status, 'active'); ?>><?php esc_html_e('Active', 'amilu-field-data-collection'); ?></option>
                <option value="inactive" <?php selected($status, 'inactive'); ?>><?php esc_html_e('Inactive', 'amilu-field-data-collection'); ?></option>
            </select>
        </p>
        <p>
            <label>
                <input type="checkbox" name="mfdc_allow_anonymous" value="1" <?php checked($allow_anonymous, '1'); ?> />
                <?php esc_html_e('Allow anonymous submissions', 'amilu-field-data-collection'); ?>
            </label>
        </p>
        <p>
            <strong><?php esc_html_e('Project UUID:', 'amilu-field-data-collection'); ?></strong><br>
            <code><?php echo esc_html(get_post_meta($post->ID, '_mfdc_uuid', true) ?: __('Not generated yet', 'amilu-field-data-collection')); ?></code>
        </p>
        <?php
    }

    public function save_meta_boxes($post_id) {
        if (!isset($_POST['mfdc_project_nonce']) ||
            !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['mfdc_project_nonce'])), 'mfdc_project_meta')) {
            return;
        }

        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }

        if (!current_user_can('edit_post', $post_id)) {
            return;
        }

        // Save form structure — validate JSON + sanitize every field recursively
        if (isset($_POST['mfdc_form_structure'])) {
            $raw = sanitize_text_field( wp_unslash($_POST['mfdc_form_structure']) );
            $decoded = json_decode($raw, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $decoded['fields'] = self::sanitize_form_fields($decoded['fields'] ?? []);
                update_post_meta($post_id, '_mfdc_form_structure', wp_json_encode($decoded));
            }
        }

        // Save settings
        if (isset($_POST['mfdc_status'])) {
            $status = sanitize_text_field( wp_unslash($_POST['mfdc_status']) );
            if (in_array($status, ['active', 'inactive'], true)) {
                update_post_meta($post_id, '_mfdc_status', $status);
            }
        }

        update_post_meta($post_id, '_mfdc_allow_anonymous', isset($_POST['mfdc_allow_anonymous']) ? '1' : '0');

        // Generate UUID if not exists
        if (!get_post_meta($post_id, '_mfdc_uuid', true)) {
            update_post_meta($post_id, '_mfdc_uuid', wp_generate_uuid4());
        }
    }

    /**
     * Recursively sanitize form builder fields.
     * Validates field types against a safelist, sanitizes labels,
     * options, and casts validation params to proper numeric types.
     */
    private static function sanitize_form_fields(array $fields): array {
        $allowed_types = [
            'text', 'number', 'email', 'phone', 'url', 'textarea',
            'select', 'radio', 'checkbox',
            'date', 'time', 'datetime',
            'photo', 'audio', 'video',
            'location', 'barcode', 'signature', 'rating', 'range',
        ];

        $clean = [];
        foreach ($fields as $field) {
            if (!is_array($field)) {
                continue;
            }

            $type = sanitize_key($field['type'] ?? 'text');
            if (!in_array($type, $allowed_types, true)) {
                continue; // reject unknown field types
            }

            $item = [
                'id'       => sanitize_key($field['id'] ?? 'field_' . wp_rand()),
                'type'     => $type,
                'label'    => sanitize_text_field($field['label'] ?? ''),
                'required' => !empty($field['required']),
            ];

            // Options: sanitize each string
            if (isset($field['options']) && is_array($field['options'])) {
                $item['options'] = array_values(array_map('sanitize_text_field', $field['options']));
            }

            // Placeholder
            if (isset($field['placeholder'])) {
                $item['placeholder'] = sanitize_text_field($field['placeholder']);
            }

            // Flow logic: per-option jumps (Epicollect-style)
            if (isset($field['jumps']) && is_array($field['jumps'])) {
                $clean_jumps = [];
                foreach ($field['jumps'] as $jump) {
                    if (is_array($jump) && isset($jump['value'], $jump['dest'])) {
                        $clean_jumps[] = [
                            'value' => sanitize_text_field($jump['value']),
                            'dest'  => sanitize_key($jump['dest']),
                        ];
                    }
                }
                if (!empty($clean_jumps)) {
                    $item['jumps'] = $clean_jumps;
                }
            }

            // Flow logic: always jump to
            if (!empty($field['jump_always'])) {
                $item['jump_always'] = sanitize_key($field['jump_always']);
            }

            // Validation: cast numeric params, sanitize strings
            $v = [];
            $raw_v = $field['validation'] ?? [];
            if (is_array($raw_v)) {
                if (isset($raw_v['min']))       $v['min']       = (float) $raw_v['min'];
                if (isset($raw_v['max']))       $v['max']       = (float) $raw_v['max'];
                if (isset($raw_v['step']))      $v['step']      = (float) $raw_v['step'];
                if (isset($raw_v['minLength'])) $v['minLength'] = absint($raw_v['minLength']);
                if (isset($raw_v['maxLength'])) $v['maxLength'] = absint($raw_v['maxLength']);
                if (!empty($raw_v['pattern']))  $v['pattern']   = sanitize_text_field($raw_v['pattern']);
                if (!empty($raw_v['message']))  $v['message']   = sanitize_text_field($raw_v['message']);
            }
            if (!empty($v)) {
                $item['validation'] = $v;
            }

            $clean[] = $item;
        }

        return $clean;
    }
}
