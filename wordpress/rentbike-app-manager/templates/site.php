<?php
/**
 * The redesigned website. Shown on the homepage (and the privacy page) when
 * "New website design" is switched on in RentBike App > Settings.
 */

if (!defined('ABSPATH')) {
    exit;
}

$rb = $GLOBALS['rentbike_app_manager'];
$view = $rb->site_view();
$s = $rb->get_settings();
$bikes = $rb->get_bikes(true);
$faq = $rb->get_faq();
$home = home_url('/');
$link = function ($anchor) use ($view, $home) {
    return ($view === 'home' ? '' : $home) . '#' . $anchor;
};

$wa_url = 'https://wa.me/' . $s['whatsapp'];
$tel_url = 'tel:' . preg_replace('/[^\d+]/', '', $s['phone']);
$map_url = 'https://www.google.com/maps/search/?api=1&query=' . rawurlencode($s['business_name'] . ', ' . $s['address']);

$prices = [];
$bike_count = 0;
foreach ($bikes as $bike) {
    if (is_numeric($bike['price_per_day'])) {
        $prices[] = (float) $bike['price_per_day'];
    }
    $bike_count += (int) $bike['quantity'];
}
$from_price = $prices ? $rb->format_price(min($prices)) : '';

$day_codes = ['monday' => 'Mo', 'tuesday' => 'Tu', 'wednesday' => 'We', 'thursday' => 'Th', 'friday' => 'Fr', 'saturday' => 'Sa', 'sunday' => 'Su'];
$schema_hours = [];
foreach ($s['opening_hours'] as $day => $hours) {
    if (!$hours['closed']) {
        $schema_hours[] = $day_codes[$day] . ' ' . $hours['open'] . '-' . $hours['close'];
    }
}
$schema = [
    '@context' => 'https://schema.org',
    '@type' => 'BicycleStore',
    'name' => $s['business_name'],
    'description' => $s['hero_subtitle'],
    'url' => $home,
    'telephone' => $s['phone'],
    'email' => $s['email'],
    'address' => ['@type' => 'PostalAddress', 'streetAddress' => $s['address'], 'addressLocality' => 'København', 'addressCountry' => 'DK'],
    'openingHours' => $schema_hours,
];
if ($s['gallery']) {
    $schema['image'] = $s['gallery'][0];
}
$today = current_time('Y-m-d');
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo('charset'); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0C0F0A">
<?php wp_head(); ?>
<?php if ($view === 'home') : ?>
<script type="application/ld+json"><?php echo wp_json_encode($schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); ?></script>
<?php endif; ?>
</head>
<body class="rb-body">
<div class="rb-site">

<header class="rb-header">
    <div class="rb-wrap rb-header-in">
        <a class="rb-brand" href="<?php echo esc_url($home); ?>">
            <span class="rb-brand-mark" aria-hidden="true"></span><?php echo esc_html($s['business_name']); ?>
        </a>
        <nav class="rb-nav" aria-label="Main">
            <a href="<?php echo esc_url($link('bikes')); ?>">Bikes</a>
            <?php if ($s['reviews_shortcode'] || $s['reviews_url']) : ?><a href="<?php echo esc_url($link('reviews')); ?>">Reviews</a><?php endif; ?>
            <a href="<?php echo esc_url($link('faq')); ?>">FAQ</a>
            <a href="<?php echo esc_url($link('about')); ?>">About</a>
            <a href="<?php echo esc_url($link('contact')); ?>">Contact</a>
        </nav>
        <a class="rb-btn rb-btn-primary rb-btn-sm" href="<?php echo esc_url($link('book')); ?>">Book now</a>
    </div>
</header>

<?php if ($view === 'privacy') :
    $page = is_page() ? get_queried_object() : null;
    $policy = $page ? wpautop($page->post_content) : $rb->default_privacy_text();
    list($intro, $sections) = $rb->privacy_sections($policy);
    $updated = $page ? get_the_modified_date('j F Y', $page) : ''; ?>
