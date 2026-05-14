<?php
namespace MFDataCollection\API;

use MFDataCollection\Database\EntryManager;

if (!defined('ABSPATH')) {
    exit;
}

class RestAPI {
    private $namespace = 'mfdc/v1';
    private $entry_manager;

    /** Allowed MIME types for media uploads. */
    private const ALLOWED_MIME_TYPES = [
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png'  => 'image/png',
        'gif'  => 'image/gif',
        'webp' => 'image/webp',
        'mp3'  => 'audio/mpeg',
        'wav'  => 'audio/wav',
        'mp4'  => 'video/mp4',
        'webm' => 'video/webm',
        'pdf'  => 'application/pdf',
    ];

    public function __construct() {
        $this->entry_manager = new EntryManager();
    }

    public function register_routes() {
        // Projects (read — requires API key or read capability).
        register_rest_route($this->namespace, '/projects', [
            'methods'             => 'GET',
            'callback'            => [$this, 'get_projects'],
            'permission_callback' => [$this, 'check_read_permission'],
        ]);

        register_rest_route($this->namespace, '/projects/(?P<id>\d+)', [
            'methods'             => 'GET',
            'callback'            => [$this, 'get_project'],
            'permission_callback' => [$this, 'check_read_permission'],
            'args'                => [
                'id' => [
                    'validate_callback' => function ($param) { return is_numeric($param); },
                    'sanitize_callback' => 'absint',
                ],
            ],
        ]);

        // Entries read (requires API key or read capability).
        register_rest_route($this->namespace, '/entries/(?P<id>\d+)', [
            'methods'             => 'GET',
            'callback'            => [$this, 'get_entry'],
            'permission_callback' => [$this, 'check_read_permission'],
            'args'                => [
                'id' => [
                    'validate_callback' => function ($param) { return is_numeric($param); },
                    'sanitize_callback' => 'absint',
                ],
            ],
        ]);

        register_rest_route($this->namespace, '/projects/(?P<project_id>\d+)/entries', [
            'methods'             => 'GET',
            'callback'            => [$this, 'get_entries'],
            'permission_callback' => [$this, 'check_read_permission'],
            'args'                => [
                'project_id' => [
                    'validate_callback' => function ($param) { return is_numeric($param); },
                    'sanitize_callback' => 'absint',
                ],
                'page'     => [
                    'default'           => 1,
                    'sanitize_callback' => 'absint',
                ],
                'per_page' => [
                    'default'           => 50,
                    'sanitize_callback' => 'absint',
                ],
            ],
        ]);

        // Entries write (requires API key or edit_posts capability).
        register_rest_route($this->namespace, '/entries', [
            'methods'             => 'POST',
            'callback'            => [$this, 'create_entry'],
            'permission_callback' => [$this, 'check_write_permission'],
        ]);

        // Media upload (requires API key or upload_files capability).
        register_rest_route($this->namespace, '/media', [
            'methods'             => 'POST',
            'callback'            => [$this, 'upload_media'],
            'permission_callback' => [$this, 'check_upload_permission'],
        ]);

        // Sync (requires API key or edit_posts capability).
        register_rest_route($this->namespace, '/sync', [
            'methods'             => 'POST',
            'callback'            => [$this, 'sync_data'],
            'permission_callback' => [$this, 'check_write_permission'],
        ]);
    }

    /* ── Permission helpers ─────────────────────────────────── */

    /**
     * Verify API key (timing-safe).
     */
    private function has_valid_api_key($request) {
        $api_key = $request->get_header('X-API-Key');
        if ($api_key) {
            $stored_key = get_option('mfdc_api_key');
            return $stored_key && hash_equals($stored_key, $api_key);
        }
        return false;
    }

    /**
     * Read permission: API key, or logged-in user with read capability.
     */
    public function check_read_permission($request) {
        if ($this->has_valid_api_key($request)) {
            return true;
        }
        if (is_user_logged_in() && current_user_can('read')) {
            return true;
        }
        return $this->permission_error();
    }

