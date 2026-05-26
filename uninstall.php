<?php
/**
 * Amilu Field Data Collection Uninstall
 *
 * Removes all plugin data when uninstalled via WordPress admin.
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
    exit;
}

global $wpdb;

// Delete custom tables.
$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}amilfida_entries" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}amilfida_media" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange, WordPress.DB.PreparedSQL.InterpolatedNotPrepared

// Delete all amilfida_project posts and their meta.
$amilfida_projects = get_posts(
    [
        'post_type'      => 'amilfida_project',
        'posts_per_page' => -1,
        'post_status'    => 'any',
        'fields'         => 'ids',
    ]
);

foreach ( $amilfida_projects as $amilfida_project_id ) {
    wp_delete_post( $amilfida_project_id, true );
}

// Delete options.
delete_option( 'amilfida_db_version' );
delete_option( 'amilfida_api_key' );
delete_option( 'amilfida_rewrite_version' );

// Remove upload directory using WP_Filesystem.
$amilfida_upload_dir = wp_upload_dir();
$amilfida_data_dir   = $amilfida_upload_dir['basedir'] . '/amilfida-data';

if ( is_dir( $amilfida_data_dir ) ) {
    global $wp_filesystem;
    if ( empty( $wp_filesystem ) ) {
        require_once ABSPATH . 'wp-admin/includes/file.php';
        WP_Filesystem();
    }
    $wp_filesystem->rmdir( $amilfida_data_dir, true );
}

// Flush rewrite rules.
flush_rewrite_rules();
