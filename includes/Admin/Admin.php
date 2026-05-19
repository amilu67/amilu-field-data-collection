<?php
namespace MFDataCollection\Admin;

use MFDataCollection\Database\EntryManager;

if (!defined('ABSPATH')) {
    exit;
}

class Admin {
    private $entry_manager;
    
    public function __construct() {
        $this->entry_manager = new EntryManager();

        add_action('admin_menu', [$this, 'add_menu_pages']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_scripts']);
        add_action('wp_ajax_mfdc_delete_entry', [$this, 'ajax_delete_entry']);
    }
    
    public function add_menu_pages() {
        add_menu_page(
            __('Amilu Field Data Collection', 'amilu-field-data-collection'),
            __('Amilu Field Data Collection', 'amilu-field-data-collection'),
            'manage_options',
            'mfdc-dashboard',
            [$this, 'render_dashboard'],
            'dashicons-clipboard',
            30
        );
        
        add_submenu_page(
            'mfdc-dashboard',
            __('Entries', 'amilu-field-data-collection'),
            __('Entries', 'amilu-field-data-collection'),
            'manage_options',
            'mfdc-entries',
            [$this, 'render_entries']
        );
        
        add_submenu_page(
            'mfdc-dashboard',
            __('Settings', 'amilu-field-data-collection'),
            __('Settings', 'amilu-field-data-collection'),
            'manage_options',
            'mfdc-settings',
            [$this, 'render_settings']
        );
    }
    
    public function enqueue_scripts($hook) {
        $is_mfdc = strpos($hook, 'mfdc') !== false || get_post_type() === 'mfdc_project';
        if (!$is_mfdc) {
            return;
        }

        // Font Awesome 6 Free (bundled locally).
        wp_enqueue_style('font-awesome', MFDC_PLUGIN_URL . 'assets/vendor/fontawesome/all.min.css', [], '6.5.1');

        // Admin CSS.
        wp_enqueue_style('mfdc-admin', MFDC_PLUGIN_URL . 'assets/css/admin.css', ['font-awesome'], MFDC_VERSION);

        // Form builder on project edit screen.
        if (get_post_type() === 'mfdc_project') {
            wp_enqueue_style('mfdc-form-builder', MFDC_PLUGIN_URL . 'assets/css/form-builder.css', ['font-awesome'], MFDC_VERSION);
            wp_enqueue_script('mfdc-form-builder', MFDC_PLUGIN_URL . 'assets/js/form-builder.js', [], MFDC_VERSION, true);
        }

        // Chart.js (bundled locally).
        wp_enqueue_script('mfdc-chartjs', MFDC_PLUGIN_URL . 'assets/vendor/chartjs/chart.umd.min.js', [], '4.4.8', true);

        // Leaflet on entries page only (bundled locally).
        if (strpos($hook, 'mfdc-entries') !== false) {
            wp_enqueue_style('mfdc-leaflet', MFDC_PLUGIN_URL . 'assets/vendor/leaflet/leaflet.css', [], '1.9.4');
            wp_enqueue_script('mfdc-leaflet', MFDC_PLUGIN_URL . 'assets/vendor/leaflet/leaflet.js', [], '1.9.4', true);
        }

        wp_enqueue_script('mfdc-admin', MFDC_PLUGIN_URL . 'assets/js/admin.js', ['jquery', 'mfdc-chartjs'], MFDC_VERSION, true);

        if (strpos($hook, 'mfdc-dashboard') !== false) {
            wp_localize_script('mfdc-admin', 'mfdcChartData', $this->get_chart_data());
        }

        // Always pass ajax url + nonce to admin JS
        wp_localize_script('mfdc-admin', 'mfdcAdmin', [
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce'   => wp_create_nonce('mfdc_admin_nonce'),
        ]);
    }
    
    public function render_dashboard() {
        global $wpdb;
        
        // Get statistics
        $total_projects = wp_count_posts('mfdc_project')->publish;
        $table_entries = $wpdb->prefix . 'mfdc_entries';
        $total_entries = $wpdb->get_var( "SELECT COUNT(*) FROM {$table_entries} WHERE status = 'active'" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter
        $entries_today = $wpdb->get_var( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, PluginCheck.Security.DirectDB.UnescapedDBParameter
            $wpdb->prepare(
                "SELECT COUNT(*) FROM {$table_entries} WHERE status = 'active' AND DATE(created_at) = %s", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                current_time('Y-m-d')
            )
        );
        
        ?>
        <div class="wrap">
            <h1><?php esc_html_e('Amilu Field Data Collection Dashboard', 'amilu-field-data-collection'); ?></h1>
            
            <div class="mfdc-stats">
                <div class="stat-box">
                    <div class="stat-number"><?php echo esc_html($total_projects); ?></div>
                    <div class="stat-label"><?php esc_html_e('Active Projects', 'amilu-field-data-collection'); ?></div>
                </div>
                
                <div class="stat-box">
                    <div class="stat-number"><?php echo esc_html($total_entries); ?></div>
                    <div class="stat-label"><?php esc_html_e('Total Entries', 'amilu-field-data-collection'); ?></div>
                </div>
                
                <div class="stat-box">
                    <div class="stat-number"><?php echo esc_html($entries_today); ?></div>
                    <div class="stat-label"><?php esc_html_e('Entries Today', 'amilu-field-data-collection'); ?></div>
                </div>
            </div>
            
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                <h2 style="margin:0;"><?php esc_html_e('Recent Projects', 'amilu-field-data-collection'); ?></h2>
                <a href="<?php echo esc_url(admin_url('post-new.php?post_type=mfdc_project')); ?>" class="button button-primary">
                    <span class="dashicons dashicons-plus-alt2" style="vertical-align:middle;margin-top:-2px;"></span>
                    <?php esc_html_e('New Project', 'amilu-field-data-collection'); ?>
                </a>
            </div>
            <?php
            $projects = get_posts([
                'post_type' => 'mfdc_project',
                'posts_per_page' => 10,
                'orderby' => 'modified',
                'order' => 'DESC'
            ]);

            if ($projects) {
                echo '<table class="wp-list-table widefat fixed striped">';
                echo '<thead><tr>';
                echo '<th>' . esc_html__('Project Name', 'amilu-field-data-collection') . '</th>';
                echo '<th>' . esc_html__('Entries', 'amilu-field-data-collection') . '</th>';
                echo '<th>' . esc_html__('Last Modified', 'amilu-field-data-collection') . '</th>';
                echo '<th>' . esc_html__('Actions', 'amilu-field-data-collection') . '</th>';
                echo '</tr></thead><tbody>';

                foreach ($projects as $project) {
                    $entry_count = $wpdb->get_var( $wpdb->prepare( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, PluginCheck.Security.DirectDB.UnescapedDBParameter
                        "SELECT COUNT(*) FROM {$table_entries} WHERE project_id = %d AND status = 'active'", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                        $project->ID
                    ) );

                    echo '<tr>';
                    echo '<td><strong>' . esc_html($project->post_title) . '</strong></td>';
                    echo '<td>' . esc_html($entry_count) . '</td>';
                    echo '<td>' . esc_html(get_the_modified_date('', $project)) . '</td>';
                    echo '<td>';
                    echo '<a href="' . esc_url(get_edit_post_link($project->ID)) . '" class="button button-small">' . esc_html__('Edit', 'amilu-field-data-collection') . '</a> ';
                    echo '<a href="' . esc_url(admin_url('admin.php?page=mfdc-entries&project_id=' . $project->ID)) . '" class="button button-small">' . esc_html__('View Entries', 'amilu-field-data-collection') . '</a>';
                    echo '</td>';
                    echo '</tr>';
                }

                echo '</tbody></table>';
            } else {
                echo '<div class="mfdc-empty-state"><span class="dashicons dashicons-clipboard" style="font-size:50px;width:50px;height:50px;color:#d0d7de;"></span>';
                echo '<h3>' . esc_html__('No projects yet', 'amilu-field-data-collection') . '</h3>';
                echo '<p>' . esc_html__('Create your first data collection project to get started.', 'amilu-field-data-collection') . '</p></div>';
            }
            ?>
            
            <!-- Charts Section -->
            <div id="mfdc-charts" class="mfdc-charts">
                <div class="chart-container">
                    <h3>Entries Over Time</h3>
                    <div style="height: 300px;">
                        <canvas id="entriesPerDayChart"></canvas>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px;">
                    <div class="chart-container">
                        <h3>Entries by Project</h3>
                        <div style="height: 300px;">
                            <canvas id="entriesByProjectChart"></canvas>
                        </div>
                    </div>
                    
                    <div class="chart-container">
                        <h3>Field Types Distribution</h3>
                        <div style="height: 300px;">
                            <canvas id="fieldDistributionChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <?php
    }
    
    public function render_entries() {
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only filter, no state change
        $project_id = isset($_GET['project_id']) ? absint($_GET['project_id']) : 0;

        $projects = get_posts([
            'post_type' => 'mfdc_project',
            'posts_per_page' => -1,
            'orderby' => 'title',
            'order' => 'ASC'
        ]);

        ?>
        <div class="wrap">
            <h1><?php esc_html_e('Entries', 'amilu-field-data-collection'); ?></h1>

            <form method="get">
                <input type="hidden" name="page" value="mfdc-entries" />
                <select name="project_id" onchange="this.form.submit()">
                    <option value=""><?php esc_html_e('Select a project...', 'amilu-field-data-collection'); ?></option>
                    <?php foreach ($projects as $project): ?>
                        <option value="<?php echo esc_attr($project->ID); ?>" <?php selected($project_id, $project->ID); ?>>
                            <?php echo esc_html($project->post_title); ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </form>

            <?php
            if ($project_id) {
                // Build field_id → label map from project form structure
                $form_structure = get_post_meta($project_id, '_mfdc_form_structure', true);
                $field_labels = [];
                if ($form_structure) {
                    $fs = json_decode($form_structure, true);
                    if (isset($fs['fields']) && is_array($fs['fields'])) {
                        foreach ($fs['fields'] as $field) {
                            if (!empty($field['id']) && !empty($field['label'])) {
                                $field_labels[$field['id']] = $field['label'];
                            }
                        }
                    }
                }

                $entries = $this->entry_manager->get_entries_by_project($project_id);

                if ($entries) {
                    // Collect geo-entries for the map
                    $map_markers = [];
                    foreach ($entries as $e) {
                        $mlat = $e['latitude'];
                        $mlng = $e['longitude'];
                        if (empty($mlat) && !empty($e['entry_data']) && is_array($e['entry_data'])) {
                            foreach ($e['entry_data'] as $v) {
                                if (is_array($v) && isset($v['lat'], $v['lng'])) {
                                    $mlat = $v['lat']; $mlng = $v['lng']; break;
                                }
                            }
                        }
                        if (!empty($mlat) && !empty($mlng)) {
                            $map_markers[] = [
                                'lat'   => (float) $mlat,
                                'lng'   => (float) $mlng,
                                'title' => $e['title'] ?: $e['uuid'],
                                'date'  => $e['created_at'],
                                'id'    => $e['id'],
                            ];
                        }
                    }

                    if (!empty($map_markers)) {
                        echo '<div id="mfdc-entries-map" style="height:380px;border-radius:12px;margin-bottom:20px;border:1px solid #d0d7de;z-index:0;"></div>';
                        wp_add_inline_script('mfdc-admin', 'var mfdcMapMarkers = ' . wp_json_encode($map_markers) . ';', 'before');
                    }

                    // Pass field labels to JS for the modal.
                    wp_add_inline_script('mfdc-admin', 'var mfdcFieldLabels = ' . wp_json_encode($field_labels) . ';', 'before');

                    echo '<p><a href="' . esc_url(wp_nonce_url(admin_url('admin-post.php?action=mfdc_export&project_id=' . $project_id), 'mfdc_export')) . '" class="button export-button">' . esc_html__('Export to CSV', 'amilu-field-data-collection') . '</a></p>';

                    echo '<div class="mfdc-entries-table"><table class="wp-list-table widefat fixed striped">';
                    echo '<thead><tr>';
                    echo '<th>' . esc_html__('Title', 'amilu-field-data-collection') . '</th>';
                    echo '<th>' . esc_html__('Created', 'amilu-field-data-collection') . '</th>';
                    echo '<th>' . esc_html__('Location', 'amilu-field-data-collection') . '</th>';
                    echo '<th>' . esc_html__('Actions', 'amilu-field-data-collection') . '</th>';
                    echo '</tr></thead><tbody>';

                    foreach ($entries as $entry) {
                        // Resolve location: first from DB columns, then from entry_data
                        $lat = $entry['latitude'];
                        $lng = $entry['longitude'];
                        if (empty($lat) && !empty($entry['entry_data']) && is_array($entry['entry_data'])) {
                            foreach ($entry['entry_data'] as $val) {
                                if (is_array($val) && isset($val['lat'], $val['lng'])) {
                                    $lat = $val['lat'];
                                    $lng = $val['lng'];
                                    break;
                                }
                            }
                        }

                        $location_str = '—';
                        if (!empty($lat) && !empty($lng)) {
                            $location_str = sprintf(
                                '<a href="https://www.google.com/maps?q=%s,%s" target="_blank" title="Open in Google Maps">%s, %s</a>',
                                esc_attr($lat), esc_attr($lng),
                                esc_html(round((float)$lat, 5)), esc_html(round((float)$lng, 5))
                            );
                        }

                        // Remap entry_data keys: field_id → human label
                        $display_data = [];
                        if (is_array($entry['entry_data'])) {
                            foreach ($entry['entry_data'] as $key => $val) {
                                $label = isset($field_labels[$key]) ? $field_labels[$key] : $key;
                                $display_data[$label] = $val;
                            }
                        }

                        // Encode with human-readable keys for the View modal
                        $entry_json = esc_attr(wp_json_encode([
                            'id'         => $entry['id'],
                            'uuid'       => $entry['uuid'],
                            'title'      => $entry['title'],
                            'created_at' => $entry['created_at'],
                            'entry_data' => $display_data,
                            'latitude'   => $lat,
                            'longitude'  => $lng,
                        ]));

                        echo '<tr>';
                        echo '<td>' . esc_html($entry['title'] ?: $entry['uuid']) . '</td>';
                        echo '<td>' . esc_html($entry['created_at']) . '</td>';
                        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $location_str built with esc_attr/esc_html above
                        echo '<td>' . $location_str . '</td>';
                        $delete_btn = '<button class="button button-small mfdc-delete-entry" data-id="' . esc_attr($entry['id']) . '" style="color:#b32d2e;border-color:#b32d2e;margin-left:4px;">' . esc_html__('Delete', 'amilu-field-data-collection') . '</button>';
                        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $entry_json is esc_attr'd, $delete_btn built with esc_attr/esc_html
                        echo '<td><button class="button button-small view-entry" data-entry=\'' . $entry_json . '\'>' . esc_html__('View', 'amilu-field-data-collection') . '</button> ' . $delete_btn . '</td>';
                        echo '</tr>';
                    }

                    echo '</tbody></table></div>';
                } else {
                    echo '<p>' . esc_html__('No entries found for this project.', 'amilu-field-data-collection') . '</p>';
                }
            } else {
                echo '<p>' . esc_html__('Please select a project to view entries.', 'amilu-field-data-collection') . '</p>';
            }
            ?>
        </div>

        <!-- Entry Detail Modal -->
        <div id="mfdc-entry-modal" style="display:none;position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.55);align-items:center;justify-content:center;">
            <div style="background:#fff;border-radius:12px;max-width:560px;width:90%;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3);">
                <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid #e5e7eb;">
                    <h3 style="margin:0;font-size:16px;" id="mfdc-modal-title">Entry Detail</h3>
                    <button id="mfdc-modal-close" style="background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280;">&times;</button>
                </div>
                <div id="mfdc-modal-body" style="padding:22px;"></div>
            </div>
        </div>
        <?php
    }
    
    private function get_chart_data() {
        global $wpdb;
        $table_entries = $wpdb->prefix . 'mfdc_entries';
        
        // Entries per day (last 30 days)
        $entries_per_day = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, PluginCheck.Security.DirectDB.UnescapedDBParameter
            "SELECT DATE(created_at) as date, COUNT(*) as count FROM {$table_entries} WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND status = 'active' GROUP BY DATE(created_at) ORDER BY date ASC", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
            ARRAY_A
        );
        
        $days_labels = [];
        $days_values = [];
        foreach ($entries_per_day as $row) {
            $days_labels[] = gmdate('M d', strtotime($row['date']));
            $days_values[] = (int) $row['count'];
        }
        
        // Entries by project
        $entries_by_project = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, PluginCheck.Security.DirectDB.UnescapedDBParameter
            "SELECT p.post_title as project, COUNT(e.id) as count FROM {$table_entries} e INNER JOIN {$wpdb->posts} p ON e.project_id = p.ID WHERE e.status = 'active' GROUP BY e.project_id ORDER BY count DESC LIMIT 5", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
            ARRAY_A
        );
        
        $project_labels = [];
        $project_values = [];
        foreach ($entries_by_project as $row) {
            $project_labels[] = $row['project'];
            $project_values[] = (int) $row['count'];
        }
        
        // Field types distribution
        $field_types = [];
        $projects = get_posts([
            'post_type' => 'mfdc_project',
            'posts_per_page' => -1,
            'post_status' => 'publish'
        ]);
        
        foreach ($projects as $project) {
            $form_structure = get_post_meta($project->ID, '_mfdc_form_structure', true);
            if ($form_structure) {
                $data = json_decode($form_structure, true);
                if (isset($data['fields'])) {
                    foreach ($data['fields'] as $field) {
                        $type = $field['type'];
                        $field_types[$type] = ($field_types[$type] ?? 0) + 1;
                    }
                }
            }
        }
        
        $type_labels = array_keys($field_types);
        $type_values = array_values($field_types);
        
        return [
            'entriesPerDay' => [
                'labels' => $days_labels,
                'values' => $days_values
            ],
            'entriesByProject' => [
                'labels' => $project_labels,
                'values' => $project_values
            ],
            'fieldDistribution' => [
                'labels' => $type_labels,
                'values' => $type_values
            ]
        ];
    }
    