<main>
    <section class="rb-hero rb-page-hero">
        <div class="rb-wrap">
            <p class="rb-eyebrow">Your data, <?php echo esc_html($s['business_name']); ?></p>
            <h1><?php echo esc_html($page ? get_the_title($page) : 'Privacy Policy'); ?></h1>
            <?php if ($intro) : ?>
                <div class="rb-lead"><?php echo wp_kses_post($intro); ?></div>
            <?php endif; ?>
            <?php if (!$page) : ?>
                <ul class="rb-chips">
                    <li><span class="rb-dot"></span>No account needed</li>
                    <li><span class="rb-dot"></span>Only used for your booking</li>
                    <li><span class="rb-dot"></span>Never sold</li>
                    <li><span class="rb-dot"></span>Deleted on request</li>
                </ul>
            <?php endif; ?>
            <?php if ($updated) : ?>
                <p class="rb-small rb-muted">Last updated <?php echo esc_html($updated); ?></p>
            <?php endif; ?>
        </div>
    </section>

    <?php if ($sections) : ?>
    <section class="rb-wrap rb-policy">
        <nav class="rb-toc" aria-label="On this page">
            <p class="rb-footer-head">On this page</p>
            <ol>
                <?php foreach ($sections as $i => $section) : ?>
                    <li><a href="#<?php echo esc_attr($section['id']); ?>"><span><?php echo esc_html(sprintf('%02d', $i + 1)); ?></span><?php echo esc_html($section['title']); ?></a></li>
                <?php endforeach; ?>
            </ol>
        </nav>
        <div class="rb-policy-sections">
            <?php foreach ($sections as $i => $section) : ?>
                <article class="rb-card rb-policy-card" id="<?php echo esc_attr($section['id']); ?>">
                    <p class="rb-policy-num"><?php echo esc_html(sprintf('%02d', $i + 1)); ?></p>
                    <h2><?php echo esc_html($section['title']); ?></h2>
                    <div class="rb-policy-body"><?php echo wp_kses_post($section['body']); ?></div>
                </article>
            <?php endforeach; ?>
            <div class="rb-card rb-policy-help">
                <div>
                    <h2>Questions about your data?</h2>
                    <p>Write to us and we answer within a few days.</p>
                </div>
                <a class="rb-btn rb-btn-primary" href="mailto:<?php echo esc_attr($s['email']); ?>"><?php echo esc_html($s['email']); ?></a>
            </div>
        </div>
    </section>
    <?php endif; ?>