    /**
     * Write permission: API key, logged-in user with edit_posts, or anonymous if project allows.
     */
    public function check_write_permission($request) {
        if ($this->has_valid_api_key($request)) {
            return true;
        }
        if (is_user_logged_in() && current_user_can('edit_posts')) {
            return true;
        }
        // Allow anonymous submissions if the project permits it.
        $project_id = $request->get_param('project_id');
        if ($project_id) {
            $allow_anonymous = get_post_meta(absint($project_id), '_mfdc_allow_anonymous', true);
            if ($allow_anonymous === '1') {
                return true;
            }
        }
        return $this->permission_error();
    }

    /**
     * Upload permission: API key, or logged-in user with upload_files capability.
     */
    public function check_upload_permission($request) {
        if ($this->has_valid_api_key($request)) {
            return true;
        }
        if (is_user_logged_in() && current_user_can('upload_files')) {
            return true;
        }
        return $this->permission_error();
    }

    /**
     * Standard forbidden error.
     */
    private function permission_error() {
        return new \WP_Error(
            'rest_forbidden',
            __('You do not have permission to access this resource.', 'amilu-field-data-collection'),
            ['status' => 403]
        );
    }

    public function get_projects($request) {
        $args = [
            'post_type'      => 'mfdc_project',
            'posts_per_page' => 100,
            'post_status'    => 'publish',
            'meta_query'     => [ // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- single meta key on small dataset
                [
                    'key'     => '_mfdc_status',
                    'value'   => 'active',
                    'compare' => '=',
                ],
            ],
        ];

        $query    = new \WP_Query($args);
        $projects = [];

        foreach ($query->posts as $post) {
            $projects[] = $this->format_project($post);
        }

        return rest_ensure_response($projects);
    }

    public function get_project($request) {
        $id   = absint($request->get_param('id'));
        $post = get_post($id);

        if (!$post || $post->post_type !== 'mfdc_project') {
            return new \WP_Error('not_found', __('Project not found', 'amilu-field-data-collection'), ['status' => 404]);
        }

        return rest_ensure_response($this->format_project($post));
    }

    public function create_entry($request) {
        $params = $request->get_json_params();

        if (empty($params['project_id']) || empty($params['uuid']) || empty($params['entry_data'])) {
            return new \WP_Error('invalid_data', __('Missing required fields', 'amilu-field-data-collection'), ['status' => 400]);
        }

        // Verify the project exists
        $project = get_post(absint($params['project_id']));
        if (!$project || $project->post_type !== 'mfdc_project') {
            return new \WP_Error('invalid_project', __('Project not found', 'amilu-field-data-collection'), ['status' => 404]);
        }

        $entry_id = $this->entry_manager->create_entry($params);

        if ($entry_id) {
            return rest_ensure_response([
                'success'  => true,
                'entry_id' => $entry_id,
                'message'  => __('Entry created successfully', 'amilu-field-data-collection'),
            ]);
        }

        return new \WP_Error('creation_failed', __('Failed to create entry', 'amilu-field-data-collection'), ['status' => 500]);
    }

    public function get_entry($request) {
        $id    = absint($request->get_param('id'));
        $entry = $this->entry_manager->get_entry($id);

        if (!$entry) {
            return new \WP_Error('not_found', __('Entry not found', 'amilu-field-data-collection'), ['status' => 404]);
        }

        return rest_ensure_response($entry);
    }

    public function get_entries($request) {
        $project_id = absint($request->get_param('project_id'));
        $page       = max(1, absint($request->get_param('page') ?? 1));
        $per_page   = min(100, max(1, absint($request->get_param('per_page') ?? 50)));

        $entries = $this->entry_manager->get_entries_by_project($project_id, [
            'limit'  => $per_page,
            'offset' => ($page - 1) * $per_page,
        ]);

        return rest_ensure_response($entries);
    }

