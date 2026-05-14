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
$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}mfdc_entries" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}mfdc_media" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange, WordPress.DB.PreparedSQL.InterpolatedNotPrepared

// Delete all mfdc_project posts and their meta.
$mfdc_projects = get_posts(
    [
        'post_type'      => 'mfdc_project',
        'posts_per_page' => -1,
        'post_status'    => 'any',
        'fields'         => 'ids',
    ]
);

foreach ( $mfdc_projects as $mfdc_project_id ) {
    wp_delete_post( $mfdc_project_id, true );
}

// Delete options.
delete_option( 'mfdatacollection_db_version' );
delete_option( 'mfdc_api_key' );
delete_option( 'mfdc_rewrite_version' );

// Remove upload directory using WP_Filesystem.
$mfdc_upload_dir = wp_upload_dir();
$mfdc_data_dir   = $mfdc_upload_dir['basedir'] . '/mfdc-data';

if ( is_dir( $mfdc_data_dir ) ) {
    global $wp_filesystem;
    if ( empty( $wp_filesystem ) ) {
        require_once ABSPATH . 'wp-admin/includes/file.php';
        WP_Filesystem();
    }
    $wp_filesystem->rmdir( $mfdc_data_dir, true );
}

// Flush rewrite rules.
flush_rewrite_rules();
