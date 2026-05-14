<?php
namespace MFDataCollection;

if (!defined('ABSPATH')) {
    exit;
}

class Installer {
    public static function activate() {
        self::create_tables();
        self::create_upload_directory();
        self::create_index_guards();
        flush_rewrite_rules();
    }

    private static function create_tables() {
        global $wpdb;

        $charset_collate = $wpdb->get_charset_collate();

        $table_entries = $wpdb->prefix . 'mfdc_entries';
        $sql_entries = "CREATE TABLE IF NOT EXISTS $table_entries (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            project_id bigint(20) NOT NULL,
            uuid varchar(36) NOT NULL,
            title varchar(255) DEFAULT '',
            entry_data longtext NOT NULL,
            user_id bigint(20) DEFAULT NULL,
            device_id varchar(100) DEFAULT '',
            created_at datetime NOT NULL,
            uploaded_at datetime DEFAULT NULL,
            latitude decimal(10, 8) DEFAULT NULL,
            longitude decimal(11, 8) DEFAULT NULL,
            accuracy decimal(10, 2) DEFAULT NULL,
            status varchar(20) DEFAULT 'active',
            PRIMARY KEY (id),
            UNIQUE KEY uuid (uuid),
            KEY project_id (project_id),
            KEY user_id (user_id),
            KEY created_at (created_at)
        ) $charset_collate;";

        $table_media = $wpdb->prefix . 'mfdc_media';
        $sql_media = "CREATE TABLE IF NOT EXISTS $table_media (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            entry_id bigint(20) NOT NULL,
            uuid varchar(36) NOT NULL,
            field_name varchar(100) NOT NULL,
            file_name varchar(255) NOT NULL,
            file_path varchar(500) NOT NULL,
            file_type varchar(50) NOT NULL,
            file_size bigint(20) DEFAULT NULL,
            created_at datetime NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uuid (uuid),
            KEY entry_id (entry_id)
        ) $charset_collate;";

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        dbDelta($sql_entries);
        dbDelta($sql_media);

        update_option('mfdatacollection_db_version', MFDC_VERSION);
    }

    private static function create_upload_directory() {
        $upload_dir = wp_upload_dir();
        $mfdc_dir = $upload_dir['basedir'] . '/mfdc-data';

        if (!file_exists($mfdc_dir)) {
            wp_mkdir_p($mfdc_dir);
        }

        // Always refresh security files
        $htaccess = $mfdc_dir . '/.htaccess';
        $htaccess_content = "Options -Indexes\nDeny from all\n<FilesMatch \"\.(jpg|jpeg|png|gif|webp|mp3|mp4|wav|webm|pdf)$\">\nAllow from all\n</FilesMatch>";

        global $wp_filesystem;
        if (empty($wp_filesystem)) {
            require_once ABSPATH . 'wp-admin/includes/file.php';
            WP_Filesystem();
        }
        $wp_filesystem->put_contents($htaccess, $htaccess_content, FS_CHMOD_FILE);

        // Blank index.php
        $index = $mfdc_dir . '/index.php';
        if (!file_exists($index)) {
            $wp_filesystem->put_contents($index, '<?php // Silence is golden.', FS_CHMOD_FILE);
        }
    }

    /**
     * Place blank index.php in every plugin subdirectory to prevent directory listing.
     */
    private static function create_index_guards() {
        $dirs = ['includes', 'includes/Admin', 'includes/API', 'includes/Database', 'includes/PostTypes', 'assets', 'assets/css', 'assets/js', 'pwa'];

        global $wp_filesystem;
        if (empty($wp_filesystem)) {
            require_once ABSPATH . 'wp-admin/includes/file.php';
            WP_Filesystem();
        }

        foreach ($dirs as $dir) {
            $path = MFDC_PLUGIN_DIR . $dir . '/index.php';
            if (!file_exists($path)) {
                wp_mkdir_p(dirname($path));
                $wp_filesystem->put_contents($path, '<?php // Silence is golden.', FS_CHMOD_FILE);
            }
        }
    }
}
