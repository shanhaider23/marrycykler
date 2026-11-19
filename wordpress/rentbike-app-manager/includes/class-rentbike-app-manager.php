<?php

if (!defined('ABSPATH')) {
    exit;
}

class RentBike_App_Manager {
    const OPTION = 'rentbike_app_settings';
    const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const STATUSES = [
        'new' => 'New',
        'confirmed' => 'Confirmed',
        'completed' => 'Completed',
        'cancelled' => 'Cancelled',
    ];
    private $view = null;

    const LEGACY_LINE = '/^[ \t]*(price_per_day|quantity|active)[ \t]*=[ \t]*(.*?)[ \t]*\r?$/mi';

    public function __construct() {
        add_action('init', [$this, 'register_post_types']);
        add_action('admin_menu', [$this, 'register_admin_menu']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('rest_api_init', [$this, 'register_rest_routes']);

        // Bikes admin
        add_action('add_meta_boxes', [$this, 'add_meta_boxes']);
        add_action('save_post_rentbike_bike', [$this, 'save_bike_meta']);

        // Bookings admin
        add_action('save_post_rentbike_booking', [$this, 'save_booking_meta']);
        add_filter('manage_rentbike_booking_posts_columns', [$this, 'booking_columns']);
        add_action('manage_rentbike_booking_posts_custom_column', [$this, 'booking_column'], 10, 2);

        // Website
        add_filter('template_include', [$this, 'template_include'], 99);
        add_filter('pre_get_document_title', [$this, 'document_title'], 99);
        add_action('template_redirect', [$this, 'redirect_old_pages']);
        add_action('wp_enqueue_scripts', [$this, 'enqueue_site_assets'], 999);
    }

    /* ------------------------------------------------------------------
     * Post types and menu
     * ---------------------------------------------------------------- */

    public function register_post_types() {
        register_post_type('rentbike_bike', [
            'labels' => ['name' => 'Bikes', 'singular_name' => 'Bike', 'add_new_item' => 'Add Bike', 'edit_item' => 'Edit Bike'],
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => false,
            'supports' => ['title', 'editor', 'thumbnail', 'page-attributes'],
        ]);

        register_post_type('rentbike_faq', [
            'labels' => ['name' => 'FAQs', 'singular_name' => 'FAQ', 'add_new_item' => 'Add FAQ', 'edit_item' => 'Edit FAQ'],
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => false,
            'supports' => ['title', 'editor', 'page-attributes'],
        ]);

        register_post_type('rentbike_booking', [
            'labels' => ['name' => 'Bookings', 'singular_name' => 'Booking', 'edit_item' => 'Booking'],
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => false,
            'supports' => ['title'],
        ]);
    }

    public function register_admin_menu() {
        add_menu_page('RentBike App', 'RentBike App', 'manage_options', 'rentbike-app', [$this, 'settings_page'], 'dashicons-admin-site-alt3', 30);
        add_submenu_page('rentbike-app', 'Settings', 'Settings', 'manage_options', 'rentbike-app', [$this, 'settings_page']);
        add_submenu_page('rentbike-app', 'Bikes & Prices', 'Bikes & Prices', 'manage_options', 'edit.php?post_type=rentbike_bike');
        add_submenu_page('rentbike-app', 'FAQ', 'FAQ', 'manage_options', 'edit.php?post_type=rentbike_faq');
        add_submenu_page('rentbike-app', 'Bookings', 'Bookings', 'manage_options', 'edit.php?post_type=rentbike_booking');
    }

    /* ------------------------------------------------------------------
     * Settings
     * ---------------------------------------------------------------- */

    public function register_settings() {
        register_setting('rentbike_app_settings', self::OPTION, [
            'sanitize_callback' => [$this, 'sanitize_settings'],
        ]);
    }

    public function default_settings() {
        $uploads = 'https://www.rentbike.nu/wp-content/uploads/';
        return [
            'business_name' => 'Marry Cykler',
            'tagline' => 'Discover Copenhagen by Bike',
            'hero_title' => 'Rent a bike in Copenhagen',
            'hero_subtitle' => 'Simple, affordable and friendly bike rental.',
            'phone' => '+45 31 13 11 65',
            'whatsapp' => '4531131165',
            'email' => 'info@rentbike.nu',
            'booking_email' => 'info@rentbike.nu',
            'address' => 'Frederiksborgvej 50c, 2400 København',
            'currency' => 'DKK',
            'notice_banner' => 'Book your bike today 🚲',
            'show_banner' => true,
            'features' => [
                'No deposit required',
                'Lock and lights included',
                'Easy WhatsApp booking',
                'Return after hours available',
            ],
            'opening_hours' => [
                'monday' => ['closed' => false, 'open' => '09:00', 'close' => '17:00'],
                'tuesday' => ['closed' => false, 'open' => '09:00', 'close' => '17:00'],
                'wednesday' => ['closed' => false, 'open' => '09:00', 'close' => '17:00'],
                'thursday' => ['closed' => false, 'open' => '09:00', 'close' => '17:00'],
                'friday' => ['closed' => false, 'open' => '09:00', 'close' => '17:00'],
                'saturday' => ['closed' => false, 'open' => '09:00', 'close' => '15:00'],
                'sunday' => ['closed' => true, 'open' => '09:00', 'close' => '13:00'],
            ],
            // Website only
            'site_enabled' => false,
            'about_text' => "Marry Cykler is a local bike rental shop in Copenhagen, helping visitors, students, families and groups explore the city in an easy and affordable way.\n\nWhether you need one bike for a short city trip, a cargo bike for extra space, or several bikes for a group, we keep the booking simple. For more than 10 bikes, contact us directly by WhatsApp or phone for fast help and availability.",
            'location_note' => 'Near Nørrebro Metro station (900 m)',
            'gallery' => [
                $uploads . '2024/04/WhatsApp-Image-2024-04-27-at-08.58.58.jpeg',
                $uploads . '2024/05/image0-rotated.jpeg',
                $uploads . '2024/05/b1.2.jpg',
                $uploads . '2025/05/CHILD-SEAT.jpg',
                $uploads . '2026/01/ladcykel.jpg',
            ],
            'play_url' => '',
            'reviews_shortcode' => '',
            'reviews_url' => '',
        ];
    }

    public function get_settings() {
        $defaults = $this->default_settings();
        $saved = get_option(self::OPTION, []);
        $settings = wp_parse_args(is_array($saved) ? $saved : [], $defaults);

        $hours = [];
        foreach (self::DAYS as $day) {
            $row = isset($settings['opening_hours'][$day]) && is_array($settings['opening_hours'][$day]) ? $settings['opening_hours'][$day] : [];
            $hours[$day] = [
                'closed' => !empty($row['closed']),
                'open' => isset($row['open']) ? (string) $row['open'] : $defaults['opening_hours'][$day]['open'],
                'close' => isset($row['close']) ? (string) $row['close'] : $defaults['opening_hours'][$day]['close'],
            ];
        }
        $settings['opening_hours'] = $hours;
        $settings['show_banner'] = !empty($settings['show_banner']);
        $settings['site_enabled'] = !empty($settings['site_enabled']);
        $settings['features'] = array_values(array_filter((array) $settings['features']));
        $settings['gallery'] = array_values(array_filter((array) $settings['gallery']));

        return $settings;
    }

    public function sanitize_settings($input) {
        $input = is_array($input) ? $input : [];
        $out = [];

        foreach (['business_name', 'tagline', 'hero_title', 'phone', 'address', 'currency', 'notice_banner', 'location_note'] as $key) {
            $out[$key] = sanitize_text_field($input[$key] ?? '');
        }
        foreach (['hero_subtitle', 'about_text'] as $key) {
            $out[$key] = sanitize_textarea_field($input[$key] ?? '');
        }
        $out['whatsapp'] = preg_replace('/\D+/', '', (string) ($input['whatsapp'] ?? ''));
        $out['email'] = sanitize_email($input['email'] ?? '');
        $out['booking_email'] = sanitize_email($input['booking_email'] ?? '');
        $out['play_url'] = esc_url_raw(trim((string) ($input['play_url'] ?? '')));
        $out['reviews_url'] = esc_url_raw(trim((string) ($input['reviews_url'] ?? '')));
        $out['reviews_shortcode'] = sanitize_text_field($input['reviews_shortcode'] ?? '');
        $out['show_banner'] = !empty($input['show_banner']);
        $out['site_enabled'] = !empty($input['site_enabled']);

        $features = $input['features'] ?? [];
        if (!is_array($features)) {
            $features = preg_split('/\r\n|\r|\n/', (string) $features);
        }
        $out['features'] = array_values(array_filter(array_map('sanitize_text_field', $features)));

        $gallery = $input['gallery'] ?? [];
        if (!is_array($gallery)) {
            $gallery = preg_split('/\r\n|\r|\n/', (string) $gallery);
        }
        $out['gallery'] = array_values(array_filter(array_map(function ($url) {
            return esc_url_raw(trim((string) $url));
        }, $gallery)));

        $defaults = $this->default_settings();
        $out['opening_hours'] = [];
        foreach (self::DAYS as $day) {
            $row = isset($input['opening_hours'][$day]) && is_array($input['opening_hours'][$day]) ? $input['opening_hours'][$day] : [];
            $open = (string) ($row['open'] ?? '');
            $close = (string) ($row['close'] ?? '');
            $out['opening_hours'][$day] = [
                'closed' => !empty($row['closed']),
                'open' => preg_match('/^\d{2}:\d{2}$/', $open) ? $open : $defaults['opening_hours'][$day]['open'],
                'close' => preg_match('/^\d{2}:\d{2}$/', $close) ? $close : $defaults['opening_hours'][$day]['close'],
            ];
        }

        // Empty text fields fall back to defaults so the app never gets blanks.
        foreach ($out as $key => $value) {
            if ($value === '' && !in_array($key, ['play_url', 'reviews_url', 'reviews_shortcode', 'notice_banner', 'location_note'], true)) {
                unset($out[$key]);
            }
        }

        return $out;
    }

    /** Shown at /privacy-policy/ until a published page with that address exists. */
    public function default_privacy_text() {
        $s = $this->get_settings();
        $name = esc_html($s['business_name']);
        $email = esc_html($s['email']);
        $address = esc_html($s['address']);

        return "<p>This policy covers the {$name} website (rentbike.nu) and the {$name} mobile app.</p>
<h2>Who we are</h2>
<p>{$name}, {$address}. Contact: <a href=\"mailto:{$email}\">{$email}</a>.</p>
<h2>What we collect</h2>
<p>When you send a booking request we collect the details you type in: your name, email address, phone number (optional), the bike type, number of bikes, rental dates and any notes you add. The mobile app does not require an account and does not collect your location, contacts, photos or advertising identifiers.</p>
<h2>Why we collect it</h2>
<p>We use these details only to handle your booking: to check availability, confirm the rental, and contact you about it. We do not use them for advertising and we do not sell them.</p>
<h2>Who receives it</h2>
<p>Your booking is stored on our website and sent by email to {$name} staff. Our website hosting and email providers process the data on our behalf. If you choose to contact us on WhatsApp, your message is handled by WhatsApp under its own privacy policy.</p>
<h2>How long we keep it</h2>
<p>We keep booking details only as long as needed to handle your rental and to meet legal obligations such as bookkeeping rules. After that they are deleted.</p>
<h2>Your rights</h2>
<p>You can ask to see, correct or delete the personal data we hold about you at any time by emailing <a href=\"mailto:{$email}\">{$email}</a>. You also have the right to complain to the Danish Data Protection Agency (Datatilsynet).</p>";
    }

    public function settings_page() {
        $s = $this->get_settings();
        $preview = add_query_arg('rentbike_preview', '1', home_url('/'));
        ?>
        <div class="wrap">
            <h1>RentBike Settings</h1>
            <p>Everything here is shown in the mobile app and on the new website. Change it once, it updates in both places.</p>

            <form method="post" action="options.php">
                <?php settings_fields('rentbike_app_settings'); ?>

                <h2>New website</h2>
                <table class="form-table">
                    <tr>
                        <th scope="row">New website design</th>
                        <td>
                            <label>
                                <input type="checkbox" name="<?php echo esc_attr(self::OPTION); ?>[site_enabled]" value="1" <?php checked($s['site_enabled']); ?> />
                                Show the new design with online booking on the homepage
                            </label>
                            <p class="description">
                                Leave this off until you have checked the <a href="<?php echo esc_url($preview); ?>" target="_blank">preview</a> (only visible to you while logged in).
                                When on, the old FAQ, About and Contact pages send visitors to the matching part of the new homepage. Turn it off to get the old site back.
                            </p>
                        </td>
                    </tr>
                    <?php $this->textarea_field('gallery', 'Gallery photo URLs', ['gallery' => implode("\n", $s['gallery'])], 'One URL per line.'); ?>
                    <?php $this->textarea_field('about_text', 'About text', $s); ?>
                    <?php $this->text_field('location_note', 'Location note', $s); ?>
                    <?php $this->text_field('reviews_shortcode', 'Google reviews shortcode', $s, 'Paste the shortcode from a reviews plugin, for example [trustindex no-registration=google]. Leave empty to hide the reviews.'); ?>
                    <?php $this->text_field('reviews_url', 'Google reviews link', $s, 'Link to your reviews on Google Maps. Adds a Read all reviews button.'); ?>
                    <?php $this->text_field('play_url', 'Google Play link', $s, 'Paste the app link after it is published. Leave empty to hide the app button.'); ?>
                </table>

                <h2>Business details</h2>
                <table class="form-table">
                    <?php $this->text_field('business_name', 'Business name', $s); ?>
                    <?php $this->text_field('tagline', 'Tagline', $s); ?>
                    <?php $this->text_field('hero_title', 'Main headline', $s); ?>
                    <?php $this->textarea_field('hero_subtitle', 'Text under headline', $s); ?>
                    <?php $this->text_field('phone', 'Phone', $s); ?>
                    <?php $this->text_field('whatsapp', 'WhatsApp number', $s, 'Digits only with country code, for example 4531131165.'); ?>
                    <?php $this->text_field('email', 'Public email', $s); ?>
                    <?php $this->text_field('booking_email', 'Send bookings to', $s, 'New booking requests are emailed to this address.'); ?>
                    <?php $this->text_field('address', 'Address', $s); ?>
                    <?php $this->text_field('currency', 'Currency', $s, 'For example € or DKK.'); ?>
                    <?php $this->text_field('notice_banner', 'Notice banner', $s); ?>
                    <tr>
                        <th scope="row">Show banner</th>
                        <td><label><input type="checkbox" name="<?php echo esc_attr(self::OPTION); ?>[show_banner]" value="1" <?php checked($s['show_banner']); ?> /> Show the notice banner</label></td>
                    </tr>
                    <?php $this->textarea_field('features', 'Selling points', ['features' => implode("\n", $s['features'])], 'One per line.'); ?>
                </table>

                <h2>Opening hours</h2>
                <table class="widefat striped" style="max-width:700px;">
                    <thead><tr><th>Day</th><th>Closed?</th><th>Open</th><th>Close</th></tr></thead>
                    <tbody>
                    <?php foreach ($s['opening_hours'] as $day => $hours) :
                        $base = self::OPTION . '[opening_hours][' . $day . ']'; ?>
                        <tr>
                            <td><strong><?php echo esc_html(ucfirst($day)); ?></strong></td>
                            <td><input type="checkbox" name="<?php echo esc_attr($base); ?>[closed]" value="1" <?php checked($hours['closed']); ?> /></td>
                            <td><input type="time" name="<?php echo esc_attr($base); ?>[open]" value="<?php echo esc_attr($hours['open']); ?>" /></td>
                            <td><input type="time" name="<?php echo esc_attr($base); ?>[close]" value="<?php echo esc_attr($hours['close']); ?>" /></td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>

                <?php submit_button('Save Settings'); ?>
            </form>
        </div>
        <?php
    }

    private function text_field($key, $label, $settings, $help = '') {
        echo '<tr><th scope="row"><label>' . esc_html($label) . '</label></th><td>';
        echo '<input type="text" class="regular-text" name="' . esc_attr(self::OPTION . '[' . $key . ']') . '" value="' . esc_attr($settings[$key] ?? '') . '" />';
        if ($help) {
            echo '<p class="description">' . esc_html($help) . '</p>';
        }
        echo '</td></tr>';
    }

    private function textarea_field($key, $label, $settings, $help = '') {
        echo '<tr><th scope="row"><label>' . esc_html($label) . '</label></th><td>';
        echo '<textarea class="large-text" rows="4" name="' . esc_attr(self::OPTION . '[' . $key . ']') . '">' . esc_textarea($settings[$key] ?? '') . '</textarea>';
        if ($help) {
            echo '<p class="description">' . esc_html($help) . '</p>';
        }
        echo '</td></tr>';
    }

    /* ------------------------------------------------------------------
     * Bikes
     * ---------------------------------------------------------------- */

    /**
     * Price, quantity and active flag for a bike. Reads the proper fields and
     * falls back to "price_per_day = 10" lines typed into the description,
     * which is how bikes were entered before version 2.
     */
    private function bike_fields($post) {
        $legacy = [];
        if (preg_match_all(self::LEGACY_LINE, $post->post_content, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $m) {
                $legacy[strtolower($m[1])] = $m[2];
            }
        }
        $fields = [];
        foreach (['price_per_day', 'quantity', 'active'] as $key) {
            $value = get_post_meta($post->ID, $key, true);
            $fields[$key] = $value !== '' ? (string) $value : (string) ($legacy[$key] ?? '');
        }
        return $fields;
    }

    public function get_bikes($only_active = false) {
        $query = new WP_Query([
            'post_type' => 'rentbike_bike',
            'posts_per_page' => -1,
            'post_status' => 'publish',
            'orderby' => ['menu_order' => 'ASC', 'ID' => 'ASC'],
            'no_found_rows' => true,
        ]);

        $bikes = [];
        foreach ($query->posts as $post) {
            $fields = $this->bike_fields($post);
            $active = $fields['active'] !== '0';
            if ($only_active && !$active) {
                continue;
            }
            $description = trim(wp_strip_all_tags(preg_replace(self::LEGACY_LINE, '', $post->post_content)));
            $bikes[] = [
                'id' => $post->ID,
                'name' => html_entity_decode(get_the_title($post), ENT_QUOTES, 'UTF-8'),
                'description' => $description,
                'price_per_day' => $fields['price_per_day'],
                'quantity' => $fields['quantity'],
                'image' => get_the_post_thumbnail_url($post->ID, 'large'),
                'active' => $active,
            ];
        }
        return $bikes;
    }

    public function get_faq() {
        $query = new WP_Query([
            'post_type' => 'rentbike_faq',
            'posts_per_page' => -1,
            'post_status' => 'publish',
            'orderby' => ['menu_order' => 'ASC', 'ID' => 'ASC'],
            'no_found_rows' => true,
        ]);

        $faq = [];
        foreach ($query->posts as $post) {
            $faq[] = [
                'id' => $post->ID,
                'question' => html_entity_decode(get_the_title($post), ENT_QUOTES, 'UTF-8'),
                'answer' => trim(wp_strip_all_tags($post->post_content)),
            ];
        }
        return $faq;
    }

    public function add_meta_boxes() {
        add_meta_box('rentbike_bike_details', 'Price & availability', [$this, 'bike_meta_box'], 'rentbike_bike', 'normal', 'high');
        add_meta_box('rentbike_booking_details', 'Booking details', [$this, 'booking_meta_box'], 'rentbike_booking', 'normal', 'high');
    }

    public function bike_meta_box($post) {
        $fields = $this->bike_fields($post);
        $s = $this->get_settings();
        wp_nonce_field('rentbike_bike', 'rentbike_bike_nonce');
        ?>
        <table class="form-table">
            <tr>
                <th><label for="rb_price">Price per day (<?php echo esc_html($s['currency']); ?>)</label></th>
                <td><input id="rb_price" type="number" min="0" step="0.01" name="rentbike_bike[price_per_day]" value="<?php echo esc_attr($fields['price_per_day']); ?>" /></td>
            </tr>
            <tr>
                <th><label for="rb_qty">Number of bikes</label></th>
                <td>
                    <input id="rb_qty" type="number" min="0" step="1" name="rentbike_bike[quantity]" value="<?php echo esc_attr($fields['quantity']); ?>" />
                    <p class="description">Online bookings are refused when all bikes of this type are already booked for the chosen dates. Leave empty for no limit.</p>
                </td>
            </tr>
            <tr>
                <th>Show to customers</th>
                <td><label><input type="checkbox" name="rentbike_bike[active]" value="1" <?php checked($fields['active'] !== '0'); ?> /> Active</label></td>
            </tr>
        </table>
        <p class="description">The text in the editor above is the bike description. The photo is the Featured image.</p>
        <?php
    }

    public function save_bike_meta($post_id) {
        if (!isset($_POST['rentbike_bike_nonce']) || !wp_verify_nonce(sanitize_key($_POST['rentbike_bike_nonce']), 'rentbike_bike')) {
            return;
        }
        if ((defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) || !current_user_can('edit_post', $post_id)) {
            return;
        }
        $data = isset($_POST['rentbike_bike']) && is_array($_POST['rentbike_bike']) ? wp_unslash($_POST['rentbike_bike']) : [];
        $price = str_replace(',', '.', sanitize_text_field($data['price_per_day'] ?? ''));
        $quantity = sanitize_text_field($data['quantity'] ?? '');

        update_post_meta($post_id, 'price_per_day', is_numeric($price) ? (string) (0 + $price) : '');
        update_post_meta($post_id, 'quantity', is_numeric($quantity) ? (string) max(0, (int) $quantity) : '');
        update_post_meta($post_id, 'active', empty($data['active']) ? '0' : '1');
    }

    /* ------------------------------------------------------------------
     * Bookings admin
     * ---------------------------------------------------------------- */

    public function booking_meta_box($post) {
        $s = $this->get_settings();
        $get = function ($key) use ($post) {
            return (string) get_post_meta($post->ID, $key, true);
        };
        $status = $get('status') ?: 'new';
        $phone_digits = preg_replace('/\D+/', '', $get('phone'));
        wp_nonce_field('rentbike_booking', 'rentbike_booking_nonce');
        ?>
        <table class="form-table">
            <tr><th>Status</th><td>
                <select name="rentbike_booking_status">
                    <?php foreach (self::STATUSES as $value => $label) : ?>
                        <option value="<?php echo esc_attr($value); ?>" <?php selected($status, $value); ?>><?php echo esc_html($label); ?></option>
                    <?php endforeach; ?>
                </select>
                <p class="description">Cancelled bookings free up the bikes again.</p>
            </td></tr>
            <tr><th>Customer</th><td><?php echo esc_html($get('name')); ?></td></tr>
            <tr><th>Email</th><td><a href="mailto:<?php echo esc_attr($get('email')); ?>"><?php echo esc_html($get('email')); ?></a></td></tr>
            <tr><th>Phone</th><td>
                <?php echo esc_html($get('phone') ?: '—'); ?>
                <?php if ($phone_digits) : ?>
                    &nbsp; <a href="<?php echo esc_url('https://wa.me/' . $phone_digits); ?>" target="_blank" rel="noopener">WhatsApp</a>
                <?php endif; ?>
            </td></tr>
            <tr><th>Bike</th><td><?php echo esc_html($get('quantity') . ' × ' . $get('bike_type')); ?></td></tr>
            <tr><th>Dates</th><td><?php echo esc_html($get('start_date') . ' → ' . $get('end_date')); ?></td></tr>
            <?php if ($get('total') !== '') : ?>
                <tr><th>Estimated total</th><td><?php echo esc_html($s['currency'] . ' ' . $get('total')); ?></td></tr>
            <?php endif; ?>
            <tr><th>Notes</th><td><?php echo nl2br(esc_html($get('notes') ?: '—')); ?></td></tr>
            <tr><th>Sent from</th><td><?php echo esc_html($get('source') ?: 'app'); ?></td></tr>
        </table>
        <?php
    }

    public function save_booking_meta($post_id) {
        if (!isset($_POST['rentbike_booking_nonce']) || !wp_verify_nonce(sanitize_key($_POST['rentbike_booking_nonce']), 'rentbike_booking')) {
            return;
        }
        if (!current_user_can('edit_post', $post_id)) {
            return;
        }
        $status = sanitize_key($_POST['rentbike_booking_status'] ?? '');
        if (isset(self::STATUSES[$status])) {
            update_post_meta($post_id, 'status', $status);
        }
    }

    public function booking_columns($columns) {
        return [
            'cb' => $columns['cb'] ?? '',
            'title' => 'Booking',
            'rb_bike' => 'Bike',
            'rb_dates' => 'Dates',
            'rb_contact' => 'Contact',
            'rb_status' => 'Status',
            'date' => 'Received',
        ];
    }

    public function booking_column($column, $post_id) {
        $get = function ($key) use ($post_id) {
            return (string) get_post_meta($post_id, $key, true);
        };
        if ($column === 'rb_bike') {
            echo esc_html($get('quantity') . ' × ' . $get('bike_type'));
        } elseif ($column === 'rb_dates') {
            echo esc_html($get('start_date') . ' → ' . $get('end_date'));
        } elseif ($column === 'rb_contact') {
            echo esc_html($get('email'));
            if ($get('phone')) {
                echo '<br>' . esc_html($get('phone'));
            }
        } elseif ($column === 'rb_status') {
            $status = $get('status') ?: 'new';
            $colors = ['new' => '#b26a00', 'confirmed' => '#1a7f37', 'completed' => '#57606a', 'cancelled' => '#cf222e'];
            echo '<strong style="color:' . esc_attr($colors[$status] ?? '#57606a') . '">' . esc_html(self::STATUSES[$status] ?? $status) . '</strong>';
        }
    }

    /* ------------------------------------------------------------------
     * REST API (used by the mobile app and the website)
     * ---------------------------------------------------------------- */

    public function register_rest_routes() {
        $public = ['permission_callback' => '__return_true'];
        register_rest_route('rentbike/v1', '/settings', ['methods' => 'GET', 'callback' => [$this, 'api_get_settings']] + $public);
        register_rest_route('rentbike/v1', '/bikes', ['methods' => 'GET', 'callback' => [$this, 'api_get_bikes']] + $public);
        register_rest_route('rentbike/v1', '/faq', ['methods' => 'GET', 'callback' => [$this, 'api_get_faq']] + $public);
        register_rest_route('rentbike/v1', '/availability', ['methods' => 'GET', 'callback' => [$this, 'api_get_availability']] + $public);
        register_rest_route('rentbike/v1', '/bookings', ['methods' => 'POST', 'callback' => [$this, 'api_create_booking']] + $public);
    }

    public function api_get_settings() {
        $settings = $this->get_settings();
        unset($settings['site_enabled'], $settings['reviews_shortcode'], $settings['hero_image']);
        return rest_ensure_response($settings);
    }

    public function api_get_bikes() {
        return rest_ensure_response($this->get_bikes());
    }

    public function api_get_faq() {
        return rest_ensure_response($this->get_faq());
    }

    private function valid_date($value) {
        if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', (string) $value, $m)) {
            return false;
        }
        return checkdate((int) $m[2], (int) $m[3], (int) $m[1]);
    }