</main>
<?php else : ?>
<main>

    <section class="rb-hero">
        <div class="rb-wrap rb-hero-in">
            <div class="rb-hero-text">
                <p class="rb-eyebrow"><?php echo esc_html($s['tagline']); ?></p>
                <h1><?php echo esc_html($s['hero_title']); ?></h1>
                <p class="rb-lead"><?php echo esc_html($s['hero_subtitle']); ?></p>
                <div class="rb-actions">
                    <a class="rb-btn rb-btn-primary" href="#book">Book a bike</a>
                    <a class="rb-btn rb-btn-ghost" href="<?php echo esc_url($wa_url); ?>" target="_blank" rel="noopener">WhatsApp us</a>
                </div>
                <p class="rb-open" id="rb-open" hidden><span class="rb-dot"></span><span id="rb-open-text"></span></p>
                <dl class="rb-metrics">
                    <?php if ($from_price) : ?>
                        <div><dt>From / day</dt><dd class="rb-accent"><?php echo esc_html($from_price); ?></dd></div>
                    <?php endif; ?>
                    <?php if ($bike_count) : ?>
                        <div><dt>Bikes</dt><dd><?php echo esc_html($bike_count); ?></dd></div>
                    <?php endif; ?>
                    <div><dt>Bike types</dt><dd><?php echo esc_html(count($bikes)); ?></dd></div>
                </dl>
            </div>
            <div class="rb-hero-art" aria-hidden="true">
                <span class="rb-ring rb-ring-1"></span>
                <span class="rb-ring rb-ring-2"></span>
                <span class="rb-ring rb-ring-3"></span>
                <svg class="rb-bike-art" viewBox="0 0 640 400" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <path class="rb-art-ground" d="M20 384h600"/>
                    <g class="rb-art-wheel">
                        <g class="rb-art-spokes"><path d="M150 164v212M44 270h212M75 195l150 150M75 345l150-150"/></g>
                        <circle cx="150" cy="270" r="108"/>
                    </g>
                    <g class="rb-art-wheel">
                        <g class="rb-art-spokes"><path d="M490 164v212M384 270h212M415 195l150 150M415 345l150-150"/></g>
                        <circle cx="490" cy="270" r="108"/>
                    </g>
                    <g class="rb-art-frame">
                        <path d="M150 270h140L252 138 150 270"/>
                        <path d="M252 138l181-10M290 270l157-108"/>
                        <path d="M424 104l66 166"/>
                        <path d="M246 116l6 22"/>
                        <path d="M424 104l-6-14h34c14 0 20 8 18 18"/>
                    </g>
                    <path class="rb-art-saddle" d="M216 112h56"/>
                    <circle class="rb-art-crank" cx="290" cy="270" r="20"/>
                    <path class="rb-art-frame" d="M290 270l26 30M304 300h24"/>
                    <circle class="rb-art-hub" cx="150" cy="270" r="7"/>
                    <circle class="rb-art-hub" cx="490" cy="270" r="7"/>
                </svg>
                <?php if ($prices) : ?>
                    <div class="rb-float rb-float-prices">
                        <p class="rb-float-label">Price per day</p>
                        <?php foreach (array_slice($bikes, 0, 4) as $bike) :
                            $price = $rb->format_price($bike['price_per_day']);
                            if (!$price) {
                                continue;
                            } ?>
                            <p class="rb-float-row"><span><?php echo esc_html($bike['name']); ?></span><strong><?php echo esc_html($price); ?></strong></p>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
                <div class="rb-float rb-float-place">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.500C5 14.900 12 21 12 21z"/><circle cx="12" cy="9.500" r="2.500"/></svg>
                    <span><?php echo esc_html($s['address']); ?></span>
                </div>
            </div>
        </div>
    </section>

    <?php if ($s['features']) : ?>
    <section class="rb-wrap">
        <ul class="rb-features">
            <?php foreach ($s['features'] as $feature) : ?>
                <li><span class="rb-dot"></span><?php echo esc_html($feature); ?></li>
            <?php endforeach; ?>
        </ul>
    </section>
    <?php endif; ?>

    <section class="rb-section rb-wrap" id="bikes">
        <p class="rb-eyebrow">Our bikes</p>
        <h2>Pick your ride</h2>
        <?php if ($bikes) : ?>
            <div class="rb-bikes">
                <?php foreach ($bikes as $bike) :
                    $price = $rb->format_price($bike['price_per_day']); ?>
                    <article class="rb-bike">
                        <?php if ($bike['image']) : ?>
                            <img src="<?php echo esc_url($bike['image']); ?>" alt="<?php echo esc_attr($bike['name']); ?>" loading="lazy" width="480" height="320">
                        <?php endif; ?>
                        <div class="rb-bike-body">
                            <div class="rb-bike-head">
                                <h3><?php echo esc_html($bike['name']); ?></h3>
                                <?php if ($price) : ?>
                                    <p class="rb-price"><?php echo esc_html($price); ?><small> / day</small></p>
                                <?php endif; ?>
                            </div>
                            <p><?php echo esc_html($bike['description']); ?></p>
                            <a class="rb-btn rb-btn-ghost rb-btn-sm" href="#book" data-rb-pick="<?php echo esc_attr($bike['name']); ?>">Book this bike</a>
                        </div>
                    </article>
                <?php endforeach; ?>
            </div>
        <?php else : ?>
            <p class="rb-muted">Message us on WhatsApp for current bikes and prices.</p>
        <?php endif; ?>
    </section>

    <section class="rb-section rb-wrap" id="book">
        <p class="rb-eyebrow">Online booking</p>
        <h2>Reserve your ride</h2>
        <p class="rb-muted rb-section-lead">Send a request in under a minute. We confirm by email or phone.</p>

        <div class="rb-book">
            <form class="rb-form" id="rb-form" novalidate>
                <div class="rb-form-cols">
                <div class="rb-form-col">
                <fieldset>
                    <legend>1. Bike</legend>
                    <?php if ($bikes) : ?>
                        <div class="rb-options">
                            <?php foreach ($bikes as $i => $bike) :
                                $price = $rb->format_price($bike['price_per_day']); ?>
                                <label class="rb-option">
                                    <input type="radio" name="bike_type" value="<?php echo esc_attr($bike['name']); ?>" <?php checked($i, 0); ?>>
                                    <span class="rb-option-box">
                                        <strong><?php echo esc_html($bike['name']); ?></strong>
                                        <?php if ($price) : ?><span class="rb-accent"><?php echo esc_html($price); ?> / day</span><?php endif; ?>
                                        <span class="rb-left" data-rb-left="<?php echo esc_attr($bike['name']); ?>"></span>
                                    </span>
                                </label>
                            <?php endforeach; ?>
                        </div>
                    <?php else : ?>
                        <input type="text" name="bike_type" placeholder="Which bike would you like?" required>
                    <?php endif; ?>
                    <div class="rb-stepper-row">
                        <span>Number of bikes</span>
                        <div class="rb-stepper">
                            <button type="button" data-rb-step="-1" aria-label="Fewer bikes">−</button>
                            <input type="number" name="quantity" value="1" min="1" max="50" inputmode="numeric" aria-label="Number of bikes">
                            <button type="button" data-rb-step="1" aria-label="More bikes">+</button>
                        </div>
                    </div>
                </fieldset>

                <fieldset>
                    <legend>2. Dates</legend>
                    <div class="rb-row">
                        <label>Pick-up day
                            <input type="date" name="start_date" min="<?php echo esc_attr($today); ?>" value="<?php echo esc_attr($today); ?>" required>
                        </label>
                        <label>Return day
                            <input type="date" name="end_date" min="<?php echo esc_attr($today); ?>" value="<?php echo esc_attr($today); ?>" required>
                        </label>
                    </div>
                </fieldset>
                </div>

                <fieldset>
                    <legend>3. Your details</legend>
                    <label>Full name
                        <input type="text" name="name" autocomplete="name" required>
                    </label>
                    <div class="rb-row">
                        <label>Email
                            <input type="email" name="email" autocomplete="email" required>
                        </label>
                        <label>Phone <span class="rb-muted"><?php echo $s['sms_enabled'] ? '(for SMS confirmation)' : '(optional)'; ?></span>
                            <input type="tel" name="phone" autocomplete="tel">
                        </label>
                    </div>
                    <label>Notes <span class="rb-muted">(optional)</span>
                        <textarea name="notes" rows="3" placeholder="Pick-up time, child seat, cargo preference…"></textarea>
                    </label>
                    <label class="rb-hp" aria-hidden="true">Website
                        <input type="text" name="website" tabindex="-1" autocomplete="off">
                    </label>
                </fieldset>
                </div>

                <p class="rb-error" id="rb-error" role="alert" hidden></p>
                <button class="rb-btn rb-btn-primary rb-btn-block" type="submit" id="rb-submit">Send booking request</button>
                <p class="rb-small rb-muted">By sending you accept our <a href="<?php echo esc_url(home_url('/privacy-policy/')); ?>">privacy policy</a>. <?php echo $rb->payments_ready() ? 'After we confirm, you get a link to pay online with card or MobilePay.' : 'You pay in the shop at pick-up.'; ?></p>
            </form>

            <aside class="rb-summary" aria-live="polite">
                <p class="rb-eyebrow">Booking summary</p>
                <dl>
                    <div><dt>Bike</dt><dd id="rb-sum-bike">—</dd></div>
                    <div><dt>Quantity</dt><dd id="rb-sum-qty">1</dd></div>
                    <div><dt>Duration</dt><dd id="rb-sum-days">1 day</dd></div>
                </dl>
                <div class="rb-total"><span>Estimated total</span><strong id="rb-sum-total">—</strong></div>
                <p class="rb-small rb-muted">Need more than 10 bikes? <a href="<?php echo esc_url($wa_url); ?>" target="_blank" rel="noopener">Message us</a> for group pricing.</p>
            </aside>

            <div class="rb-done" id="rb-done" hidden tabindex="-1">
                <p class="rb-eyebrow">Request sent</p>
                <h3>Thank you, we got it.</h3>
                <p>Your booking request <strong id="rb-done-ref"></strong> has been received. We will contact you shortly to confirm<?php echo $rb->payments_ready() ? ' and send you a link to pay online' : ''; ?>. A copy is on its way to your email.</p>
                <div class="rb-actions">
                    <a class="rb-btn rb-btn-primary" id="rb-done-wa" href="<?php echo esc_url($wa_url); ?>" target="_blank" rel="noopener">Also send on WhatsApp</a>
                    <button class="rb-btn rb-btn-ghost" type="button" id="rb-again">Make another booking</button>
                </div>
            </div>
        </div>
    </section>

    <?php if ($s['gallery']) : ?>
    <section class="rb-section rb-slider-section" id="gallery" aria-roledescription="carousel" aria-label="Photos">
        <div class="rb-wrap rb-section-head">
            <div>
                <p class="rb-eyebrow">Gallery</p>
                <h2>Out on the road</h2>
            </div>
            <?php if (count($s['gallery']) > 1) : ?>
                <div class="rb-slider-nav">
                    <button type="button" class="rb-slider-btn" data-rb-slide="-1" aria-label="Previous photo">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>
                    </button>
                    <span class="rb-slider-count" id="rb-slider-count" aria-live="polite"></span>
                    <button type="button" class="rb-slider-btn" data-rb-slide="1" aria-label="Next photo">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>
                    </button>
                </div>
            <?php endif; ?>
        </div>
        <div class="rb-slider" id="rb-slider">
            <?php foreach ($s['gallery'] as $i => $image) : ?>
                <figure class="rb-slide">
                    <img src="<?php echo esc_url($image); ?>" alt="<?php echo esc_attr($s['business_name'] . ' photo ' . ($i + 1)); ?>" loading="lazy" width="480" height="600" draggable="false">
                </figure>
            <?php endforeach; ?>
        </div>
        <?php if (count($s['gallery']) > 1) : ?>
            <div class="rb-slider-dots" id="rb-slider-dots"></div>
        <?php endif; ?>
    </section>
    <?php endif; ?>

    <?php
    $reviews_html = $s['reviews_shortcode'] ? trim(do_shortcode($s['reviews_shortcode'])) : '';
    if ($reviews_html === $s['reviews_shortcode']) {
        $reviews_html = ''; // the reviews plugin is not active, do not print the raw shortcode
    }
    if ($reviews_html || $s['reviews_url']) : ?>
    <section class="rb-section rb-wrap" id="reviews">
        <div class="rb-section-head">
            <div>
                <p class="rb-eyebrow">Reviews</p>
                <h2>What riders say</h2>
            </div>
            <?php if ($s['reviews_url']) : ?>
                <a class="rb-btn rb-btn-ghost" href="<?php echo esc_url($s['reviews_url']); ?>" target="_blank" rel="noopener">Read all reviews on Google</a>
            <?php endif; ?>
        </div>
        <?php if ($reviews_html) : ?>
            <div class="rb-reviews"><?php echo $reviews_html; // phpcs:ignore WordPress.Security.EscapeOutput -- shortcode output ?></div>
        <?php endif; ?>
    </section>
    <?php endif; ?>

    <section class="rb-section rb-wrap rb-two" id="about">
        <div>
            <p class="rb-eyebrow">About us</p>
            <h2><?php echo esc_html($s['business_name']); ?></h2>
        </div>
        <div class="rb-about-text">
            <?php echo wp_kses_post(wpautop(esc_html($s['about_text']))); ?>
            <?php if ($s['play_url']) : ?>
                <p><a class="rb-btn rb-btn-ghost" href="<?php echo esc_url($s['play_url']); ?>" target="_blank" rel="noopener">Get the Android app</a></p>
            <?php endif; ?>
        </div>
    </section>

    <?php if ($faq) : ?>
    <section class="rb-section rb-wrap rb-two" id="faq">
        <div>
            <p class="rb-eyebrow">FAQ</p>
            <h2>Good to know</h2>
        </div>
        <div class="rb-faq">
            <?php foreach ($faq as $item) : ?>
                <details>
                    <summary><?php echo esc_html($item['question']); ?></summary>
                    <p><?php echo nl2br(esc_html($item['answer'])); ?></p>
                </details>
            <?php endforeach; ?>
        </div>
    </section>
    <?php else : ?>
        <span id="faq"></span>
    <?php endif; ?>

