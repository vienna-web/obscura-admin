
/* =========================================================
   OBSCURA.MA — SUPABASE INTEGRATION
   ========================================================= */

/* 01 — ELEMENTS */

const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
const cameraGrid = document.querySelector("#camera-grid");

const brandButtons = document.querySelectorAll(".filter-button");
const priceFilter = document.querySelector("#price-filter");
const aestheticFilter = document.querySelector("#aesthetic-filter");
const sortCameras = document.querySelector("#sort-cameras");
const loadMoreButton = document.querySelector(".load-more");

const instagramUsername = "obscura.digicams";

let cameras = [];
let currentBrand = "all";
let currentPrice = "all";
let currentAesthetic = "all";

/* 02 — MOBILE MENU */

if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
        navLinks.classList.toggle("mobile-open");

        menuToggle.textContent =
            navLinks.classList.contains("mobile-open") ? "✕" : "☰";
    });

    document.querySelectorAll(".nav-links a").forEach(link => {
        link.addEventListener("click", () => {
            navLinks.classList.remove("mobile-open");
            menuToggle.textContent = "☰";
        });
    });
}

/* 03 — SAFE HTML */

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

/* 04 — LOAD CAMERAS FROM SUPABASE */

async function loadCameras() {
    if (!cameraGrid) return;

    cameraGrid.innerHTML =
        '<p class="camera-loading">Loading cameras...</p>';

    const { data, error } = await supabaseClient
        .from("cameras")
        .select(`
            *,
            camera_images (
                id,
                image_url,
                sort_order
            )
        `);

    if (error) {
        console.error("Camera loading error:", error);
        cameraGrid.innerHTML =
            '<p class="camera-error">Unable to load cameras. Please try again later.</p>';
        return;
    }

    cameras = (data || [])
        .filter(camera => camera.status === "available")
        .map(camera => ({
            ...camera,
            camera_images: (camera.camera_images || [])
                .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        }));

    renderCameras();
    applyFilters();

    console.log("OBSCURA CAMERAS LOADED:", cameras);

    if (loadMoreButton) {
        loadMoreButton.hidden = true;
    }
}

/* 05 — CREATE CAMERA CARDS */

function renderCameras() {
    if (!cameraGrid) return;

    if (cameras.length === 0) {
        cameraGrid.innerHTML =
            '<p class="camera-empty">No cameras currently available.</p>';
        return;
    }

    cameraGrid.innerHTML = cameras.map(camera => {
        const images = camera.camera_images || [];
        const firstImage = images[0]?.image_url;

        const name = escapeHTML(camera.name);
        const brand = escapeHTML(camera.brand);
        const price = Number(camera.price) || 0;

        const aesthetics = Array.isArray(camera.aesthetic)
            ? camera.aesthetic.join(" ")
            : "";

        const description = escapeHTML(
            camera.description || camera.model || "Digital camera"
        );

        const mainImage = firstImage
            ? `<img class="gallery-main" src="${escapeHTML(firstImage)}" alt="${name}" loading="lazy">`
            : `<div class="image-placeholder">CAMERA IMAGE</div>`;

        const thumbnails = images.length > 1
            ? `
                <div class="gallery-thumbnails">
                    ${images.map((image, index) => `
                        <button
                            type="button"
                            class="gallery-thumb ${index === 0 ? "active" : ""}"
                            data-image="${escapeHTML(image.image_url)}"
                            aria-label="View photo ${index + 1}"
                        >
                            <img src="${escapeHTML(image.image_url)}" alt="" loading="lazy">
                        </button>
                    `).join("")}
                </div>
            `
            : "";

        return `
            <article
                class="camera-card"
                data-brand="${escapeHTML(String(camera.brand || "").toLowerCase())}"
                data-price="${price}"
                data-aesthetic="${escapeHTML(aesthetics.toLowerCase())}"
                data-camera-id="${escapeHTML(camera.id)}"
                data-created="${escapeHTML(camera.created_at || "")}"
                data-sort="${Number(camera.sort_order) || 0}"
            >
                <div class="camera-image">

                    <span class="camera-tag">
                        AVAILABLE
                    </span>

                    ${mainImage}
                    ${thumbnails}

                </div>

                <div class="camera-info">

                    <div class="camera-brand">
                        ${brand.toUpperCase()}
                    </div>

                    <h3>${name}</h3>

                    <p>${description}</p>

                    <div class="camera-bottom">

                        <strong>${price.toLocaleString("en-US")} DH</strong>

                        <button
                            class="dm-camera"
                            data-camera="${name}"
                            type="button"
                        >
                            DM TO ORDER ↗
                        </button>

                    </div>

                </div>
            </article>
        `;
    }).join("");

    initializeCardAnimations();
}

/* 06 — FILTERS */

brandButtons.forEach(button => {
    button.addEventListener("click", () => {
        brandButtons.forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");

        currentBrand = button.dataset.filter;
        applyFilters();
    });
});

if (priceFilter) {
    priceFilter.addEventListener("change", () => {
        currentPrice = priceFilter.value;
        applyFilters();
    });
}

if (aestheticFilter) {
    aestheticFilter.addEventListener("change", () => {
        currentAesthetic = aestheticFilter.value;
        applyFilters();
    });
}