    /** Bikes of one type already booked on any day in the range. */
    private function booked_quantity($bike_type, $start, $end) {
        $ids = get_posts([
            'post_type' => 'rentbike_booking',
            'post_status' => 'publish',
            'posts_per_page' => -1,
            'fields' => 'ids',
            'meta_query' => [
                ['key' => 'bike_type', 'value' => $bike_type],
                ['key' => 'start_date', 'value' => $end, 'compare' => '<='],
                ['key' => 'end_date', 'value' => $start, 'compare' => '>='],
            ],
        ]);
        $total = 0;
        foreach ($ids as $id) {
            if (get_post_meta($id, 'status', true) !== 'cancelled') {
                $total += max(1, (int) get_post_meta($id, 'quantity', true));
            }
        }
        return $total;
    }

    /** Bikes left for the range, or null when the bike has no stock limit. */
    private function remaining($bike, $start, $end) {
        if (!is_numeric($bike['quantity'])) {
            return null;
        }
        return max(0, (int) $bike['quantity'] - $this->booked_quantity($bike['name'], $start, $end));
    }

    public function api_get_availability(WP_REST_Request $request) {
        $start = (string) $request->get_param('start_date');
        $end = (string) $request->get_param('end_date');
        if (!$this->valid_date($start) || !$this->valid_date($end) || $end < $start) {
            return new WP_Error('invalid_dates', 'Please choose valid dates.', ['status' => 400]);
        }
        $result = [];
        foreach ($this->get_bikes(true) as $bike) {
            $result[] = ['name' => $bike['name'], 'available' => $this->remaining($bike, $start, $end)];
        }
        return rest_ensure_response($result);
    }

