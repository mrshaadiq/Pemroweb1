const menuToggle = document.querySelector('.menu-toggle');
const menu = document.querySelector('#main-menu');

if (menuToggle && menu) {
    menuToggle.hidden = false;
    const closeMenu = () => {
        menuToggle.setAttribute('aria-expanded', 'false');
        menu.classList.remove('is-open');
    };
    menuToggle.addEventListener('click', () => {
        const open = menuToggle.getAttribute('aria-expanded') !== 'true';
        menuToggle.setAttribute('aria-expanded', String(open));
        menu.classList.toggle('is-open', open);
    });
    menu.addEventListener('click', (event) => {
        if (event.target.closest('a')) closeMenu();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && menu.classList.contains('is-open')) {
            closeMenu();
            menuToggle.focus();
        }
    });
    window.matchMedia('(max-width: 900px)').addEventListener('change', closeMenu);
}

const form = document.querySelector('[data-form="order"], [data-form="contact"]');

if (form) {
    const prices = new Map([['Original', 15000], ['Cokelat', 17000], ['Keju', 17000]]);
    const rupiah = new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
    });
    const summary = document.querySelector('.order-summary');
    const flavor = form.elements.namedItem('rasa');
    const quantity = form.elements.namedItem('jumlah');
    const updateTotal = () => {
        const price = prices.get(flavor.value);
        const count = quantity.valueAsNumber;
        summary.textContent = price && Number.isSafeInteger(count) && count > 0
            ? `Perkiraan total (${count} bungkus): ${rupiah.format(price * count)}`
            : 'Pilih rasa dan jumlah untuk melihat perkiraan total.';
    };

    if (summary && flavor && quantity) {
        const selected = new URLSearchParams(window.location.search).get('rasa');
        if (prices.has(selected)) flavor.value = selected;
        summary.hidden = false;
        form.addEventListener('input', updateTotal);
        form.addEventListener('reset', () => setTimeout(updateTotal, 0));
        updateTotal();
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        const data = new FormData(form);
        const value = (name) => String(data.get(name) ?? '').trim();
        let message;
        if (form.dataset.form === 'order') {
            const price = prices.get(value('rasa'));
            const count = Number(value('jumlah'));
            if (!price || !Number.isSafeInteger(count) || count < 1) return;
            message = [
                'Halo PisangKita, saya ingin memesan:',
                `Nama: ${value('nama')}`,
                `WhatsApp: ${value('whatsapp')}`,
                `Rasa: ${value('rasa')}`,
                `Jumlah: ${count} bungkus`,
                `Perkiraan total: ${rupiah.format(price * count)} (belum termasuk ongkir)`,
                `Alamat: ${value('alamat')}`,
                `Catatan: ${value('catatan') || '-'}`,
            ];
        } else {
            const subject = form.elements.namedItem('subjek').selectedOptions[0].textContent.trim();
            message = [
                'Halo PisangKita, saya ingin menghubungi:',
                `Nama: ${value('nama')}`,
                `Email / WhatsApp: ${value('contact')}`,
                `Subjek: ${subject}`,
                `Pesan: ${value('pesan')}`,
            ];
        }
        const destination = new URL(form.action);
        destination.search = new URLSearchParams({ text: message.join('\n') }).toString();
        window.location.assign(destination.href);
    });
}

// Validasi lokal untuk halaman login dan daftar (hanya di browser, tanpa server).
const authForms = document.querySelectorAll('[data-form="login"], [data-form="register"]');
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERS_KEY = 'pisangkita-users';

// Akun disimpan di localStorage browser ini saja (bukan database).
const getUsers = () => {
    try {
        return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    } catch {
        return [];
    }
};
const saveUsers = (users) => {
    try {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } catch {
        // Penyimpanan tidak tersedia (mis. mode privat), akun tidak tersimpan.
    }
};

authForms.forEach((authForm) => {
    const status = authForm.querySelector('.login-status');
    const fields = Object.fromEntries(
        [...authForm.elements].filter((el) => el.name).map((el) => [el.name, el]),
    );
    const rules = {
        nama: (value) => {
            const name = value.trim();
            if (!name) return 'Nama wajib diisi.';
            return name.length >= 3 ? '' : 'Nama minimal 3 karakter.';
        },
        email: (value) => {
            const email = value.trim();
            if (!email) return 'Email wajib diisi.';
            return emailPattern.test(email) ? '' : 'Masukkan email yang valid.';
        },
        password: (value) => {
            if (!value) return 'Kata sandi wajib diisi.';
            return value.length >= 6 ? '' : 'Kata sandi minimal 6 karakter.';
        },
        konfirmasi: (value) => {
            if (!value) return 'Ulangi kata sandi wajib diisi.';
            return value === fields.password.value ? '' : 'Kata sandi tidak sama.';
        },
    };
    const validatedNames = [...authForm.querySelectorAll('[data-error-for]')].map((el) => el.dataset.errorFor);

    const showError = (name, message) => {
        const error = authForm.querySelector(`[data-error-for="${name}"]`);
        fields[name].setAttribute('aria-invalid', String(Boolean(message)));
        error.textContent = message;
        error.hidden = !message;
    };

    const showStatus = (message) => {
        status.textContent = message;
        status.hidden = !message;
    };

    // Mengembalikan field pertama yang tidak valid, atau null jika semua valid.
    const validate = () => {
        let firstInvalid = null;
        validatedNames.forEach((name) => {
            const message = rules[name](fields[name].value);
            showError(name, message);
            if (message && !firstInvalid) firstInvalid = fields[name];
        });
        return firstInvalid;
    };

    authForm.addEventListener('input', (event) => {
        const { name } = event.target;
        if (validatedNames.includes(name)) showError(name, '');
        showStatus('');
    });

    authForm.querySelectorAll('.password-toggle').forEach((toggle) => {
        toggle.addEventListener('click', () => {
            const input = toggle.closest('.password-field').querySelector('input');
            const show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            toggle.textContent = show ? 'Sembunyikan' : 'Tampilkan';
            toggle.setAttribute('aria-pressed', String(show));
        });
    });

    authForm.addEventListener('submit', (event) => {
        event.preventDefault();
        showStatus('');
        const invalid = validate();
        if (invalid) {
            invalid.focus();
            return;
        }
        const email = fields.email.value.trim().toLowerCase();
        const users = getUsers();

        if (authForm.dataset.form === 'register') {
            if (users.some((user) => user.email === email)) {
                showError('email', 'Email sudah terdaftar.');
                fields.email.focus();
                return;
            }
            users.push({ nama: fields.nama.value.trim(), email, password: fields.password.value });
            saveUsers(users);
            authForm.reset();
            showStatus('Pendaftaran berhasil. Silakan masuk.');
            return;
        }

        const user = users.find((item) => item.email === email);
        if (!user) {
            showError('email', 'Akun dengan email ini belum terdaftar.');
            fields.email.focus();
            return;
        }
        if (user.password !== fields.password.value) {
            showError('password', 'Kata sandi salah.');
            fields.password.focus();
            return;
        }
        window.location.assign('index.html');
    });
});
