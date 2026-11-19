<?php
/**
 * Plugin Name: RentBike App Manager
 * Description: Backend for the RentBike mobile app and the redesigned website: settings, bikes, FAQ, opening hours, online bookings.
 * Version: 2.7.0
 * Author: RentBike
 */

if (!defined('ABSPATH')) {
    exit;
}

if (class_exists('RentBike_App_Manager')) {
    // An older copy of this plugin is still active from another folder.
    add_action('admin_notices', function () {
        echo '<div class="notice notice-error"><p><strong>RentBike App Manager 2.0:</strong> an older copy of this plugin is still active. Deactivate and delete the old copy, then activate this one. Your settings, bikes and bookings are kept.</p></div>';
    });
    return;
}

define('RENTBIKE_VERSION', '2.7.0');
define('RENTBIKE_DIR', plugin_dir_path(__FILE__));
define('RENTBIKE_URL', plugin_dir_url(__FILE__));

// The class lives in its own file so the check above runs before PHP declares it.
require_once RENTBIKE_DIR . 'includes/class-rentbike-app-manager.php';

$GLOBALS['rentbike_app_manager'] = new RentBike_App_Manager();