    /**
     * Upload with extension + MIME whitelist and wp_check_filetype validation.
     */
    public function upload_media($request) {
        $files  = $request->get_file_params();
        $params = $request->get_params();

        if (empty($files['file']) || empty($params['entry_id']) || empty($params['field_name'])) {
            return new \WP_Error('invalid_data', __('Missing required fields', 'amilu-field-data-collection'), ['status' => 400]);
        }

        $file      = $files['file'];
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

        // Validate extension
        if (!array_key_exists($extension, self::ALLOWED_MIME_TYPES)) {
            return new \WP_Error('invalid_file_type', __('File type not allowed', 'amilu-field-data-collection'), ['status' => 400]);
        }

        // Double-check MIME type with WordPress
        $check = wp_check_filetype($file['name'], self::ALLOWED_MIME_TYPES);
        if (!$check['type']) {
            return new \WP_Error('invalid_file_type', __('File type not allowed', 'amilu-field-data-collection'), ['status' => 400]);
        }

        // Max size 50 MB
        if ($file['size'] > 50 * 1024 * 1024) {
            return new \WP_Error('file_too_large', __('File exceeds maximum size of 50 MB', 'amilu-field-data-collection'), ['status' => 400]);
        }

        // Use wp_handle_upload for proper WordPress file handling.
        // Populate $_FILES so wp_handle_upload can process it.
        $_FILES['mfdc_upload'] = $file;

        $upload_overrides = [
            'test_form' => false,
            'mimes'     => self::ALLOWED_MIME_TYPES,
        ];

        if ( ! function_exists( 'wp_handle_upload' ) ) {
            require_once ABSPATH . 'wp-admin/includes/file.php';
        }

        $movefile = wp_handle_upload( $file, $upload_overrides );

        if ( $movefile && ! isset( $movefile['error'] ) ) {
            $uuid = wp_generate_uuid4();
            $media_id = $this->entry_manager->add_media( absint( $params['entry_id'] ), [
                'uuid'       => $uuid,
                'field_name' => sanitize_key( $params['field_name'] ),
                'file_name'  => basename( $movefile['file'] ),
                'file_path'  => $movefile['file'],
                'file_type'  => $movefile['type'],
                'file_size'  => $file['size'],
            ] );

            if ( $media_id ) {
                return rest_ensure_response( [
                    'success'  => true,
                    'media_id' => $media_id,
                    'url'      => $movefile['url'],
                ] );
            }
        }

        $error_msg = isset( $movefile['error'] ) ? $movefile['error'] : __( 'Failed to upload file', 'amilu-field-data-collection' );
        return new \WP_Error( 'upload_failed', $error_msg, [ 'status' => 500 ] );
    }

    public function sync_data($request) {
        $params = $request->get_json_params();

        $results = [
            'uploaded' => [],
            'errors'   => [],
        ];

        if (!empty($params['entries']) && is_array($params['entries'])) {
            foreach ($params['entries'] as $entry_data) {
                if (empty($entry_data['project_id']) || empty($entry_data['uuid']) || empty($entry_data['entry_data'])) {
                    $results['errors'][] = [
                        'uuid'    => $entry_data['uuid'] ?? 'unknown',
                        'message' => 'Missing required fields',
                    ];
                    continue;
                }

                $entry_id = $this->entry_manager->create_entry($entry_data);

                if ($entry_id) {
                    $results['uploaded'][] = [
                        'uuid'     => $entry_data['uuid'],
                        'entry_id' => $entry_id,
                    ];
                } else {
                    $results['errors'][] = [
                        'uuid'    => $entry_data['uuid'],
                        'message' => 'Failed to create entry',
                    ];
                }
            }
        }

        return rest_ensure_response($results);
    }

    /**
     * Format a project post for API response.
     */
    private function format_project($post) {
        return [
            'id'             => $post->ID,
            'uuid'           => get_post_meta($post->ID, '_mfdc_uuid', true),
            'name'           => $post->post_title,
            'description'    => $post->post_content,
            'form_structure' => json_decode(get_post_meta($post->ID, '_mfdc_form_structure', true), true),
            'created_at'     => $post->post_date,
            'updated_at'     => $post->post_modified,
        ];
    }
}
