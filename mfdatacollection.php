<?php
/**
 * Plugin Name: Amilu Field Data Collection
 * Plugin URI: https://github.com/amilu67/wp-mfdatacollection
 * Description: Sistema di raccolta dati mobile con sincronizzazione cloud, form builder drag & drop e app PWA offline-first.
 * Version: 2.1.0
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Author: Michele Fioretti
 * Author URI: https://github.com/amilu67
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: amilu-field-data-collection
 * GitHub Plugin URI: https://github.com/amilu67/wp-mfdatacollection
 */

if (!defined('ABSPATH')) {
    exit;
}

define('MFDC_VERSION', '2.1.0');
define('MFDC_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('MFDC_PLUGIN_URL', plugin_dir_url(__FILE__));
define('MFDC_PLUGIN_BASENAME', plugin_basename(__FILE__));

// Autoloader
spl_autoload_register(function ($class) {
    $prefix = 'MFDataCollection\\';
    $base_dir = MFDC_PLUGIN_DIR . 'includes/';

    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }

    $relative_class = substr($class, $len);
    $file = $base_dir . str_replace('\\', '/', $relative_class) . '.php';

    if (file_exists($file)) {
        require $file;
    }
});

class Mf_Data_Collection { // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedClassFound
    private static $instance = null;

    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        $this->init_hooks();
    }

    private function init_hooks() {
        register_activation_hook(__FILE__, [$this, 'activate']);
        register_deactivation_hook(__FILE__, [$this, 'deactivate']);

        add_action('plugins_loaded', [$this, 'init']);
        add_action('rest_api_init', [$this, 'register_rest_routes']);
        add_action('init', [$this, 'register_pwa_route']);
        add_action('template_redirect', [$this, 'serve_pwa']);
        add_action('rest_api_init', [$this, 'add_cors_headers']);
    }

    public function activate() {
        require_once MFDC_PLUGIN_DIR . 'includes/Installer.php';
        MFDataCollection\Installer::activate();
    }

    public function deactivate() {
        flush_rewrite_rules();
    }

    public function init() {

        new MFDataCollection\Admin\Admin();
        new MFDataCollection\PostTypes\Project();
        new MFDataCollection\Database\EntryManager();
    }

    public function register_rest_routes() {
        $api = new MFDataCollection\API\RestAPI();
        $api->register_routes();
    }

    public function register_pwa_route() {
        add_rewrite_rule('^mfdc-app/?$', 'index.php?mfdc_pwa=1', 'top');
        add_rewrite_tag('%mfdc_pwa%', '([^&]+)');

        // Auto-flush rewrite rules once per plugin version change
        if (get_option('mfdc_rewrite_version') !== MFDC_VERSION) {
            flush_rewrite_rules();
            update_option('mfdc_rewrite_version', MFDC_VERSION);
        }
    }

    /**
     * Serve PWA app.
     * Uses direct URI matching as primary check (no rewrite rule dependency),
     * with query-var as fallback.
     */
    public function serve_pwa() {
        $is_pwa = false;

        // Primary: check URL path directly (works even without flushed rewrite rules)
        $request_path = isset($_SERVER['REQUEST_URI'])
            ? wp_parse_url( sanitize_url( wp_unslash( $_SERVER['REQUEST_URI'] ) ), PHP_URL_PATH )
            : '';
        $home_path = wp_parse_url( home_url('/'), PHP_URL_PATH );
        $relative   = '/' . ltrim(substr($request_path, strlen(rtrim($home_path, '/'))), '/');
        if (preg_match('#^/mfdc-app/?$#', $relative)) {
            $is_pwa = true;
        }

        // Fallback: query var (works after rewrite rules are flushed)
        if (!$is_pwa && get_query_var('mfdc_pwa') === '1') {
            $is_pwa = true;
        }

        if (!$is_pwa) {
            return;
        }

        $pwa_index = MFDC_PLUGIN_DIR . 'pwa/index.html';
        if (file_exists($pwa_index)) {
            status_header(200);
            header('Content-Type: text/html; charset=utf-8');
            $html = file_get_contents($pwa_index);
            $html = str_replace('{{REST_URL}}', esc_url(rest_url('mfdc/v1')), $html);
            $html = str_replace('{{PLUGIN_URL}}', esc_url(MFDC_PLUGIN_URL), $html);
            $html = str_replace('{{SITE_NAME}}', esc_html(get_bloginfo('name')), $html);
            // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $html is a static template with esc_url/esc_html replacements
            echo $html;
            exit;
        }
        wp_die(esc_html__('PWA app not found.', 'amilu-field-data-collection'), 404);
    }

    public function add_cors_headers() {
        $origin = get_site_url();
        header("Access-Control-Allow-Origin: {$origin}");
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, X-API-Key, Authorization');
        header('Access-Control-Allow-Credentials: true');
    }
}

function mfdatacollection() {
    return Mf_Data_Collection::get_instance();
}

mfdatacollection();
