<?php
namespace Amilfida\Database;

if (!defined('ABSPATH')) {
    exit;
}

class EntryManager {
    private $table_entries;
    private $table_media;

    /** Whitelisted columns for ORDER BY to prevent SQL injection. */
    private const ALLOWED_ORDERBY = ['id', 'created_at', 'uploaded_at', 'title'];
    private const ALLOWED_ORDER   = ['ASC', 'DESC'];

    public function __construct() {
        global $wpdb;
        $this->table_entries = $wpdb->prefix . 'amilfida_entries';
        $this->table_media   = $wpdb->prefix . 'amilfida_media';
    }

    public function create_entry($data) {
        global $wpdb;

        $entry = [
            'project_id'  => absint($data['project_id']),
            'uuid'        => self::sanitize_uuid($data['uuid']),
            'title'       => sanitize_text_field($data['title'] ?? ''),
            'entry_data'  => wp_json_encode($data['entry_data']),
            'user_id'     => get_current_user_id() ?: null,
            'device_id'   => sanitize_text_field($data['device_id'] ?? ''),
            'created_at'  => self::sanitize_datetime($data['created_at'] ?? ''),
            'uploaded_at' => current_time('mysql'),
            'latitude'    => isset($data['latitude']) ? floatval($data['latitude']) : null,
            'longitude'   => isset($data['longitude']) ? floatval($data['longitude']) : null,
            'accuracy'    => isset($data['accuracy']) ? floatval($data['accuracy']) : null,
            'status'      => 'active',
        ];

        $formats = ['%d', '%s', '%s', '%s', '%d', '%s', '%s', '%s', '%f', '%f', '%f', '%s'];

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
        $result = $wpdb->insert($this->table_entries, $entry, $formats);

        return $result ? $wpdb->insert_id : false;
    }

    public function get_entry($id) {
        global $wpdb;

        $entry = $wpdb->get_row( $wpdb->prepare( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
            "SELECT * FROM {$this->table_entries} WHERE id = %d", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
            absint($id)
        ), ARRAY_A );

        if ($entry) {
            $entry['entry_data'] = json_decode($entry['entry_data'], true);
            $entry['media']      = $this->get_entry_media($id);
        }

        return $entry;
    }

    public function get_entries_by_project($project_id, $args = []) {
        global $wpdb;

        $defaults = [
            'limit'   => 50,
            'offset'  => 0,
            'order'   => 'DESC',
            'orderby' => 'created_at',
        ];

        $args = wp_parse_args($args, $defaults);

        // Whitelist orderby / order to prevent SQL injection
        $orderby = in_array($args['orderby'], self::ALLOWED_ORDERBY, true) ? $args['orderby'] : 'created_at';
        $order   = in_array(strtoupper($args['order']), self::ALLOWED_ORDER, true) ? strtoupper($args['order']) : 'DESC';

        $entries = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, PluginCheck.Security.DirectDB.UnescapedDBParameter
            $wpdb->prepare(
                "SELECT * FROM {$this->table_entries} WHERE project_id = %d AND status = 'active' ORDER BY {$orderby} {$order} LIMIT %d OFFSET %d", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                absint($project_id), absint($args['limit']), absint($args['offset'])
            ),
            ARRAY_A
        );

        foreach ($entries as &$entry) {
            $entry['entry_data'] = json_decode($entry['entry_data'], true);
        }