    public function api_create_booking(WP_REST_Request $request) {
        $data = $request->get_json_params();
        if (!is_array($data)) {
            $data = $request->get_body_params();
        }

        // Hidden field on the website form. People never fill it in, spam bots do.
        if (!empty($data['website'])) {
            return rest_ensure_response(['success' => true, 'booking_id' => 0, 'message' => 'Booking request received.']);
        }

        $ip = isset($_SERVER['REMOTE_ADDR']) ? sanitize_text_field(wp_unslash($_SERVER['REMOTE_ADDR'])) : '';
        $rate_key = 'rentbike_rl_' . md5($ip);
        $attempts = (int) get_transient($rate_key);
        if ($attempts >= 8) {
            return new WP_Error('too_many', 'Too many booking requests. Please try again in a few minutes or contact us on WhatsApp.', ['status' => 429]);
        }

        $name = sanitize_text_field($data['name'] ?? '');
        $email = sanitize_email($data['email'] ?? '');
        $phone = sanitize_text_field($data['phone'] ?? '');
        $bike_type = sanitize_text_field($data['bike_type'] ?? '');
        $quantity = (int) ($data['quantity'] ?? 1);
        $start_date = sanitize_text_field($data['start_date'] ?? '');
        $end_date = sanitize_text_field($data['end_date'] ?? '');
        $notes = sanitize_textarea_field($data['notes'] ?? '');
        $source = sanitize_key($data['source'] ?? '') === 'website' ? 'website' : 'app';

        if (!$name || !$bike_type || !$start_date || !$end_date) {
            return new WP_Error('missing_fields', 'Please fill all required fields.', ['status' => 400]);
        }
        if (!$email || !is_email($email)) {
            return new WP_Error('invalid_email', 'Please enter a valid email address.', ['status' => 400]);
        }
        if (!$this->valid_date($start_date) || !$this->valid_date($end_date) || $end_date < $start_date) {
            return new WP_Error('invalid_dates', 'Please choose valid rental dates. The end date cannot be before the start date.', ['status' => 400]);
        }
        // One day of slack because the phone and the server can be in different time zones.
        if ($start_date < gmdate('Y-m-d', time() - DAY_IN_SECONDS)) {
            return new WP_Error('invalid_dates', 'The start date is in the past.', ['status' => 400]);
        }
        if ($quantity < 1 || $quantity > 50) {
            return new WP_Error('invalid_quantity', 'Please choose between 1 and 50 bikes. For bigger groups contact us directly.', ['status' => 400]);
        }

        $days = (int) round((strtotime($end_date) - strtotime($start_date)) / DAY_IN_SECONDS) + 1;
        if ($days > 90) {
            return new WP_Error('invalid_dates', 'For rentals longer than 90 days please contact us directly.', ['status' => 400]);
        }

        $bikes = $this->get_bikes(true);
        $bike = null;
        foreach ($bikes as $candidate) {
            if (strcasecmp($candidate['name'], $bike_type) === 0) {
                $bike = $candidate;
                $bike_type = $candidate['name'];
                break;
            }
        }
        if ($bikes && !$bike) {
            return new WP_Error('invalid_bike', 'Please choose one of the available bike types.', ['status' => 400]);
        }

        $total = '';
        if ($bike) {
            $left = $this->remaining($bike, $start_date, $end_date);
            if ($left !== null && $quantity > $left) {
                $message = $left > 0
                    ? sprintf('Only %d × %s left for these dates. Lower the number of bikes or contact us on WhatsApp.', $left, $bike_type)
                    : sprintf('%s is fully booked for these dates. Try other dates or contact us on WhatsApp.', $bike_type);
                return new WP_Error('not_available', $message, ['status' => 409]);
            }
            if (is_numeric($bike['price_per_day'])) {
                $total = (string) round((float) $bike['price_per_day'] * $quantity * $days, 2);
            }
        }

        $booking_id = wp_insert_post([
            'post_type' => 'rentbike_booking',
            'post_status' => 'publish',
            'post_title' => 'Booking - ' . $name . ' - ' . current_time('Y-m-d H:i'),
        ], true);

        if (is_wp_error($booking_id) || !$booking_id) {
            return new WP_Error('booking_failed', 'Could not create booking.', ['status' => 500]);
        }

        set_transient($rate_key, $attempts + 1, 10 * MINUTE_IN_SECONDS);

        $fields = [
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
            'bike_type' => $bike_type,
            'quantity' => $quantity,
            'start_date' => $start_date,
            'end_date' => $end_date,
            'notes' => $notes,
            'total' => $total,
            'source' => $source,
            'status' => 'new',
        ];
        foreach ($fields as $key => $value) {
            update_post_meta($booking_id, $key, $value);
        }

        $this->send_booking_emails($booking_id, $fields, $days);

        return rest_ensure_response([
            'success' => true,
            'booking_id' => $booking_id,
            'message' => 'Booking request received.',
            'days' => $days,
            'total' => $total,
        ]);
    }

