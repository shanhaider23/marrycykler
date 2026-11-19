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

    const SMS_TEXTS = [
        // The sender name (MarryCykler) already says who it is from, so the texts skip {shop}.
        'received' => 'Hi {name}, we got your booking #{id}: {quantity}x {bike}, {dates}. We will confirm soon. Tel {phone}',
        'confirmed' => 'Hi {name}, booking #{id} is CONFIRMED: {quantity}x {bike}, {dates}. Pick up: {street}. Tel {phone}',
        'cancelled' => 'Hi {name}, booking #{id} ({dates}) is cancelled. Questions? Tel {phone}',
        // Used instead of 'confirmed' when online payment is on.
        'confirmed_pay' => 'Hi {name}, booking #{id} is CONFIRMED: {quantity}x {bike}, {dates}. Pay {amount} online or in shop: {paylink}',
    ];

    /** The first SMS texts (version 2.4). Too long for one SMS; replaced unless the owner changed them. */
    const OLD_SMS_TEXTS = [
        'Hi {name}, we received your booking request #{id}: {quantity} x {bike}, {start} to {end}. We will confirm shortly. {shop}, {phone}',
        'Hi {name}, your booking #{id} is CONFIRMED: {quantity} x {bike}, {start} to {end}. Pick up at {address}. Questions: {phone}. {shop}',
        'Hi {name}, your booking #{id} ({start} to {end}) has been cancelled. Questions: {phone}. {shop}',
        // 2.8.0 payment SMS, before "pay in the shop" was added
        'Hi {name}, booking #{id} is CONFIRMED: {quantity}x {bike}, {dates}. Pay {amount} here: {paylink}',
    ];

    /** Questions from the old FAQ page. Added once as editable FAQ entries when there are none. */
    const DEFAULT_FAQ = [
        ['Can I return the bikes after opening hours?', 'Yes. Lock the bikes outside the shop with the two locks you got, and put the keys in our letterbox.'],
        ['Do I need to pay a deposit?', 'No. Normal rentals need no deposit.'],
        ['Do the bikes come with locks?', 'Yes. Every bike comes with two locks, and lights are included too.'],
        ['Do you rent cargo bikes?', 'Yes. Cargo bikes are popular, so book in advance to be sure one is free.'],
        ['Can you deliver the bikes to my hotel?', 'Bikes are picked up at our shop. After your rental we can collect them from your hotel.'],
        ['Are you open at weekends?', 'Yes. See our opening hours at the bottom of the page.'],
        ['Do you rent bikes to large groups?', 'Yes, groups of up to 50 people. Please book in advance, and for more than 10 bikes message us on WhatsApp for group pricing.'],
    ];

    const LEGACY_LINE = '/^[ \t]*(price_per_day|quantity|active)[ \t]*=[ \t]*(.*?)[ \t]*\r?$/mi';

    public function __construct() {
        add_action('init', [$this, 'register_post_types']);
        add_action('admin_menu', [$this, 'register_admin_menu']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('admin_init', [$this, 'maybe_seed_faq']);
        add_action('rest_api_init', [$this, 'register_rest_routes']);

        // Bikes admin
        add_action('add_meta_boxes', [$this, 'add_meta_boxes']);
        add_action('save_post_rentbike_bike', [$this, 'save_bike_meta']);

        // Bookings admin
        add_action('save_post_rentbike_booking', [$this, 'save_booking_meta']);
        add_action('admin_post_rentbike_test_sms', [$this, 'handle_test_sms']);
        add_filter('manage_rentbike_booking_posts_columns', [$this, 'booking_columns']);
        add_filter('post_row_actions', [$this, 'booking_row_actions'], 10, 2);
        add_action('admin_post_rentbike_set_status', [$this, 'handle_set_status']);
        add_action('admin_notices', [$this, 'booking_list_notice']);
        add_action('manage_rentbike_booking_posts_custom_column', [$this, 'booking_column'], 10, 2);

        // Website
        add_filter('template_include', [$this, 'template_include'], 99);
        add_filter('pre_get_document_title', [$this, 'document_title'], 99);
        add_action('template_redirect', [$this, 'redirect_old_pages']);
        add_action('init', [$this, 'handle_quick_action'], 20);
        add_action('init', [$this, 'handle_pay_link'], 20);
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
            'notice_banner' => '',
            'show_banner' => false,
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
            // SMS to customers (GatewayAPI)
            'sms_enabled' => false,
            'sms_token' => '',
            'sms_region' => 'eu',
            'sms_sender' => 'MarryCykler',
            'sms_on_received' => true,
            'sms_on_confirmed' => true,
            'sms_on_cancelled' => true,
            // Kept short so one SMS (160 characters) is enough, even with long names.
            'sms_text_received' => self::SMS_TEXTS['received'],
            'sms_text_confirmed' => self::SMS_TEXTS['confirmed'],
            'sms_text_cancelled' => self::SMS_TEXTS['cancelled'],
            'sms_text_confirmed_pay' => self::SMS_TEXTS['confirmed_pay'],
            // Online payment (Stripe Checkout)
            'pay_enabled' => false,
            'stripe_secret' => '',
            'stripe_webhook_secret' => '',
            'stripe_currency' => '',
        ];
    }

    public function get_settings() {
        $defaults = $this->default_settings();
        $saved = get_option(self::OPTION, []);
        $settings = wp_parse_args(is_array($saved) ? $saved : [], $defaults);
        foreach (array_keys(self::SMS_TEXTS) as $event) {
            if (in_array($settings['sms_text_' . $event] ?? '', self::OLD_SMS_TEXTS, true)) {
                $settings['sms_text_' . $event] = self::SMS_TEXTS[$event];
            }
        }
        $settings['pay_enabled'] = !empty($settings['pay_enabled']);
        if (!in_array($settings['stripe_currency'], ['eur', 'dkk'], true)) {
            // Same currency the prices are shown in.
            $settings['stripe_currency'] = preg_match('/€|eur/i', (string) $settings['currency']) ? 'eur' : 'dkk';
        }

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
        foreach (['sms_enabled', 'sms_on_received', 'sms_on_confirmed', 'sms_on_cancelled'] as $flag) {
            $settings[$flag] = !empty($settings[$flag]);
        }
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

        // SMS. The API key is never printed back into the form, so an empty field keeps the saved key.
        $saved = get_option(self::OPTION, []);
        $saved_token = is_array($saved) ? (string) ($saved['sms_token'] ?? '') : '';
        $token = trim((string) ($input['sms_token'] ?? ''));
        $out['sms_token'] = !empty($input['sms_token_remove']) ? '' : ($token !== '' ? sanitize_text_field($token) : $saved_token);
        $out['sms_enabled'] = !empty($input['sms_enabled']);

        // Stripe. Keys are never printed back into the form; an empty field keeps the saved key.
        foreach (['stripe_secret', 'stripe_webhook_secret'] as $key) {
            $saved_key = is_array($saved) ? (string) ($saved[$key] ?? '') : '';
            $typed = trim((string) ($input[$key] ?? ''));
            $out[$key] = !empty($input[$key . '_remove']) ? '' : ($typed !== '' ? sanitize_text_field($typed) : $saved_key);
        }
        $out['pay_enabled'] = !empty($input['pay_enabled']);
        $out['stripe_currency'] = in_array($input['stripe_currency'] ?? '', ['eur', 'dkk'], true) ? $input['stripe_currency'] : '';
        $out['sms_text_confirmed_pay'] = sanitize_textarea_field($input['sms_text_confirmed_pay'] ?? '');
        $out['sms_region'] = ($input['sms_region'] ?? '') === 'com' ? 'com' : 'eu';
        $out['sms_sender'] = substr(preg_replace('/[^A-Za-z0-9 ]/', '', (string) ($input['sms_sender'] ?? '')), 0, 11);
        foreach (['received', 'confirmed', 'cancelled'] as $event) {
            $out['sms_on_' . $event] = !empty($input['sms_on_' . $event]);
            $out['sms_text_' . $event] = sanitize_textarea_field($input['sms_text_' . $event] ?? '');
        }

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
            if ($value === '' && !in_array($key, ['play_url', 'reviews_url', 'reviews_shortcode', 'notice_banner', 'location_note', 'sms_token', 'stripe_secret', 'stripe_webhook_secret', 'stripe_currency'], true)) {
                unset($out[$key]);
            }
        }

        return $out;
    }

    /**
     * Splits the privacy text into an intro and sections at each <h2>,
     * so the page can show them as numbered cards with a contents list.
     */
    public function privacy_sections($html) {
        $parts = preg_split('/<h2[^>]*>(.*?)<\/h2>/is', $html, -1, PREG_SPLIT_DELIM_CAPTURE);
        $intro = trim(array_shift($parts));
        $sections = [];
        for ($i = 0; $i + 1 < count($parts); $i += 2) {
            $title = trim(wp_strip_all_tags($parts[$i]));
            $sections[] = ['id' => sanitize_title($title) ?: 'section-' . ($i / 2 + 1), 'title' => $title, 'body' => trim($parts[$i + 1])];
        }
        return [$intro, $sections];
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
<p>Your booking is stored on our website and sent by email to {$name} staff. Our website hosting and email providers process the data on our behalf. If you choose to contact us on WhatsApp, your message is handled by WhatsApp under its own privacy policy." . ($this->payments_ready() ? ' Online payments are handled by Stripe under its own privacy policy. We never see or store your card details.' : '') . "</p>
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
            <?php if (isset($_GET['rb_sms'])) :
                $ok = $_GET['rb_sms'] === 'ok';
                $msg = sanitize_text_field(wp_unslash($_GET['rb_msg'] ?? '')); ?>
                <div class="notice notice-<?php echo $ok ? 'success' : 'error'; ?> is-dismissible"><p><strong><?php echo $ok ? 'Test SMS sent.' : 'Test SMS failed:'; ?></strong> <?php echo esc_html($msg); ?></p></div>
            <?php endif; ?>
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

                <h2 id="sms">SMS to customers</h2>
                <p>Sends a text message to the customer's phone. Uses <a href="https://gatewayapi.com" target="_blank" rel="noopener">GatewayAPI</a> (Danish SMS service, pay per message). Customers who leave the phone field empty only get emails.</p>
                <table class="form-table">
                    <tr>
                        <th scope="row">Send SMS</th>
                        <td><label><input type="checkbox" name="<?php echo esc_attr(self::OPTION); ?>[sms_enabled]" value="1" <?php checked($s['sms_enabled']); ?> /> Turn on SMS messages</label></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="rb_sms_token">GatewayAPI API key</label></th>
                        <td>
                            <input id="rb_sms_token" type="password" class="regular-text" autocomplete="new-password" name="<?php echo esc_attr(self::OPTION); ?>[sms_token]" value="" placeholder="<?php echo $s['sms_token'] ? esc_attr__('Saved. Leave empty to keep it.') : ''; ?>" />
                            <?php if ($s['sms_token']) : ?>
                                <label style="margin-left:8px"><input type="checkbox" name="<?php echo esc_attr(self::OPTION); ?>[sms_token_remove]" value="1" /> Remove saved key</label>
                            <?php endif; ?>
                            <p class="description">In GatewayAPI: API → API Keys. Copy the key (token) and paste it here.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="rb_sms_region">Account type</label></th>
                        <td>
                            <select id="rb_sms_region" name="<?php echo esc_attr(self::OPTION); ?>[sms_region]">
                                <option value="eu" <?php selected($s['sms_region'], 'eu'); ?>>EU (gatewayapi.eu)</option>
                                <option value="com" <?php selected($s['sms_region'], 'com'); ?>>Global (gatewayapi.com)</option>
                            </select>
                            <p class="description">Pick the website you signed up on.</p>
                        </td>
                    </tr>
                    <?php $this->text_field('sms_sender', 'Sender name', $s, 'Shown as the sender on the phone. Max 11 letters or digits, no special characters.'); ?>
                    <?php foreach (['received' => 'Booking request received', 'confirmed' => 'Booking confirmed', 'cancelled' => 'Booking cancelled'] as $event => $label) : ?>
                        <tr>
                            <th scope="row"><?php echo esc_html($label); ?></th>
                            <td>
                                <label><input type="checkbox" name="<?php echo esc_attr(self::OPTION . '[sms_on_' . $event . ']'); ?>" value="1" <?php checked($s['sms_on_' . $event]); ?> /> Send this SMS</label>
                                <textarea class="large-text" rows="2" style="margin-top:6px" name="<?php echo esc_attr(self::OPTION . '[sms_text_' . $event . ']'); ?>"><?php echo esc_textarea($s['sms_text_' . $event]); ?></textarea>
                                <?php
                                $example = $this->sms_text($s['sms_text_' . $event], [
                                    'name' => 'Christina',
                                    'id' => '2190',
                                    'bike' => 'Cargo Bike',
                                    'quantity' => '2',
                                    'start' => current_time('Y-m-d'),
                                    'end' => gmdate('Y-m-d', strtotime(current_time('Y-m-d') . ' +2 days')),
                                ]);
                                $parts = $this->sms_parts($example);
                                ?>
                                <p class="description" style="<?php echo $parts > 1 ? 'color:#b32d2e' : ''; ?>">
                                    Example (<?php echo esc_html(mb_strlen($example) . ' characters, ' . $parts . ' SMS'); ?>): <?php echo esc_html($example); ?>
                                    <?php if ($parts > 1) : ?><br><strong>Too long for one SMS.</strong> Shorten the text, or it costs <?php echo esc_html($parts); ?> SMS per message.<?php endif; ?>
                                </p>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                    <tr>
                        <th scope="row">Placeholders</th>
                        <td><p class="description"><code>{name}</code> <code>{id}</code> <code>{bike}</code> <code>{quantity}</code> <code>{dates}</code> (for example 14-16 Nov) <code>{start}</code> <code>{end}</code> <code>{shop}</code> <code>{phone}</code> <code>{address}</code> <code>{street}</code> (address before the first comma) &nbsp;·&nbsp; One SMS fits 160 characters, longer texts are sent as 2 or more SMS and cost more.</p></td>
                    </tr>
                </table>

                <h2 id="payments">Online payment (Stripe)</h2>
                <p>When you confirm a booking, the customer's confirmation email and SMS get a <strong>Pay</strong> link. They pay the full rental price on Stripe's secure page with card, MobilePay, Apple Pay or Google Pay. The booking is then marked <strong>Paid</strong>. Turn on the payment methods you want in your Stripe Dashboard under Settings → Payment methods.</p>
                <?php $mode = strpos($s['stripe_secret'], '_test_') !== false ? 'TEST mode (no real money)' : ($s['stripe_secret'] ? 'LIVE mode (real payments)' : ''); ?>
                <table class="form-table">
                    <tr>
                        <th scope="row">Online payment</th>
                        <td>
                            <label><input type="checkbox" name="<?php echo esc_attr(self::OPTION); ?>[pay_enabled]" value="1" <?php checked($s['pay_enabled']); ?> /> Send a payment link when I confirm a booking</label>
                            <?php if ($mode) : ?><p class="description"><strong><?php echo esc_html($mode); ?></strong></p><?php endif; ?>
                        </td>
                    </tr>
                    <?php foreach (['stripe_secret' => ['Stripe secret key', 'Stripe Dashboard → Developers → API keys → Secret key (starts with sk_live_ or sk_test_).'], 'stripe_webhook_secret' => ['Webhook signing secret (recommended)', 'Marks bookings as paid even if the customer closes the browser right after paying. See the steps below.']] as $key => $text) : ?>
                        <tr>
                            <th scope="row"><label for="rb_<?php echo esc_attr($key); ?>"><?php echo esc_html($text[0]); ?></label></th>
                            <td>
                                <input id="rb_<?php echo esc_attr($key); ?>" type="password" class="regular-text" autocomplete="new-password" name="<?php echo esc_attr(self::OPTION . '[' . $key . ']'); ?>" value="" placeholder="<?php echo $s[$key] ? esc_attr('Saved. Leave empty to keep it.') : ''; ?>" />
                                <?php if ($s[$key]) : ?>
                                    <label style="margin-left:8px"><input type="checkbox" name="<?php echo esc_attr(self::OPTION . '[' . $key . '_remove]'); ?>" value="1" /> Remove saved key</label>
                                <?php endif; ?>
                                <p class="description"><?php echo esc_html($text[1]); ?></p>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                    <tr>
                        <th scope="row"><label for="rb_stripe_currency">Charge in</label></th>
                        <td>
                            <select id="rb_stripe_currency" name="<?php echo esc_attr(self::OPTION); ?>[stripe_currency]">
                                <option value="eur" <?php selected($s['stripe_currency'], 'eur'); ?>>EUR (€)</option>
                                <option value="dkk" <?php selected($s['stripe_currency'], 'dkk'); ?>>DKK (kr)</option>
                            </select>
                            <p class="description">Must be the same currency as your bike prices (now shown in <?php echo esc_html($s['currency']); ?>).</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Webhook</th>
                        <td>
                            <p class="description">In Stripe: Developers → Webhooks → Add destination. Endpoint URL:<br><code><?php echo esc_html(rest_url('rentbike/v1/stripe-webhook')); ?></code><br>Events: <code>checkout.session.completed</code> and <code>checkout.session.async_payment_succeeded</code>. Then copy the signing secret (whsec_…) into the field above.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Confirmation SMS with payment link</th>
                        <td>
                            <textarea class="large-text" rows="2" name="<?php echo esc_attr(self::OPTION); ?>[sms_text_confirmed_pay]"><?php echo esc_textarea($s['sms_text_confirmed_pay']); ?></textarea>
                            <?php
                            $example = $this->sms_text($s['sms_text_confirmed_pay'], [
                                'name' => 'Christina', 'id' => '2190', 'bike' => 'Cargo Bike', 'quantity' => '2',
                                'start' => current_time('Y-m-d'), 'end' => gmdate('Y-m-d', strtotime(current_time('Y-m-d') . ' +2 days')),
                                'amount' => $this->format_price(150), 'paylink' => home_url('/') . '?rbpay=2190.0123456789ab',
                            ]);
                            $parts = $this->sms_parts($example);
                            ?>
                            <p class="description" style="<?php echo $parts > 1 ? 'color:#b32d2e' : ''; ?>">Used instead of the normal confirmation SMS when online payment is on. Extra placeholders: <code>{amount}</code> <code>{paylink}</code>.<br>Example (<?php echo esc_html(mb_strlen($example) . ' characters, ' . $parts . ' SMS'); ?>): <?php echo esc_html($example); ?></p>
                        </td>
                    </tr>
                </table>

                <?php submit_button('Save Settings'); ?>
            </form>

            <h2>Send a test SMS</h2>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                <input type="hidden" name="action" value="rentbike_test_sms" />
                <?php wp_nonce_field('rentbike_test_sms'); ?>
                <p>
                    <input type="tel" name="phone" class="regular-text" placeholder="Your mobile, for example 31131165" required />
                    <?php submit_button('Send test SMS', 'secondary', 'submit', false); ?>
                </p>
                <p class="description">Uses the saved settings, so save first. Danish numbers can be typed without +45.</p>
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

    /**
     * Adds the default questions as real FAQ entries (once), so the website and
     * the app show the same list and the owner can edit it under RentBike App > FAQ.
     */
    public function maybe_seed_faq() {
        if (get_option('rentbike_faq_seeded') || !current_user_can('manage_options')) {
            return;
        }
        update_option('rentbike_faq_seeded', 1);
        $existing = get_posts(['post_type' => 'rentbike_faq', 'post_status' => 'any', 'numberposts' => 1, 'fields' => 'ids']);
        if ($existing) {
            return;
        }
        foreach (self::DEFAULT_FAQ as $i => $item) {
            wp_insert_post([
                'post_type' => 'rentbike_faq',
                'post_status' => 'publish',
                'post_title' => $item[0],
                'post_content' => $item[1],
                'menu_order' => $i + 1,
            ]);
        }
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
        // Until the entries are added (first visit to WordPress admin), show the defaults.
        if (!$faq && !get_option('rentbike_faq_seeded')) {
            foreach (self::DEFAULT_FAQ as $i => $item) {
                $faq[] = ['id' => -($i + 1), 'question' => $item[0], 'answer' => $item[1]];
            }
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
            <?php if ($this->payments_ready() || $this->is_paid($post->ID)) :
                if (($get('status') === 'confirmed')) {
                    $this->refresh_payment($post->ID);
                } ?>
                <tr><th>Payment</th><td>
                    <?php if ($this->is_paid($post->ID)) : ?>
                        <strong style="color:#1a7f37">Paid <?php echo esc_html($this->format_price(get_post_meta($post->ID, 'paid_amount', true))); ?></strong>
                        on <?php echo esc_html(get_post_meta($post->ID, 'paid_at', true)); ?> (Stripe)
                        <p class="description">To refund, open the payment in your Stripe Dashboard and click Refund.</p>
                    <?php elseif ($this->can_pay_online($post->ID)) : ?>
                        <?php if ($get('payment_choice') === 'shop') : ?>
                            <strong style="color:#2271b1">Customer pays in the shop</strong> (chose this on <?php echo esc_html($get('payment_choice_at')); ?>). Collect <?php echo esc_html($this->format_price($get('total'))); ?> at pick-up.<br>
                        <?php endif; ?>
                        Not paid yet. <?php echo $get('status') === 'confirmed' ? 'The customer got this payment link:' : 'The customer gets this payment link when you confirm:'; ?><br>
                        <input type="text" readonly class="large-text" value="<?php echo esc_attr($this->pay_url($post->ID)); ?>" onclick="this.select()" />
                    <?php else : ?>
                        — (no price on this booking, pay in the shop)
                    <?php endif; ?>
                </td></tr>
            <?php endif; ?>
            <tr><th>Messages</th><td>
                <?php
                $log = get_post_meta($post->ID, 'message_log', true);
                if (is_array($log) && $log) {
                    foreach ($log as $entry) {
                        $color = !empty($entry['ok']) ? '#1a7f37' : '#cf222e';
                        echo '<div style="color:' . esc_attr($color) . '">' . esc_html(($entry['time'] ?? '') . ' · ' . ($entry['what'] ?? '') . ' · ' . ($entry['info'] ?? '')) . '</div>';
                    }
                } else {
                    echo '—';
                }
                ?>
                <p class="description">Set the status to <strong>Confirmed</strong> and click Update to send the customer a confirmation email<?php echo $s['sms_enabled'] ? ' and SMS' : ''; ?>.</p>
            </td></tr>
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
        if (!isset(self::STATUSES[$status])) {
            return;
        }
        $old = get_post_meta($post_id, 'status', true) ?: 'new';
        update_post_meta($post_id, 'status', $status);
        if ($status !== $old && in_array($status, ['confirmed', 'cancelled'], true)) {
            $this->notify_status($post_id, $status);
        }
    }

    /* ------------------------------------------------------------------
     * Customer messages (email + SMS)
     * ---------------------------------------------------------------- */

    private function booking_fields($booking_id) {
        $fields = [];
        foreach (['name', 'email', 'phone', 'bike_type', 'quantity', 'start_date', 'end_date', 'total'] as $key) {
            $fields[$key] = (string) get_post_meta($booking_id, $key, true);
        }
        return $fields;
    }

    private function log_message($booking_id, $what, $ok, $info) {
        $log = get_post_meta($booking_id, 'message_log', true);
        $log = is_array($log) ? $log : [];
        $log[] = ['time' => current_time('Y-m-d H:i'), 'what' => $what, 'ok' => (bool) $ok, 'info' => $info];
        update_post_meta($booking_id, 'message_log', array_slice($log, -20));
    }

    /** Email + SMS to the customer when a booking is confirmed or cancelled. Sent once per status. */
    private function notify_status($booking_id, $status) {
        if (get_post_meta($booking_id, 'notified_' . $status, true)) {
            return;
        }
        update_post_meta($booking_id, 'notified_' . $status, current_time('mysql'));

        $s = $this->get_settings();
        $f = $this->booking_fields($booking_id);

        if ($f['email']) {
            if ($status === 'confirmed') {
                $subject = 'Your booking #' . $booking_id . ' is confirmed - ' . $s['business_name'];
                $body = "Hi {$f['name']},\n\nGood news: your booking #{$booking_id} is confirmed.\n\n";
                $body .= "Bike: {$f['quantity']} x {$f['bike_type']}\nFrom: {$f['start_date']}\nTo: {$f['end_date']}\n";
                if ($this->can_pay_online($booking_id)) {
                    $body .= "\nTotal: " . $this->format_price($f['total']) . "\n\nPay online now (card, MobilePay, Apple Pay or Google Pay):\n" . $this->pay_url($booking_id) . "\n";
                    $body .= "Prefer cash? Open the same link and tap \"Pay in the shop instead\", or just pay when you pick up the bikes.\n";
                } elseif ($f['total'] !== '') {
                    $body .= "Estimated total: " . $this->format_price($f['total']) . " (pay in the shop at pick-up)\n";
                }
                $body .= "\nPick-up: {$s['address']}\nQuestions? WhatsApp or call us on {$s['phone']}.\n\nSee you soon,\n{$s['business_name']}\n";
            } else {
                $subject = 'Your booking #' . $booking_id . ' has been cancelled - ' . $s['business_name'];
                $body = "Hi {$f['name']},\n\nYour booking #{$booking_id} ({$f['start_date']} to {$f['end_date']}) has been cancelled.\n";
                $body .= "If this is a mistake or you want new dates, WhatsApp or call us on {$s['phone']}.\n\n{$s['business_name']}\n";
            }
            $sent = wp_mail($f['email'], $subject, $body, ['Reply-To: ' . $s['business_name'] . ' <' . $s['booking_email'] . '>']);
            $this->log_message($booking_id, ucfirst($status) . ' email', $sent, $sent ? 'to ' . $f['email'] : 'WordPress could not send the email');
        }

        $this->send_booking_sms($booking_id, $status);
    }

    /** Phone number as GatewayAPI wants it: digits with country code. Danish 8-digit numbers get 45. */
    public function normalize_msisdn($raw) {
        $raw = trim((string) $raw);
        $digits = preg_replace('/\D+/', '', $raw);
        if ($raw !== '' && $raw[0] !== '+' && strpos($digits, '00') === 0) {
            $digits = substr($digits, 2);
        } elseif ($raw !== '' && $raw[0] !== '+' && strlen($digits) === 8) {
            $digits = '45' . $digits;
        }
        return (strlen($digits) >= 10 && strlen($digits) <= 15) ? $digits : '';
    }

    /** SMS for 'received', 'confirmed' or 'cancelled', if switched on and the customer gave a phone number. */
    private function send_booking_sms($booking_id, $event) {
        $s = $this->get_settings();
        if (!$s['sms_enabled'] || !$s['sms_token'] || empty($s['sms_on_' . $event])) {
            return;
        }
        $f = $this->booking_fields($booking_id);
        if (!$f['phone']) {
            return;
        }
        $template = $s['sms_text_' . $event];
        if ($event === 'confirmed' && $this->can_pay_online($booking_id) && trim($s['sms_text_confirmed_pay']) !== '') {
            $template = $s['sms_text_confirmed_pay'];
        }
        $text = $this->sms_text($template, [
            'name' => $f['name'],
            'id' => (string) $booking_id,
            'bike' => $f['bike_type'],
            'quantity' => $f['quantity'],
            'start' => $f['start_date'],
            'end' => $f['end_date'],
            'amount' => $this->format_price($f['total']),
            'paylink' => $this->can_pay_online($booking_id) ? $this->pay_url($booking_id) : '',
        ]);
        $result = $this->send_sms($f['phone'], $text, 'booking-' . $booking_id);
        $this->log_message($booking_id, ucfirst($event) . ' SMS', $result === true, $result === true ? 'to ' . $f['phone'] : $result);
    }

    /** "14 Nov", "14-16 Nov" or "30 Nov-2 Dec". */
    private function sms_dates($start, $end) {
        $a = strtotime((string) $start);
        $b = strtotime((string) $end);
        if (!$a) {
            return (string) $start;
        }
        if (!$b || $b <= $a) {
            return gmdate('j M', $a);
        }
        return gmdate('m', $a) === gmdate('m', $b)
            ? gmdate('j', $a) . '-' . gmdate('j M', $b)
            : gmdate('j M', $a) . '-' . gmdate('j M', $b);
    }

    /** Fills in {name}, {id}, {bike}, {quantity}, {dates}, {start}, {end}, {shop}, {phone}, {address}, {street}. */
    public function sms_text($template, $booking) {
        $s = $this->get_settings();
        // First name only keeps the message short.
        $first = trim(strtok((string) $booking['name'], ' ') ?: (string) $booking['name']);
        return trim(strtr((string) $template, [
            '{name}' => $first,
            '{id}' => $booking['id'],
            '{bike}' => $booking['bike'],
            '{quantity}' => $booking['quantity'],
            '{dates}' => $this->sms_dates($booking['start'], $booking['end']),
            '{start}' => $booking['start'],
            '{end}' => $booking['end'],
            '{shop}' => $s['business_name'],
            '{phone}' => $s['phone'],
            '{address}' => $s['address'],
            '{street}' => trim(strtok($s['address'], ',') ?: $s['address']),
            '{amount}' => $booking['amount'] ?? '',
            '{paylink}' => $booking['paylink'] ?? '',
        ]));
    }

    /** How many SMS a text needs: 160 characters fit in one (70 if it has emoji or other special characters). */
    public function sms_parts($text) {
        $length = mb_strlen($text);
        // Characters that fit the normal SMS alphabet (GSM-7). Danish æ ø å are included.
        $gsm = '@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà^{}\\[~]|€' . "\n\r";
        $plain = true;
        foreach (preg_split('//u', $text, -1, PREG_SPLIT_NO_EMPTY) as $char) {
            if (mb_strpos($gsm, $char) === false) {
                $plain = false;
                break;
            }
        }
        $single = $plain ? 160 : 70;
        $multi = $plain ? 153 : 67;
        return $length <= $single ? 1 : (int) ceil($length / $multi);
    }

    /** Sends one SMS. Returns true, or an error message. */
    public function send_sms($phone, $message, $reference = '') {
        $s = $this->get_settings();
        if (!$s['sms_token']) {
            return 'No GatewayAPI API key saved.';
        }
        $msisdn = $this->normalize_msisdn($phone);
        if (!$msisdn) {
            return 'Not a valid mobile number: ' . $phone;
        }
        $body = [
            'sender' => $s['sms_sender'] ?: 'MarryCykler',
            'message' => $message,
            'recipient' => PHP_INT_SIZE >= 8 ? (int) $msisdn : $msisdn,
        ];
        if ($reference) {
            $body['reference'] = $reference;
        }
        $response = wp_remote_post('https://messaging.gatewayapi.' . $s['sms_region'] . '/mobile/single', [
            'timeout' => 12,
            'headers' => [
                'Authorization' => 'Token ' . $s['sms_token'],
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ],
            'body' => wp_json_encode($body),
        ]);
        if (is_wp_error($response)) {
            return 'Could not reach GatewayAPI: ' . $response->get_error_message();
        }
        $code = (int) wp_remote_retrieve_response_code($response);
        $data = json_decode((string) wp_remote_retrieve_body($response), true);
        if ($code >= 200 && $code < 300 && !empty($data['msg_id'])) {
            return true;
        }
        // Error bodies look like {"description":"Unauthorized","detail":[...]} or {"message":"..."}.
        $detail = '';
        if (is_array($data)) {
            foreach (['message', 'description', 'detail'] as $key) {
                if (!empty($data[$key])) {
                    $detail = is_scalar($data[$key]) ? (string) $data[$key] : wp_json_encode($data[$key]);
                    break;
                }
            }
        } else {
            $detail = (string) wp_remote_retrieve_body($response);
        }
        if ($code === 403 || $code === 401) {
            $detail = 'API key not accepted. Check the key and the account type (EU / Global). ' . $detail;
        }
        return 'GatewayAPI error ' . $code . ': ' . substr(wp_strip_all_tags($detail), 0, 300);
    }

    public function handle_test_sms() {
        if (!current_user_can('manage_options')) {
            wp_die('Not allowed');
        }
        check_admin_referer('rentbike_test_sms');
        $s = $this->get_settings();
        $phone = sanitize_text_field(wp_unslash($_POST['phone'] ?? ''));
        $result = $this->send_sms($phone, 'Test from ' . $s['business_name'] . ': SMS messages are working.');
        wp_safe_redirect(add_query_arg([
            'page' => 'rentbike-app',
            'rb_sms' => $result === true ? 'ok' : 'fail',
            'rb_msg' => rawurlencode($result === true ? 'Check your phone.' : $result),
        ], admin_url('admin.php')) . '#sms');
        exit;
    }

    /** "Confirm" / "Cancel" links under each booking in the Bookings list. */
    public function booking_row_actions($actions, $post) {
        if ($post->post_type !== 'rentbike_booking' || !current_user_can('edit_post', $post->ID)) {
            return $actions;
        }
        $status = get_post_meta($post->ID, 'status', true) ?: 'new';
        $s = $this->get_settings();
        $what = $s['sms_enabled'] ? 'email + SMS' : 'email';
        foreach (['confirmed' => 'Confirm', 'cancelled' => 'Cancel'] as $target => $label) {
            if ($status === $target) {
                continue;
            }
            $url = wp_nonce_url(
                admin_url('admin-post.php?action=rentbike_set_status&booking=' . $post->ID . '&status=' . $target),
                'rentbike_set_status_' . $post->ID
            );
            $style = $target === 'confirmed' ? 'color:#1a7f37;font-weight:600' : 'color:#cf222e';
            $confirm = $target === 'cancelled' ? ' onclick="return confirm(\'Cancel this booking and notify the customer?\')"' : '';
            $actions['rb_' . $target] = '<a href="' . esc_url($url) . '" style="' . $style . '"' . $confirm . '>' . esc_html($label . ' & send ' . $what) . '</a>';
        }
        return $actions;
    }

    public function handle_set_status() {
        $id = absint($_GET['booking'] ?? 0);
        $status = sanitize_key($_GET['status'] ?? '');
        if (!$id || get_post_type($id) !== 'rentbike_booking' || !in_array($status, ['confirmed', 'cancelled'], true)) {
            wp_die('Unknown booking.');
        }
        if (!current_user_can('edit_post', $id)) {
            wp_die('Not allowed.');
        }
        check_admin_referer('rentbike_set_status_' . $id);

        $old = get_post_meta($id, 'status', true) ?: 'new';
        update_post_meta($id, 'status', $status);
        if ($old !== $status) {
            $this->notify_status($id, $status);
        }
        wp_safe_redirect(add_query_arg(['post_type' => 'rentbike_booking', 'rb_done' => $id, 'rb_status' => $status], admin_url('edit.php')));
        exit;
    }

    /** After a Confirm / Cancel click: say what was sent, or what went wrong. */
    public function booking_list_notice() {
        if (empty($_GET['rb_done']) || !function_exists('get_current_screen') || get_current_screen()->id !== 'edit-rentbike_booking') {
            return;
        }
        $id = absint($_GET['rb_done']);
        $status = sanitize_key($_GET['rb_status'] ?? '');
        $log = get_post_meta($id, 'message_log', true);
        $recent = is_array($log) ? array_filter($log, function ($entry) use ($status) {
            return stripos($entry['what'] ?? '', $status) === 0;
        }) : [];
        $failed = array_filter($recent, function ($entry) {
            return empty($entry['ok']);
        });
        $class = $failed ? 'notice-warning' : 'notice-success';
        echo '<div class="notice ' . esc_attr($class) . ' is-dismissible"><p><strong>Booking #' . esc_html($id) . ' ' . esc_html($status) . '.</strong> ';
        if (!$recent) {
            echo 'No messages were sent (they were already sent earlier, or the customer gave no email or phone).';
        }
        foreach ($recent as $entry) {
            echo '<br>' . (empty($entry['ok']) ? '✗ ' : '✓ ') . esc_html($entry['what'] . ': ' . $entry['info']);
        }
        echo '</p></div>';
    }

    public function booking_columns($columns) {
        return [
            'cb' => $columns['cb'] ?? '',
            'title' => 'Booking',
            'rb_bike' => 'Bike',
            'rb_dates' => 'Dates',
            'rb_contact' => 'Contact',
            'rb_status' => 'Status',
            'rb_paid' => 'Payment',
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
        } elseif ($column === 'rb_paid') {
            if ($this->is_paid($post_id)) {
                echo '<strong style="color:#1a7f37">Paid ' . esc_html($this->format_price($get('paid_amount'))) . '</strong>';
            } elseif ($this->can_pay_online($post_id) && $get('status') === 'confirmed') {
                echo get_post_meta($post_id, 'payment_choice', true) === 'shop'
                    ? '<span style="color:#2271b1">Pays in shop</span>'
                    : '<span style="color:#b26a00">Waiting</span>';
            } else {
                echo '—';
            }
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
        register_rest_route('rentbike/v1', '/stripe-webhook', ['methods' => 'POST', 'callback' => [$this, 'api_stripe_webhook']] + $public);
    }

    public function api_get_settings() {
        $settings = $this->get_settings();
        unset($settings['site_enabled'], $settings['reviews_shortcode'], $settings['hero_image']);
        $settings['show_banner'] = false;
        $settings['notice_banner'] = '';
        $settings['payments_online'] = $this->payments_ready();
        unset($settings['pay_enabled']);
        foreach (array_keys($settings) as $key) {
            if (strpos($key, 'sms_') === 0 || strpos($key, 'stripe_') === 0) {
                unset($settings[$key]);
            }
        }
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
        $this->send_booking_sms($booking_id, 'received');

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
        $admin .= "Quick actions (tap on your phone, no login needed):\n";
        $admin .= 'CONFIRM: ' . $this->quick_url($booking_id, 'confirmed') . "\n";
        $admin .= 'CANCEL:  ' . $this->quick_url($booking_id, 'cancelled') . "\n\n";
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
     * Online payment (Stripe Checkout)
     * ---------------------------------------------------------------- */

    public function payments_ready() {
        $s = $this->get_settings();
        return $s['pay_enabled'] && $s['stripe_secret'] !== '';
    }

    public function is_paid($booking_id) {
        return get_post_meta($booking_id, 'payment_status', true) === 'paid';
    }

    private function amount_cents($booking_id) {
        $total = get_post_meta($booking_id, 'total', true);
        return is_numeric($total) ? (int) round((float) $total * 100) : 0;
    }

    /** True when this booking can be paid online right now. */
    public function can_pay_online($booking_id) {
        return $this->payments_ready() && !$this->is_paid($booking_id) && $this->amount_cents($booking_id) > 0;
    }

    private function pay_key($booking_id) {
        return substr(hash_hmac('sha256', $booking_id . '|pay', wp_salt('auth') . '|rentbike-pay'), 0, 12);
    }

    /** Short, never-expiring link for the customer. Each tap starts a fresh Stripe Checkout. */
    public function pay_url($booking_id) {
        return home_url('/') . '?rbpay=' . $booking_id . '.' . $this->pay_key($booking_id);
    }

    private function stripe_request($method, $path, $params = []) {
        $s = $this->get_settings();
        $url = 'https://api.stripe.com/v1/' . $path;
        $args = [
            'method' => $method,
            'timeout' => 20,
            'headers' => ['Authorization' => 'Bearer ' . $s['stripe_secret']],
        ];
        if ($method === 'POST') {
            $args['body'] = $params;
        } elseif ($params) {
            $url = add_query_arg($params, $url);
        }
        $response = wp_remote_request($url, $args);
        if (is_wp_error($response)) {
            return new WP_Error('stripe', 'Could not reach Stripe: ' . $response->get_error_message());
        }
        $code = (int) wp_remote_retrieve_response_code($response);
        $data = json_decode((string) wp_remote_retrieve_body($response), true);
        if ($code < 200 || $code >= 300) {
            $message = is_array($data) && isset($data['error']['message']) ? $data['error']['message'] : 'unknown error';
            return new WP_Error('stripe', 'Stripe error ' . $code . ': ' . $message);
        }
        return is_array($data) ? $data : new WP_Error('stripe', 'Unexpected answer from Stripe.');
    }

    private function create_checkout($booking_id) {
        $s = $this->get_settings();
        $f = $this->booking_fields($booking_id);
        $back = $this->pay_url($booking_id);
        $params = [
            'mode' => 'payment',
            'submit_type' => 'book',
            'locale' => 'auto',
            'client_reference_id' => (string) $booking_id,
            'line_items[0][quantity]' => 1,
            'line_items[0][price_data][currency]' => $s['stripe_currency'],
            'line_items[0][price_data][unit_amount]' => $this->amount_cents($booking_id),
            'line_items[0][price_data][product_data][name]' => 'Bike rental #' . $booking_id . ': ' . $f['quantity'] . ' x ' . $f['bike_type'] . ', ' . $this->sms_dates($f['start_date'], $f['end_date']),
            'metadata[booking_id]' => (string) $booking_id,
            'payment_intent_data[metadata][booking_id]' => (string) $booking_id,
            'payment_intent_data[description]' => $s['business_name'] . ' booking #' . $booking_id,
            'success_url' => $back . '&rbpaid={CHECKOUT_SESSION_ID}',
            'cancel_url' => $back . '&rbcancel=1',
        ];
        if (is_email($f['email'])) {
            $params['customer_email'] = $f['email'];
        }
        $session = $this->stripe_request('POST', 'checkout/sessions', $params);
        if (!is_wp_error($session) && !empty($session['id'])) {
            add_post_meta($booking_id, 'stripe_session', $session['id']);
        }
        return $session;
    }

    /** Asks Stripe whether one of this booking's checkouts was paid (for when the webhook is not set up). */
    public function refresh_payment($booking_id) {
        if ($this->is_paid($booking_id) || !$this->payments_ready()) {
            return;
        }
        $sessions = array_slice(array_reverse((array) get_post_meta($booking_id, 'stripe_session', false)), 0, 3);
        foreach ($sessions as $session_id) {
            $session = $this->stripe_request('GET', 'checkout/sessions/' . rawurlencode($session_id));
            if (!is_wp_error($session) && ($session['payment_status'] ?? '') === 'paid' && (string) ($session['client_reference_id'] ?? '') === (string) $booking_id) {
                $this->mark_paid($booking_id, $session);
                return;
            }
        }
    }

    private function mark_paid($booking_id, $session) {
        // add_post_meta with $unique fails if the key exists: stops double emails when
        // the webhook and the customer's return page arrive at the same moment.
        if ($this->is_paid($booking_id) || !add_post_meta($booking_id, 'payment_lock', 1, true)) {
            return;
        }
        $amount = number_format(((int) ($session['amount_total'] ?? 0)) / 100, 2, '.', '');
        update_post_meta($booking_id, 'payment_status', 'paid');
        update_post_meta($booking_id, 'paid_amount', $amount);
        update_post_meta($booking_id, 'paid_at', current_time('mysql'));
        update_post_meta($booking_id, 'stripe_payment_intent', is_string($session['payment_intent'] ?? null) ? $session['payment_intent'] : '');

        $s = $this->get_settings();
        $f = $this->booking_fields($booking_id);
        $money = $this->format_price($amount);
        $this->log_message($booking_id, 'Payment', true, $money . ' received through Stripe');

        if ($f['email']) {
            $body = "Hi {$f['name']},\n\nThank you! We received your payment of {$money} for booking #{$booking_id}.\n\n";
            $body .= "Bike: {$f['quantity']} x {$f['bike_type']}\nFrom: {$f['start_date']}\nTo: {$f['end_date']}\n\nPick-up: {$s['address']}\nQuestions? WhatsApp or call us on {$s['phone']}.\n\nSee you soon,\n{$s['business_name']}\n";
            $sent = wp_mail($f['email'], 'Payment received for booking #' . $booking_id . ' - ' . $s['business_name'], $body, ['Reply-To: ' . $s['business_name'] . ' <' . $s['booking_email'] . '>']);
            $this->log_message($booking_id, 'Payment email', $sent, $sent ? 'to ' . $f['email'] : 'WordPress could not send the email');
        }
        wp_mail(
            $s['booking_email'],
            'Booking #' . $booking_id . ' is paid (' . $money . ')',
            "{$f['name']} paid {$money} for booking #{$booking_id} ({$f['quantity']} x {$f['bike_type']}, {$f['start_date']} to {$f['end_date']}).\n\n" . admin_url('post.php?post=' . $booking_id . '&action=edit') . "\n"
        );
    }

    /** The customer's payment link: ?rbpay=ID.KEY */
    public function handle_pay_link() {
        if (!isset($_GET['rbpay'])) {
            return;
        }
        nocache_headers();
        header('X-Robots-Tag: noindex, nofollow');

        $parts = explode('.', sanitize_text_field(wp_unslash($_GET['rbpay'])), 2);
        $id = absint($parts[0] ?? 0);
        if (!$id || get_post_type($id) !== 'rentbike_booking' || !hash_equals($this->pay_key($id), (string) ($parts[1] ?? ''))) {
            $this->quick_page('Link not valid', '<p>This payment link is broken or incomplete. Please contact us.</p>', 403);
        }

        $s = $this->get_settings();
        $f = $this->booking_fields($id);
        $status = get_post_meta($id, 'status', true) ?: 'new';
        $contact = '<p class="muted">Questions? WhatsApp or call ' . esc_html($s['phone']) . '.</p>';

        // Back from Stripe after paying.
        if (!empty($_GET['rbpaid']) && !$this->is_paid($id) && $this->payments_ready()) {
            $session = $this->stripe_request('GET', 'checkout/sessions/' . rawurlencode(sanitize_text_field(wp_unslash($_GET['rbpaid']))));
            if (!is_wp_error($session) && ($session['payment_status'] ?? '') === 'paid' && (string) ($session['client_reference_id'] ?? '') === (string) $id) {
                $this->mark_paid($id, $session);
            }
        }
        if (!$this->is_paid($id)) {
            $this->refresh_payment($id);
        }

        $summary = '<table>'
            . '<tr><th>Booking</th><td>#' . esc_html($id) . '</td></tr>'
            . '<tr><th>Bike</th><td>' . esc_html($f['quantity'] . ' x ' . $f['bike_type']) . '</td></tr>'
            . '<tr><th>Dates</th><td>' . esc_html($this->sms_dates($f['start_date'], $f['end_date'])) . '</td></tr>'
            . '<tr><th>Pick-up</th><td>' . esc_html(trim(strtok($s['address'], ',') ?: $s['address'])) . '</td></tr>'
            . '<tr><th>Total</th><td><strong>' . esc_html($this->format_price($f['total']) ?: '-') . '</strong></td></tr>'
            . '</table>';

        if ($this->is_paid($id)) {
            $paid = $this->format_price(get_post_meta($id, 'paid_amount', true));
            $this->quick_page('Thank you, booking #' . $id . ' is paid', '<p class="ok">✓ We received ' . esc_html($paid) . '. A receipt is on its way to your email.</p>' . $summary . $contact);
        }
        if ($status === 'cancelled') {
            $this->quick_page('Booking #' . $id . ' is cancelled', '<p>This booking was cancelled, so there is nothing to pay.</p>' . $contact);
        }
        if ($status !== 'confirmed') {
            $this->quick_page('Booking #' . $id . ' is not confirmed yet', '<p>We send you a payment link as soon as we confirm your booking.</p>' . $contact);
        }
        if (!$this->can_pay_online($id)) {
            $this->quick_page('Pay in the shop', '<p>Online payment is not available for this booking. You pay when you pick up the bikes.</p>' . $summary . $contact);
        }

        $choice = get_post_meta($id, 'payment_choice', true);

        // "Pay in the shop instead"
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST' && ($_POST['rbchoice'] ?? '') === 'shop') {
            if ($choice !== 'shop') {
                update_post_meta($id, 'payment_choice', 'shop');
                update_post_meta($id, 'payment_choice_at', current_time('mysql'));
                $this->log_message($id, 'Payment', true, 'Customer will pay in the shop');
                wp_mail(
                    $s['booking_email'],
                    'Booking #' . $id . ': customer pays in the shop',
                    "{$f['name']} chose to pay " . $this->format_price($f['total']) . " in the shop for booking #{$id} ({$f['quantity']} x {$f['bike_type']}, {$f['start_date']} to {$f['end_date']}).\n\n" . admin_url('post.php?post=' . $id . '&action=edit') . "\n"
                );
            }
            $this->quick_page(
                'OK, you pay in the shop',
                '<p class="ok">✓ Your booking #' . esc_html($id) . ' stays confirmed. Pay ' . esc_html($this->format_price($f['total'])) . ' when you pick up the bikes (cash, card or MobilePay).</p>'
                . $summary
                . '<p class="muted">Changed your mind? <a href="' . esc_url($this->pay_url($id)) . '">Pay online instead</a>.</p>' . $contact
            );
        }

        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
            $session = $this->create_checkout($id);
            $url = is_wp_error($session) ? '' : (string) ($session['url'] ?? '');
            if ($url && preg_match('#^https://([a-z0-9-]+\.)*stripe\.com/#i', $url)) {
                wp_redirect($url, 303);
                exit;
            }
            $this->log_message($id, 'Payment', false, is_wp_error($session) ? $session->get_error_message() : 'No checkout link from Stripe');
            $this->quick_page('Payment could not start', '<p class="bad">Something went wrong on our side. Please try again in a moment, or pay in the shop.</p>' . $contact);
        }

        $note = !empty($_GET['rbcancel']) ? '<p class="bad">The payment was not completed. You can try again, or pay in the shop.</p>' : '';
        if ($choice === 'shop') {
            $note .= '<p class="muted">You chose to pay in the shop. You can still pay online here if you prefer.</p>';
        }
        $button = '<form method="post"><input type="hidden" name="rbchoice" value="online"><button type="submit">Pay ' . esc_html($this->format_price($f['total'])) . ' online</button></form>'
            . '<p class="muted">Card, MobilePay, Apple Pay or Google Pay. Secure payment by Stripe; we never see your card details.</p>'
            . ($choice === 'shop' ? '' : '<form method="post"><input type="hidden" name="rbchoice" value="shop"><button type="submit" class="ghost">Pay in the shop instead</button></form>'
                . '<p class="muted">Pay with cash, card or MobilePay when you pick up the bikes.</p>');
        $this->quick_page('Pay for booking #' . $id, $note . $summary . $button);
    }

    /** Stripe tells us about finished payments here (optional but recommended). */
    public function api_stripe_webhook(WP_REST_Request $request) {
        $s = $this->get_settings();
        if ($s['stripe_webhook_secret'] === '') {
            return new WP_Error('no_secret', 'Webhook signing secret is not set in RentBike settings.', ['status' => 400]);
        }
        $payload = $request->get_body();
        $timestamp = '';
        $signatures = [];
        foreach (explode(',', (string) $request->get_header('stripe_signature')) as $part) {
            $pair = explode('=', trim($part), 2);
            if (count($pair) !== 2) {
                continue;
            }
            if ($pair[0] === 't') {
                $timestamp = $pair[1];
            } elseif ($pair[0] === 'v1') {
                $signatures[] = $pair[1];
            }
        }
        if (!$timestamp || !$signatures || abs(time() - (int) $timestamp) > 300) {
            return new WP_Error('bad_signature', 'Missing or old signature.', ['status' => 400]);
        }
        $expected = hash_hmac('sha256', $timestamp . '.' . $payload, $s['stripe_webhook_secret']);
        $valid = false;
        foreach ($signatures as $signature) {
            if (hash_equals($expected, $signature)) {
                $valid = true;
            }
        }
        if (!$valid) {
            return new WP_Error('bad_signature', 'Signature does not match.', ['status' => 400]);
        }

        $event = json_decode($payload, true);
        $type = $event['type'] ?? '';
        $object = $event['data']['object'] ?? [];
        if (in_array($type, ['checkout.session.completed', 'checkout.session.async_payment_succeeded'], true) && ($object['payment_status'] ?? '') === 'paid') {
            $id = absint($object['client_reference_id'] ?? ($object['metadata']['booking_id'] ?? 0));
            if ($id && get_post_type($id) === 'rentbike_booking') {
                $this->mark_paid($id, $object);
            }
        }
        return rest_ensure_response(['received' => true]);
    }

    /* ------------------------------------------------------------------
     * Confirm / cancel straight from the booking email (no login)
     * ---------------------------------------------------------------- */

    /** Secret key for one booking + action. Only someone with the email has it. */
    private function quick_key($booking_id, $status) {
        return substr(hash_hmac('sha256', $booking_id . '|' . $status, wp_salt('auth') . '|rentbike-quick'), 0, 32);
    }

    public function quick_url($booking_id, $status) {
        return add_query_arg([
            'rentbike_booking' => $booking_id,
            'do' => $status,
            'key' => $this->quick_key($booking_id, $status),
        ], home_url('/'));
    }

    /**
     * Opening the link only shows the booking and a button; pressing the button
     * does the change. Email scanners that open links can therefore never
     * confirm or cancel anything by themselves.
     */
    public function handle_quick_action() {
        if (!isset($_GET['rentbike_booking'])) {
            return;
        }
        nocache_headers();
        header('X-Robots-Tag: noindex, nofollow');

        $id = absint($_GET['rentbike_booking']);
        $status = sanitize_key($_GET['do'] ?? '');
        $key = sanitize_text_field(wp_unslash($_GET['key'] ?? ''));
        $valid = $id
            && get_post_type($id) === 'rentbike_booking'
            && in_array($status, ['confirmed', 'cancelled'], true)
            && hash_equals($this->quick_key($id, $status), $key);
        if (!$valid) {
            $this->quick_page('Link not valid', '<p>This link is broken or incomplete. Open the booking in WordPress instead.</p>', 403);
        }
        // Links stop working 60 days after the booking was made.
        if (time() - (int) get_post_time('U', true, $id) > 60 * DAY_IN_SECONDS) {
            $this->quick_page('Link expired', '<p>This link is too old. Open the booking in WordPress instead.</p>', 410);
        }

        $f = $this->booking_fields($id);
        $current = get_post_meta($id, 'status', true) ?: 'new';
        $label = $status === 'confirmed' ? 'Confirm' : 'Cancel';
        $summary = '<table>'
            . '<tr><th>Customer</th><td>' . esc_html($f['name']) . '</td></tr>'
            . '<tr><th>Bike</th><td>' . esc_html($f['quantity'] . ' x ' . $f['bike_type']) . '</td></tr>'
            . '<tr><th>Dates</th><td>' . esc_html($this->sms_dates($f['start_date'], $f['end_date'])) . '</td></tr>'
            . '<tr><th>Phone</th><td>' . esc_html($f['phone'] ?: '-') . '</td></tr>'
            . '<tr><th>Status</th><td>' . esc_html(self::STATUSES[$current] ?? $current) . '</td></tr>'
            . ($this->is_paid($id) ? '<tr><th>Payment</th><td>Paid ' . esc_html($this->format_price(get_post_meta($id, 'paid_amount', true))) . ($status === 'cancelled' ? ' — refund it in your Stripe Dashboard' : '') . '</td></tr>' : '')
            . '</table>';

        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
            if ($current !== $status) {
                update_post_meta($id, 'status', $status);
                $this->notify_status($id, $status);
            }
            $log = get_post_meta($id, 'message_log', true);
            $lines = '';
            foreach (is_array($log) ? $log : [] as $entry) {
                if (stripos($entry['what'] ?? '', $status) === 0) {
                    $lines .= '<li class="' . (empty($entry['ok']) ? 'bad' : 'ok') . '">' . (empty($entry['ok']) ? '✗ ' : '✓ ') . esc_html($entry['what'] . ': ' . $entry['info']) . '</li>';
                }
            }
            $done = $status === 'confirmed' ? 'Booking #' . $id . ' is confirmed' : 'Booking #' . $id . ' is cancelled';
            $this->quick_page($done, ($lines ? '<ul>' . $lines . '</ul>' : '<p>No messages sent (the customer gave no email or phone, or they were sent before).</p>')
                . '<p class="muted"><a href="' . esc_url(admin_url('edit.php?post_type=rentbike_booking')) . '">All bookings</a></p>');
        }

        if ($current === $status) {
            $this->quick_page('Booking #' . $id . ' is already ' . strtolower(self::STATUSES[$status]), $summary . '<p class="muted">Nothing to do. The customer was already told.</p>');
        }

        $s = $this->get_settings();
        $what = ($f['email'] ? 'an email' : '') . ($f['email'] && $f['phone'] && $s['sms_enabled'] ? ' and ' : '') . ($f['phone'] && $s['sms_enabled'] ? 'an SMS' : '');
        $button = '<form method="post"><button type="submit" class="' . ($status === 'cancelled' ? 'danger' : '') . '">' . esc_html($label . ' booking #' . $id) . '</button></form>'
            . ($what ? '<p class="muted">The customer gets ' . esc_html($what) . '.</p>' : '');
        $this->quick_page($label . ' booking #' . $id . '?', $summary . $button);
    }

    private function quick_page($title, $body, $code = 200) {
        $s = $this->get_settings();
        status_header($code);
        header('Content-Type: text/html; charset=utf-8');
        echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>' . esc_html($title) . '</title><style>'
            . '*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0C0F0A;color:#F0EDE6;font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:20px;box-sizing:border-box}'
            . '.card{width:100%;max-width:440px;background:#0E1A08;border:1px solid #2A3A1A;border-radius:24px;padding:28px}'
            . '.brand{color:#8DBF5B;font-size:11px;font-weight:600;letter-spacing:.25em;text-transform:uppercase;margin:0 0 12px}'
            . 'h1{font-size:26px;line-height:1.15;margin:0 0 18px}table{width:100%;border-collapse:collapse;margin-bottom:20px}'
            . 'th,td{padding:8px 0;border-top:1px solid #1E2218;text-align:left;font-weight:400}th{color:#9A9A8E;width:40%}'
            . 'button{width:100%;min-height:56px;border:0;border-radius:100px;background:#8DBF5B;color:#0C0F0A;font:700 17px system-ui,sans-serif;cursor:pointer}'
            . 'button.danger{background:#F08A7A}button.ghost{background:transparent;color:#F0EDE6;border:1px solid #2A3A1A;margin-top:14px}ul{list-style:none;padding:0;margin:0 0 16px}li{padding:6px 0}.ok{color:#8DBF5B}.bad{color:#F08A7A}'
            . '.muted{color:#9A9A8E;font-size:14px}a{color:#8DBF5B}'
            . '</style></head><body><div class="card"><p class="brand">' . esc_html($s['business_name']) . '</p><h1>' . esc_html($title) . '</h1>' . $body . '</div></body></html>';
        exit;
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