    /**
     * AJAX handler: soft-delete an entry.
     */
    public function ajax_delete_entry() {
        check_ajax_referer('mfdc_admin_nonce', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Unauthorized'], 403);
        }

        $entry_id = isset($_POST['entry_id']) ? absint($_POST['entry_id']) : 0;
        if (!$entry_id) {
            wp_send_json_error(['message' => 'Invalid entry ID'], 400);
        }

        $result = $this->entry_manager->delete_entry($entry_id);

        if ($result !== false) {
            wp_send_json_success(['message' => 'Entry deleted']);
        }

        wp_send_json_error(['message' => 'Failed to delete entry'], 500);
    }

    public function render_settings() {
        if (isset($_POST['mfdc_save_settings'])) {
            check_admin_referer('mfdc_settings');

            if (!current_user_can('manage_options')) {
                wp_die(esc_html__('Unauthorized', 'amilu-field-data-collection'));
            }

            if (isset($_POST['generate_api_key'])) {
                update_option('mfdc_api_key', bin2hex(random_bytes(32)));
            }

            echo '<div class="notice notice-success"><p>' . esc_html__('Settings saved.', 'amilu-field-data-collection') . '</p></div>';
        }

        $api_key = get_option('mfdc_api_key');
        $pwa_url = home_url('/mfdc-app/');

        ?>
        <div class="wrap">
            <h1><?php esc_html_e('Amilu Field Data Collection Settings', 'amilu-field-data-collection'); ?></h1>

            <form method="post">
                <?php wp_nonce_field('mfdc_settings'); ?>

                <table class="form-table">
                    <tr>
                        <th scope="row"><?php esc_html_e('API Key', 'amilu-field-data-collection'); ?></th>
                        <td>
                            <?php if ($api_key): ?>
                                <code style="display:block;margin-bottom:10px;word-break:break-all;"><?php echo esc_html($api_key); ?></code>
                                <p class="description"><?php esc_html_e('Use this API key in your mobile app for authentication.', 'amilu-field-data-collection'); ?></p>
                            <?php else: ?>
                                <p><?php esc_html_e('No API key generated yet.', 'amilu-field-data-collection'); ?></p>
                            <?php endif; ?>
                            <label>
                                <input type="checkbox" name="generate_api_key" value="1" />
                                <?php esc_html_e('Generate new API key', 'amilu-field-data-collection'); ?>
                            </label>
                        </td>
                    </tr>

                    <tr>
                        <th scope="row"><?php esc_html_e('API Endpoint', 'amilu-field-data-collection'); ?></th>
                        <td>
                            <code><?php echo esc_url(rest_url('mfdc/v1')); ?></code>
                            <p class="description"><?php esc_html_e('Use this endpoint URL in your mobile app.', 'amilu-field-data-collection'); ?></p>
                        </td>
                    </tr>

                    <tr>
                        <th scope="row"><?php esc_html_e('Mobile App (PWA)', 'amilu-field-data-collection'); ?></th>
                        <td>
                            <a href="<?php echo esc_url($pwa_url); ?>" target="_blank" class="button">
                                <i class="fa-solid fa-mobile-screen"></i>&nbsp; <?php esc_html_e('Open Mobile App', 'amilu-field-data-collection'); ?>
                            </a>
                            <p class="description"><?php echo esc_html($pwa_url); ?><br><?php esc_html_e('Share this URL with data collectors — it installs as a PWA on their devices.', 'amilu-field-data-collection'); ?></p>
                        </td>
                    </tr>
                </table>

                <p class="submit">
                    <input type="submit" name="mfdc_save_settings" class="button button-primary" value="<?php esc_attr_e('Save Settings', 'amilu-field-data-collection'); ?>" />
                </p>
            </form>
        </div>
        <?php
    }
}