    private function send_booking_emails($booking_id, $fields, $days) {
        $s = $this->get_settings();
        $total = $fields['total'] !== '' ? $s['currency'] . ' ' . $fields['total'] : '-';

        $summary = "Bike: {$fields['quantity']} x {$fields['bike_type']}\n";
        $summary .= "From: {$fields['start_date']}\n";
        $summary .= "To: {$fields['end_date']} ({$days} " . ($days === 1 ? 'day' : 'days') . ")\n";
        $summary .= "Estimated total: {$total}\n";

        $admin = "New booking request #{$booking_id} (from the {$fields['source']})\n\n";
        $admin .= "Name: {$fields['name']}\n";
        $admin .= "Email: {$fields['email']}\n";
        $admin .= 'Phone: ' . ($fields['phone'] ?: '-') . "\n";
        $admin .= $summary;
        $admin .= 'Notes: ' . ($fields['notes'] ?: '-') . "\n\n";
        $admin .= 'Open in WordPress: ' . admin_url('post.php?post=' . $booking_id . '&action=edit') . "\n";

        wp_mail(
            $s['booking_email'],
            'New bike booking request #' . $booking_id,
            $admin,
            ['Reply-To: ' . $fields['name'] . ' <' . $fields['email'] . '>']
        );

        $customer = "Hi {$fields['name']},\n\n";
        $customer .= "Thank you. We have received your booking request #{$booking_id}:\n\n";
        $customer .= $summary . "\n";
        $customer .= "This is a request, not a final confirmation. We will contact you shortly to confirm.\n\n";
        $customer .= "Questions? WhatsApp or call us on {$s['phone']}.\n\n";
        $customer .= "{$s['business_name']}\n{$s['address']}\n";

        wp_mail(
            $fields['email'],
            'We received your booking request #' . $booking_id . ' - ' . $s['business_name'],
            $customer,
            ['Reply-To: ' . $s['business_name'] . ' <' . $s['booking_email'] . '>']
        );
    }

