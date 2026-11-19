(function () {
    'use strict';

    var cfg = window.RENTBIKE || {};
    var DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    function $(id) {
        return document.getElementById(id);
    }

    /* ---------- Open / closed badge (shop time, not visitor time) ---------- */

    function shopNow() {
        try {
            var parts = new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Europe/Copenhagen', weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: false
            }).formatToParts(new Date());
            var out = {};
            parts.forEach(function (p) { out[p.type] = p.value; });
            return { day: out.weekday.toLowerCase(), time: out.hour + ':' + out.minute };
        } catch (e) {
            return null;
        }
    }

    function showOpenBadge() {
        var badge = $('rb-open');
        var now = shopNow();
        if (!badge || !now || !cfg.hours || !cfg.hours[now.day]) return;

        var today = cfg.hours[now.day];
        var open = !today.closed && now.time >= today.open && now.time < today.close;
        var text;
        if (open) {
            text = 'Open now until ' + today.close;
        } else if (!today.closed && now.time < today.open) {
            text = 'Closed now, opens today at ' + today.open;
        } else {
            text = 'Closed now';
            var start = DAYS.indexOf(now.day);
            for (var i = 1; i <= 7; i++) {
                var name = DAYS[(start + i) % 7];
                var next = cfg.hours[name];
                if (next && !next.closed) {
                    text += ', opens ' + (i === 1 ? 'tomorrow' : name.charAt(0).toUpperCase() + name.slice(1)) + ' at ' + next.open;
                    break;
                }
            }
        }
        $('rb-open-text').textContent = text;
        badge.classList.toggle('is-closed', !open);
        badge.hidden = false;

        var row = document.querySelector('[data-rb-day="' + now.day + '"]');
        if (row) row.classList.add('is-today');
    }

    showOpenBadge();

    /* ---------- Photo carousel ---------- */

    (function () {
        var slider = $('rb-slider');
        if (!slider) return;
        var slides = slider.querySelectorAll('.rb-slide');
        var total = slides.length;
        if (total < 2) return;

        var dotsBox = $('rb-slider-dots');
        var counter = $('rb-slider-count');
        var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var active = 0;
        var timer = null;
        var paused = false; // pointer or keyboard focus is on the carousel
        var dots = [];

        function pad(n) { return n < 10 ? '0' + n : String(n); }

        function render() {
            for (var i = 0; i < total; i++) {
                // Shortest way round from the active photo: -2 .. 2 are visible, the rest hidden.
                var d = ((i - active) % total + total) % total;
                if (d > total / 2) d -= total;
                if (Math.abs(d) <= 2) slides[i].setAttribute('data-pos', d);
                else slides[i].removeAttribute('data-pos');
                slides[i].setAttribute('aria-hidden', d === 0 ? 'false' : 'true');
                if (dots[i]) dots[i].classList.toggle('is-active', i === active);
            }
            if (counter) counter.textContent = pad(active + 1) + ' / ' + pad(total);
        }

        function go(index) {
            active = ((index % total) + total) % total;
            render();
        }

        function stop() { clearInterval(timer); timer = null; }
        function start() {
            if (reduced || timer || paused) return;
            timer = setInterval(function () { go(active + 1); }, 4500);
        }
        function restart() { stop(); start(); }

        if (dotsBox) {
            for (var i = 0; i < total; i++) {
                var dot = document.createElement('button');
                dot.type = 'button';
                dot.setAttribute('aria-label', 'Show photo ' + (i + 1));
                dot.addEventListener('click', (function (index) {
                    return function () { go(index); restart(); };
                })(i));
                dotsBox.appendChild(dot);
                dots.push(dot);
            }
        }

        var buttons = document.querySelectorAll('[data-rb-slide]');
        for (var b = 0; b < buttons.length; b++) {
            buttons[b].addEventListener('click', function () {
                go(active + parseInt(this.getAttribute('data-rb-slide'), 10));
                restart();
            });
        }

        // Swipe / drag, and click on a side photo to bring it to the front.
        var startX = null;
        var dragged = false;
        slider.addEventListener('pointerdown', function (e) { startX = e.clientX; dragged = false; });
        slider.addEventListener('pointerup', function (e) {
            if (startX === null) return;
            var dx = e.clientX - startX;
            startX = null;
            if (Math.abs(dx) > 40) {
                dragged = true;
                go(active + (dx < 0 ? 1 : -1));
                restart();
            }
        });
        slider.addEventListener('pointercancel', function () { startX = null; });
        slider.addEventListener('click', function (e) {
            if (dragged) { dragged = false; return; }
            var slide = e.target.closest ? e.target.closest('.rb-slide') : null;
            var pos = slide ? parseInt(slide.getAttribute('data-pos'), 10) : 0;
            if (pos) { go(active + pos); restart(); }
        });

        var section = slider.parentNode;
        function pause() { paused = true; stop(); }
        function resume() { paused = false; start(); }
        section.addEventListener('mouseenter', pause);
        section.addEventListener('mouseleave', resume);
        section.addEventListener('focusin', pause);
        section.addEventListener('focusout', resume);
        document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });

        slider.classList.add('is-ready');
        render();
        start();
    })();

    /* ---------- Booking form ---------- */

    var form = $('rb-form');
    if (!form) return;

    var summary = document.querySelector('.rb-summary');
    var done = $('rb-done');
    var errorBox = $('rb-error');
    var submit = $('rb-submit');
    var qty = form.elements.quantity;
    var start = form.elements.start_date;
    var end = form.elements.end_date;
    var available = {}; // bike name -> bikes left for the chosen dates (null = no limit)
    var lastPayload = null;

    function bikeName() {
        var field = form.elements.bike_type;
        return field ? String(field.value || '').trim() : '';
    }

    function bikeInfo(name) {
        return (cfg.bikes || []).filter(function (b) { return b.name === name; })[0];
    }

    function days() {
        if (!start.value || !end.value) return 0;
        var diff = Math.round((Date.parse(end.value) - Date.parse(start.value)) / 86400000);
        return diff >= 0 ? diff + 1 : 0;
    }

    function money(amount) {
        var text = amount % 1 === 0 ? String(amount) : amount.toFixed(2);
        var cur = cfg.currency || '';
        return /^[^\w\s]+$/.test(cur) ? cur + text : text + ' ' + cur;
    }

    function clampQty() {
        var n = parseInt(qty.value, 10);
        if (!n || n < 1) n = 1;
        if (n > 50) n = 50;
        qty.value = n;
        return n;
    }

    function update() {
        var name = bikeName();
        var bike = bikeInfo(name);
        var n = clampQty();
        var d = days();
        var price = bike ? parseFloat(bike.price) : NaN;

        $('rb-sum-bike').textContent = name || '—';
        $('rb-sum-qty').textContent = n;
        $('rb-sum-days').textContent = d ? d + (d === 1 ? ' day' : ' days') : '—';
        $('rb-sum-total').textContent = d && !isNaN(price) ? money(price * n * d) : '—';
    }

    function showAvailability() {
        var nodes = form.querySelectorAll('[data-rb-left]');
        for (var i = 0; i < nodes.length; i++) {
            var left = available[nodes[i].getAttribute('data-rb-left')];
            var known = typeof left === 'number';
            nodes[i].textContent = !known ? '' : left > 0 ? left + ' available for your dates' : 'Fully booked for your dates';
            nodes[i].classList.toggle('is-out', known && left === 0);
        }
    }

    var availabilityTimer;
    function loadAvailability() {
        clearTimeout(availabilityTimer);
        if (!days()) return;
        var requested = start.value + '|' + end.value;
        availabilityTimer = setTimeout(function () {
            fetch(cfg.api + '/availability?start_date=' + start.value + '&end_date=' + end.value)
                .then(function (r) { return r.ok ? r.json() : []; })
                .then(function (list) {
                    if (requested !== start.value + '|' + end.value) return; // dates changed meanwhile
                    available = {};
                    list.forEach(function (item) { available[item.name] = item.available; });
                    showAvailability();
                })
                .catch(function () { /* the server checks again on submit */ });
        }, 250);
    }

    function showError(message) {
        errorBox.textContent = message;
        errorBox.hidden = false;
        errorBox.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }

    function validate(payload) {
        if (!payload.bike_type) return 'Please choose a bike.';
        if (!payload.start_date || !payload.end_date) return 'Please choose your pick-up and return day.';
        if (payload.end_date < payload.start_date) return 'The return day cannot be before the pick-up day.';
        if (!payload.name) return 'Please add your full name.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) return 'Please add a valid email address so we can confirm your booking.';
        var left = available[payload.bike_type];
        if (typeof left === 'number' && payload.quantity > left) {
            return left > 0
                ? 'Only ' + left + ' × ' + payload.bike_type + ' left for these dates.'
                : payload.bike_type + ' is fully booked for these dates. Try other dates or message us on WhatsApp.';
        }
        return '';
    }

    function whatsappText(p, ref) {
        return [
            'Hello, I sent booking request #' + ref + ' on your website.',
            '',
            'Name: ' + p.name,
            'Bike: ' + p.quantity + ' x ' + p.bike_type,
            'From: ' + p.start_date,
            'To: ' + p.end_date,
            'Notes: ' + (p.notes || '-')
        ].join('\n');
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        errorBox.hidden = true;

        var payload = {
            name: form.elements.name.value.trim(),
            email: form.elements.email.value.trim(),
            phone: form.elements.phone.value.trim(),
            bike_type: bikeName(),
            quantity: clampQty(),
            start_date: start.value,
            end_date: end.value,
            notes: form.elements.notes.value.trim(),
            website: form.elements.website.value,
            source: 'website'
        };

        var problem = validate(payload);
        if (problem) {
            showError(problem);
            return;
        }

        submit.disabled = true;
        submit.textContent = 'Sending…';

        fetch(cfg.api + '/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(function (response) {
                return response.json().catch(function () { return {}; }).then(function (body) {
                    if (!response.ok || !body.success) {
                        throw new Error(body.message || 'Something went wrong. Please try again or message us on WhatsApp.');
                    }
                    return body;
                });
            })
            .then(function (body) {
                lastPayload = payload;
                $('rb-done-ref').textContent = '#' + body.booking_id;
                $('rb-done-wa').href = 'https://wa.me/' + cfg.whatsapp + '?text=' + encodeURIComponent(whatsappText(payload, body.booking_id));
                form.hidden = true;
                summary.hidden = true;
                done.hidden = false;
                done.focus();
                done.scrollIntoView({ block: 'center', behavior: 'smooth' });
            })
            .catch(function (error) {
                var offline = error instanceof TypeError;
                showError(offline ? 'Could not reach the server. Check your connection and try again.' : error.message);
                loadAvailability();
            })
            .then(function () {
                submit.disabled = false;
                submit.textContent = 'Send booking request';
            });
    });

    $('rb-again').addEventListener('click', function () {
        done.hidden = true;
        form.hidden = false;
        summary.hidden = false;
        form.elements.notes.value = '';
        loadAvailability();
        form.scrollIntoView({ behavior: 'smooth' });
    });

    form.addEventListener('input', update);
    form.addEventListener('change', update);

    start.addEventListener('change', function () {
        end.min = start.value || start.min;
        if (end.value && start.value && end.value < start.value) end.value = start.value;
        update();
        loadAvailability();
    });
    end.addEventListener('change', loadAvailability);

    var steps = form.querySelectorAll('[data-rb-step]');
    for (var i = 0; i < steps.length; i++) {
        steps[i].addEventListener('click', function () {
            qty.value = (parseInt(qty.value, 10) || 1) + parseInt(this.getAttribute('data-rb-step'), 10);
            update();
        });
    }

    // "Book this bike" buttons on the bike cards preselect the bike in the form.
    var picks = document.querySelectorAll('[data-rb-pick]');
    for (var j = 0; j < picks.length; j++) {
        picks[j].addEventListener('click', function () {
            var name = this.getAttribute('data-rb-pick');
            var radios = form.querySelectorAll('input[name="bike_type"]');
            for (var k = 0; k < radios.length; k++) {
                if (radios[k].value === name) radios[k].checked = true;
            }
            update();
        });
    }

    update();
    loadAvailability();
})();