        return $entries;
    }

    public function update_entry($id, $data) {
        global $wpdb;

        $update  = [];
        $formats = [];

        if (isset($data['title'])) {
            $update['title'] = sanitize_text_field($data['title']);
            $formats[]       = '%s';
        }

        if (isset($data['entry_data'])) {
            $update['entry_data'] = wp_json_encode($data['entry_data']);
            $formats[]            = '%s';
        }

        if (isset($data['status'])) {
            $allowed = ['active', 'deleted', 'archived'];
            $status  = sanitize_text_field($data['status']);
            if (in_array($status, $allowed, true)) {
                $update['status'] = $status;
                $formats[]        = '%s';
            }
        }

        if (empty($update)) {
            return false;
        }

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
        return $wpdb->update(
            $this->table_entries,
            $update,
            ['id' => absint($id)],
            $formats,
            ['%d']
        );
    }

    public function delete_entry($id) {
        global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
        return $wpdb->update(
            $this->table_entries,
            ['status' => 'deleted'],
            ['id' => absint($id)],
            ['%s'],
            ['%d']
        );
    }

    public function add_media($entry_id, $media_data) {
        global $wpdb;

        $media = [
            'entry_id'   => absint($entry_id),
            'uuid'       => sanitize_text_field($media_data['uuid']),
            'field_name' => sanitize_key($media_data['field_name']),
            'file_name'  => sanitize_file_name($media_data['file_name']),
            'file_path'  => sanitize_text_field($media_data['file_path']),
            'file_type'  => sanitize_mime_type($media_data['file_type']),
            'file_size'  => absint($media_data['file_size'] ?? 0),
            'created_at' => current_time('mysql'),
        ];

        $formats = ['%d', '%s', '%s', '%s', '%s', '%s', '%d', '%s'];

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
        $result = $wpdb->insert($this->table_media, $media, $formats);

        return $result ? $wpdb->insert_id : false;
    }

    public function get_entry_media($entry_id) {
        global $wpdb;

        return $wpdb->get_results( $wpdb->prepare( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
            "SELECT * FROM {$this->table_media} WHERE entry_id = %d", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
            absint($entry_id)
        ), ARRAY_A );
    }

    public function export_entries($project_id, $format = 'csv') {
        $entries = $this->get_entries_by_project($project_id, ['limit' => 10000]);

        if ($format === 'csv') {
            return $this->export_to_csv($entries);
        } elseif ($format === 'json') {
            return wp_json_encode($entries);
        }

        return false;
    }

    /**
     * Validate and sanitize a UUID string.
     */
    private static function sanitize_uuid(string $uuid): string {
        $uuid = sanitize_text_field($uuid);
        // Accept wp_generate_uuid4 format and PWA fallback format (e_timestamp_random)
        if (wp_is_uuid($uuid)) {
            return $uuid;
        }
        // Fallback: allow alphanumeric + underscore (PWA device-generated IDs)
        if (preg_match('/^[a-zA-Z0-9_-]{6,80}$/', $uuid)) {
            return $uuid;
        }
        return wp_generate_uuid4();
    }

    /**
     * Validate a datetime string. Returns current_time if invalid.
     */
    private static function sanitize_datetime(string $dt): string {
        if (empty($dt)) {
            return current_time('mysql');
        }
        // Accept MySQL datetime or ISO 8601 date formats
        $dt = sanitize_text_field($dt);
        $ts = strtotime($dt);
        if ($ts === false || $ts < 0) {
            return current_time('mysql');
        }
        return gmdate('Y-m-d H:i:s', $ts);
    }

    private function export_to_csv($entries) {
        if (empty($entries)) {
            return '';
        }

        // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fopen -- writing to php://temp memory stream, not filesystem
        $output = fopen('php://temp', 'r+');

        $first_entry = reset($entries);
        $data_keys   = is_array($first_entry['entry_data']) ? array_keys($first_entry['entry_data']) : [];
        $headers     = array_merge(
            ['ID', 'UUID', 'Title', 'Created At', 'User ID', 'Latitude', 'Longitude'],
            $data_keys
        );
        fputcsv($output, $headers);

        foreach ($entries as $entry) {
            $row = [
                $entry['id'],
                $entry['uuid'],
                $entry['title'],
                $entry['created_at'],
                $entry['user_id'],
                $entry['latitude'],
                $entry['longitude'],
            ];

            if (is_array($entry['entry_data'])) {
                foreach ($entry['entry_data'] as $value) {
                    $row[] = is_array($value) ? wp_json_encode($value) : $value;
                }
            }

            fputcsv($output, $row);
        }

        rewind($output);
        $csv = stream_get_contents($output);
        // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fclose -- closing php://temp stream
        fclose($output);

        return $csv;
    }
}