    /* ------------------------------------------------------------------
     * Website
     * ---------------------------------------------------------------- */

    /**
     * Which view of the new website this request shows: 'home', 'privacy' or ''.
     * The privacy policy is always served at /privacy-policy/ (Google Play needs
     * the link), even while the new design is switched off.
     */
    public function site_view() {
        if ($this->view !== null) {
            return $this->view;
        }
        if (is_admin() || !did_action('wp')) {
            return '';
        }
        global $wp;
        $s = $this->get_settings();
        $preview = isset($_GET['rentbike_preview']) && current_user_can('manage_options');
        $enabled = $s['site_enabled'] || $preview;
        $path = isset($wp->request) ? trim((string) $wp->request, '/') : '';

        if (is_404() && $path === 'privacy-policy') {
            $this->view = 'privacy';
        } elseif ($enabled && is_page('privacy-policy')) {
            $this->view = 'privacy';
        } elseif ($enabled && is_front_page()) {
            $this->view = 'home';
        } else {
            $this->view = '';
        }
        return $this->view;
    }

    public function template_include($template) {
        $view = $this->site_view();
        if (!$view) {
            return $template;
        }
        if (is_404()) {
            // Built-in privacy policy: there is no WordPress page behind it.
            global $wp_query;
            $wp_query->is_404 = false;
            status_header(200);
        }
        return RENTBIKE_DIR . 'templates/site.php';
    }