function applyFilters() {
    document.querySelectorAll(".camera-card").forEach(card => {
        const brand = card.dataset.brand;
        const price = Number(card.dataset.price);

        const aesthetics = card.dataset.aesthetic
            .toLowerCase()
            .split(/\s+/);

        const brandMatch =
            currentBrand === "all" || brand === currentBrand;

        let priceMatch = true;

        if (currentPrice === "500") {
            priceMatch = price < 500;
        } else if (currentPrice === "750") {
            priceMatch = price >= 500 && price <= 750;
        } else if (currentPrice === "1000") {
            priceMatch = price > 750 && price <= 1000;
        } else if (currentPrice === "1500") {
            priceMatch = price > 1000 && price <= 1500;
        } else if (currentPrice === "1500plus") {
            priceMatch = price > 1500;
        }

        const aestheticMatch =
            currentAesthetic === "all" ||
            aesthetics.includes(currentAesthetic);

        card.style.display =
            brandMatch && priceMatch && aestheticMatch ? "" : "none";
    });
}

/* 07 — SORTING */

if (sortCameras) {
    sortCameras.addEventListener("change", () => {
        const sort = sortCameras.value;

        const sorted = [...cameras];

        if (sort === "low") {
            sorted.sort((a, b) => Number(a.price) - Number(b.price));
        } else if (sort === "high") {
            sorted.sort((a, b) => Number(b.price) - Number(a.price));
        } else if (sort === "newest") {
            sorted.sort((a, b) =>
                new Date(b.created_at || 0) - new Date(a.created_at || 0)
            );
        } else {
            sorted.sort((a, b) =>
                (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0)
            );
        }

        const previousCameras = cameras;
        cameras = sorted;
        renderCameras();
        applyFilters();
        cameras = previousCameras;
    });
}

/* 08 — INSTAGRAM DM SYSTEM */

function showMessageCopied(cameraName) {
    document.querySelector(".dm-notification")?.remove();

    const notification = document.createElement("div");
    notification.className = "dm-notification";

    const title = document.createElement("div");
    title.className = "dm-notification-title";
    title.textContent = "MESSAGE READY ✓";

    const message = document.createElement("div");
    message.className = "dm-notification-text";
    message.textContent = `Your message for ${cameraName} has been copied.`;

    const small = document.createElement("div");
    small.className = "dm-notification-small";
    small.textContent = "Paste it in the Obscura Instagram chat.";

    notification.append(title, message, small);
    document.body.appendChild(notification);

    requestAnimationFrame(() => notification.classList.add("show"));

    setTimeout(() => {
        notification.classList.remove("show");
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

/* 09 — CAMERA GRID INTERACTIONS */

if (cameraGrid) {
    cameraGrid.addEventListener("click", async event => {

        /* Gallery thumbnail */

        const thumbnail = event.target.closest(".gallery-thumb");

        if (thumbnail) {
            event.preventDefault();
            event.stopPropagation();

            const card = thumbnail.closest(".camera-card");
            const mainImage = card?.querySelector(".gallery-main");

            if (mainImage) {
                mainImage.src = thumbnail.dataset.image;

                card.querySelectorAll(".gallery-thumb")
                    .forEach(thumb => thumb.classList.remove("active"));

                thumbnail.classList.add("active");
            }

            return;
        }

        /* Instagram DM */

        const dmButton = event.target.closest(".dm-camera");

        if (dmButton) {
            event.preventDefault();
            event.stopPropagation();

            const cameraName = dmButton.dataset.camera;

            const message =
                `Hi Obscura! 👋 I'm interested in the ${cameraName}. Is it still available? 📸`;

            try {
                await navigator.clipboard.writeText(message);
            } catch (error) {
                console.warn("Clipboard access unavailable.", error);
            }

            window.open(
                `https://www.instagram.com/${instagramUsername}/`,
                "_blank",
                "noopener,noreferrer"
            );

            showMessageCopied(cameraName);
            return;
        }

        /* Product detail page */

        const card = event.target.closest(".camera-card");

        if (card?.dataset.cameraId) {
            window.location.href =
                `camera.html?id=${encodeURIComponent(card.dataset.cameraId)}`;
        }
    });

    cameraGrid.addEventListener("mouseenter", event => {
        const card = event.target.closest(".camera-card");
        if (card) card.style.zIndex = "2";
    }, true);

    cameraGrid.addEventListener("mouseleave", event => {
        const card = event.target.closest(".camera-card");
        if (card) card.style.zIndex = "1";
    }, true);
}

/* 10 — CARD ANIMATIONS */

function initializeCardAnimations() {
    const cards = cameraGrid.querySelectorAll(".camera-card");

    if (!("IntersectionObserver" in window)) {
        cards.forEach(card => card.classList.add("revealed"));
        return;
    }

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("revealed");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08 });

    cards.forEach(card => {
        card.classList.add("reveal");
        observer.observe(card);
    });
}

/* 11 — SECTION SCROLL REVEAL */

const revealElements = document.querySelectorAll(
    ".section, .archive-card, .feedback-card"
);

if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("revealed");
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08 });

    revealElements.forEach(element => {
        element.classList.add("reveal");
        revealObserver.observe(element);
    });
}

/* 12 — ACTIVE NAVIGATION */

const sections = document.querySelectorAll("main section[id]");
const navigationLinks = document.querySelectorAll(".nav-links a");

if ("IntersectionObserver" in window) {
    const navObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;

            navigationLinks.forEach(link =>
                link.classList.remove("current")
            );

            const activeLink = document.querySelector(
                `.nav-links a[href="#${entry.target.id}"]`
            );

            activeLink?.classList.add("current");
        });
    }, { threshold: 0.35 });

    sections.forEach(section => navObserver.observe(section));
}

/* 13 — INITIALIZE */

console.log("OBSCURA.MA — SYSTEM READY 📸");

loadCameras();