</main>
<?php endif; ?>

<footer class="rb-footer" id="contact">
    <div class="rb-wrap">
        <div class="rb-footer-cta">
            <div>
                <p class="rb-eyebrow">Find us</p>
                <p class="rb-footer-title">Ready to ride?</p>
            </div>
            <div class="rb-actions">
                <a class="rb-btn rb-btn-primary" href="<?php echo esc_url($link('book')); ?>">Book a bike</a>
                <a class="rb-btn rb-btn-ghost" href="<?php echo esc_url($wa_url); ?>" target="_blank" rel="noopener">WhatsApp us</a>
            </div>
        </div>

        <div class="rb-footer-cols">
            <div class="rb-footer-about">
                <a class="rb-brand" href="<?php echo esc_url($home); ?>">
                    <span class="rb-brand-mark" aria-hidden="true"></span><?php echo esc_html($s['business_name']); ?>
                </a>
                <p><?php echo esc_html($s['hero_subtitle']); ?></p>
                <p class="rb-footer-address">
                    <?php echo esc_html($s['address']); ?>
                    <?php if ($s['location_note']) : ?><br><span><?php echo esc_html($s['location_note']); ?></span><?php endif; ?>
                </p>
                <p><a class="rb-btn rb-btn-ghost rb-btn-sm" href="<?php echo esc_url($map_url); ?>" target="_blank" rel="noopener">Open in Google Maps</a></p>
            </div>
            <nav aria-label="Footer">
                <p class="rb-footer-head">Explore</p>
                <ul>
                    <li><a href="<?php echo esc_url($link('bikes')); ?>">Bikes</a></li>
                    <li><a href="<?php echo esc_url($link('book')); ?>">Book online</a></li>
                    <li><a href="<?php echo esc_url($link('faq')); ?>">FAQ</a></li>
                    <li><a href="<?php echo esc_url($link('about')); ?>">About us</a></li>
                    <li><a href="<?php echo esc_url($link('contact')); ?>">Contact</a></li>
                </ul>
            </nav>
            <div>
                <p class="rb-footer-head">Contact</p>
                <ul>
                    <li><a href="<?php echo esc_url($wa_url); ?>" target="_blank" rel="noopener">WhatsApp +<?php echo esc_html($s['whatsapp']); ?></a></li>
                    <li><a href="<?php echo esc_url($tel_url); ?>">Call <?php echo esc_html($s['phone']); ?></a></li>
                    <li><a href="mailto:<?php echo esc_attr($s['email']); ?>"><?php echo esc_html($s['email']); ?></a></li>
                </ul>
            </div>
            <div>
                <p class="rb-footer-head">Opening hours</p>
                <ul class="rb-footer-hours">
                    <?php foreach ($s['opening_hours'] as $day => $hours) : ?>
                        <li data-rb-day="<?php echo esc_attr($day); ?>"><span><?php echo esc_html(ucfirst($day)); ?></span><span><?php echo $hours['closed'] ? 'Closed' : esc_html($hours['open'] . ' – ' . $hours['close']); ?></span></li>
                    <?php endforeach; ?>
                </ul>
            </div>
        </div>

        <div class="rb-footer-bottom">
            <span>© <?php echo esc_html(current_time('Y') . ' ' . $s['business_name']); ?> · <a href="<?php echo esc_url(home_url('/privacy-policy/')); ?>">Privacy policy</a></span>
            <span>Designed &amp; developed by <strong>Shan-e-Haider Bukhari</strong></span>
        </div>
    </div>
</footer>

</div>
<?php wp_footer(); ?>
</body>
</html>