    public function document_title($title) {
        $s = $this->get_settings();
        if ($this->site_view() === 'privacy' && !is_page()) {
            return 'Privacy Policy - ' . $s['business_name'];
        }
        return $title;
    }

    public function redirect_old_pages() {
        $s = $this->get_settings();
        if (!$s['site_enabled'] || is_front_page()) {
            return;
        }
        $map = ['faq' => 'faq', 'about-us' => 'about', 'contact-2' => 'contact', 'contact' => 'contact'];
        foreach ($map as $slug => $anchor) {
            if (is_page($slug)) {
                wp_safe_redirect(home_url('/#' . $anchor), 302);
                exit;
            }
        }
    }

    public function enqueue_site_assets() {
        $view = $this->site_view();
        if (!$view) {
            return;
        }
        $s = $this->get_settings();
        // The file time is part of the address, so the host's cache can never serve an old copy after an update.
        $css_version = RENTBIKE_VERSION . '.' . (int) @filemtime(RENTBIKE_DIR . 'assets/site.css');
        $js_version = RENTBIKE_VERSION . '.' . (int) @filemtime(RENTBIKE_DIR . 'assets/site.js');
        wp_enqueue_style('rentbike-site', RENTBIKE_URL . 'assets/site.css', [], $css_version);
        wp_enqueue_script('rentbike-site', RENTBIKE_URL . 'assets/site.js', [], $js_version, true);

        $bikes = [];
        foreach ($this->get_bikes(true) as $bike) {
            $bikes[] = ['name' => $bike['name'], 'price' => $bike['price_per_day'], 'quantity' => $bike['quantity']];
        }
        wp_localize_script('rentbike-site', 'RENTBIKE', [
            'api' => esc_url_raw(rest_url('rentbike/v1')),
            'currency' => $s['currency'],
            'whatsapp' => $s['whatsapp'],
            'hours' => $s['opening_hours'],
            'bikes' => $bikes,
        ]);
    }

    public function format_price($price) {
        $s = $this->get_settings();
        if (!is_numeric($price)) {
            return '';
        }
        $number = (float) $price == (int) $price ? (string) (int) $price : number_format((float) $price, 2);
        return strlen($s['currency']) === 1 || preg_match('/^[^\w\s]+$/u', $s['currency'])
            ? $s['currency'] . $number
            : $number . ' ' . $s['currency'];
    }
}
