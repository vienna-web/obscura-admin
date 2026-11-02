
// ==========================================
// OBSCURA ADMIN — CAMERA MANAGEMENT
// ==========================================

let cameras = [];
let selectedImageFiles = [];
let existingCameraImages = [];
let eventsInitialized = false;

const $ = (id) => document.getElementById(id);


// ==========================================
// IMAGE PREVIEWS
// ==========================================


function renderImagePreviews() {
    const preview = $("image-preview");

    if (!preview) {
        console.error("Image preview element not found.");
        return;
    }

    preview.replaceChildren();

    // Existing photos from Supabase
    existingCameraImages.forEach((photo, index) => {
        const item = document.createElement("div");
        item.className = "image-preview-item";

        const image = document.createElement("img");
        image.src = photo.image_url;
        image.alt = "Camera photo";

        image.onerror = () => {
            image.alt = "Image could not load";
            image.classList.add("image-error");
        };

        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "×";
        remove.className = "remove-image-button";
        remove.title = "Remove this photo";

        remove.addEventListener("click", () => {
            removeExistingCameraImage(photo.id);
        });

        item.append(image, remove);
        preview.appendChild(item);
    });

    // Newly selected photos
    selectedImageFiles.forEach((file, index) => {
        const item = document.createElement("div");
        item.className = "image-preview-item";

        const image = document.createElement("img");
        const imageUrl = URL.createObjectURL(file);

        image.src = imageUrl;
        image.alt = file.name;
        image.onload = () => URL.revokeObjectURL(imageUrl);
        image.onerror = () => URL.revokeObjectURL(imageUrl);

        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "×";
        remove.className = "remove-image-button";
        remove.title = "Remove selected photo";

        remove.addEventListener("click", () => {
            selectedImageFiles.splice(index, 1);
            renderImagePreviews();
        });

        item.append(image, remove);
        preview.appendChild(item);
    });
}

// ==========================================
// NOTIFICATIONS
// ==========================================

function notify(message, type = "success") {
    const notification = $("notification");

    if (!notification) {
        console.log(message);
        return;
    }

    notification.textContent = message;
    notification.className = `notification show ${type}`;

    setTimeout(() => {
        notification.className = "notification";
    }, 3000);
}


// ==========================================
// LOAD CAMERAS
// ==========================================

async function loadCameras() {
    const { data, error } = await supabaseClient
        .from("cameras")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Camera loading error:", error);
        notify("Could not load cameras.", "error");
        return;
    }

    cameras = data || [];

    updateDashboardStats();
    renderCameraTables();
}


// ==========================================
// DASHBOARD STATISTICS
// ==========================================

function updateDashboardStats() {
    if ($("total-cameras")) {
        $("total-cameras").textContent = cameras.length;
    }

    if ($("available-cameras")) {
        $("available-cameras").textContent =
            cameras.filter(c => c.status === "available").length;
    }

    if ($("reserved-cameras")) {
        $("reserved-cameras").textContent =
            cameras.filter(c => c.status === "reserved").length;
    }

    if ($("sold-cameras")) {
        $("sold-cameras").textContent =
            cameras.filter(c => c.status === "sold").length;
    }
}


// ==========================================
// CAMERA TABLES
// ==========================================

function createCameraRow(camera) {
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    const nameStrong = document.createElement("strong");

    nameStrong.textContent = camera.name || "Unnamed camera";
    nameCell.appendChild(nameStrong);

    const brandCell = document.createElement("td");
    brandCell.textContent = camera.brand || "-";

    const priceCell = document.createElement("td");
    priceCell.textContent =
        `${Number(camera.price).toLocaleString()} DH`;

    const statusCell = document.createElement("td");
    const statusBadge = document.createElement("span");

    statusBadge.className = `status-badge ${camera.status}`;
    statusBadge.textContent = camera.status;

    statusCell.appendChild(statusBadge);

    const actionsCell = document.createElement("td");

    const editButton = document.createElement("button");
    editButton.className = "table-action edit-action";
    editButton.textContent = "Edit";

    editButton.addEventListener("click", () => {
        openEditModal(camera.id);
    });

    const deleteButton = document.createElement("button");
    deleteButton.className = "table-action delete-action";
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener("click", () => {
        deleteCamera(camera.id);
    });

    actionsCell.append(editButton, deleteButton);

    row.append(
        nameCell,
        brandCell,
        priceCell,
        statusCell,
        actionsCell
    );

    return row;
}


function renderCameraTables() {
    const recentBody = $("camera-table-body");
    const inventoryBody = $("camera-inventory-body");

    if (!recentBody || !inventoryBody) return;

    recentBody.replaceChildren();
    inventoryBody.replaceChildren();

    const search = $("camera-search")?.value.toLowerCase() || "";
    const statusFilter = $("camera-status-filter")?.value || "all";

    const filtered = cameras.filter(camera => {
        const searchableText =
            `${camera.name} ${camera.brand} ${camera.model || ""}`
                .toLowerCase();

        const matchesSearch = searchableText.includes(search);

        const matchesStatus =
            statusFilter === "all" || camera.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // Recent five cameras
    cameras.slice(0, 5).forEach(camera => {
        recentBody.appendChild(createCameraRow(camera));
    });

    if (cameras.length === 0) {
        recentBody.innerHTML = `
            <tr>
                <td colspan="5">No cameras found. Add your first camera.</td>
            </tr>
        `;
    }

    // Inventory
    filtered.forEach(camera => {
        inventoryBody.appendChild(createCameraRow(camera));
    });

    if (filtered.length === 0) {
        inventoryBody.innerHTML = `
            <tr>
                <td colspan="5">No matching cameras found.</td>
            </tr>
        `;
    }

    if (window.lucide) lucide.createIcons();
}


// ==========================================
// CAMERA MODAL
// ==========================================

function resetImageSelection() {
    selectedImageFiles = [];
    existingCameraImages = [];

    const input = $("camera-images");
    if (input) input.value = "";

    const preview = $("image-preview");
    if (preview) preview.replaceChildren();
}


function openAddModal() {
    $("camera-form").reset();

    $("camera-id").value = "";
    $("modal-title").textContent = "Add new camera";
    $("save-camera-btn").textContent = "Save camera";

    resetImageSelection();

    $("camera-modal").classList.remove("hidden");
}


function closeModal() {
    $("camera-modal").classList.add("hidden");
    resetImageSelection();
}


// ==========================================
// LOAD EXISTING CAMERA PHOTOS
// ==========================================

async function loadCameraImages(cameraId) {
    const preview = $("image-preview");

    if (!preview) {
        console.error("Image preview element not found.");
        return;
    }

    existingCameraImages = [];
    renderImagePreviews();

    const { data, error } = await supabaseClient
        .from("camera_images")
        .select("*")
        .eq("camera_id", cameraId)
        .order("sort_order", { ascending: true });

    if (error) {
        console.error("Image loading error:", error);
        notify("Could not load camera photos.", "error");
        return;
    }

    existingCameraImages = data || [];
    renderImagePreviews();
}


// ==========================================
// EDIT CAMERA
// ==========================================

async function openEditModal(id) {
    const camera = cameras.find(c => c.id === id);

    if (!camera) return;

    $("camera-form").reset();
    resetImageSelection();

    $("camera-id").value = camera.id;
    $("camera-name").value = camera.name || "";
    $("camera-brand").value = camera.brand || "";
    $("camera-model").value = camera.model || "";
    $("camera-price").value = camera.price ?? "";
    $("camera-condition").value = camera.condition || "Used";
    $("camera-status").value = camera.status || "available";
    $("camera-description").value = camera.description || "";

    $("modal-title").textContent = "Edit camera";
    $("save-camera-btn").textContent = "Update camera";

    $("camera-modal").classList.remove("hidden");

    await loadCameraImages(id);
}


// ==========================================
// SAVE CAMERA
// ==========================================

async function saveCamera(event) {
    event.preventDefault();

    const id = $("camera-id").value;

    const cameraData = {
        name: $("camera-name").value.trim(),
        brand: $("camera-brand").value.trim(),
        model: $("camera-model").value.trim(),
        price: Number($("camera-price").value),
        condition: $("camera-condition").value,
        status: $("camera-status").value,
        description: $("camera-description").value.trim(),
        updated_at: new Date().toISOString()
    };

    if (
        !cameraData.name ||
        !cameraData.brand ||
        !Number.isFinite(cameraData.price) ||
        cameraData.price < 0
    ) {
        notify("Please check the camera details.", "error");
        return;
    }

    const saveButton = $("save-camera-btn");

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {
        let cameraId = id;

        // 1. Create or update camera
        if (id) {
            const { error } = await supabaseClient
                .from("cameras")
                .update(cameraData)
                .eq("id", id);

            if (error) throw error;

        } else {
            const { data, error } = await supabaseClient
                .from("cameras")
                .insert([cameraData])
                .select()
                .single();

            if (error) throw error;

            cameraId = data.id;
        }

        // 2. Upload selected photos
        for (const file of selectedImageFiles) {
            const extension =
                file.name.split(".").pop().toLowerCase();

            const filePath =
                `${cameraId}/${crypto.randomUUID()}.${extension}`;

            const { error: uploadError } = await supabaseClient
                .storage
                .from("camera-images")
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 3. Get public URL
            const { data: urlData } = supabaseClient
                .storage
                .from("camera-images")
                .getPublicUrl(filePath);

            // 4. Save photo URL in database
            const { error: imageError } = await supabaseClient
                .from("camera_images")
                .insert([{
                    camera_id: cameraId,
                    image_url: urlData.publicUrl
                }]);

            if (imageError) throw imageError;
        }

        // 5. Cleanup
        resetImageSelection();

        closeModal();

        await loadCameras();

        notify("Camera and photos saved successfully.");

    } catch (error) {
        console.error("Camera save/upload error:", error);

        notify(
            error.message || "Could not save camera or photos.",
            "error"
        );

    } finally {
        saveButton.disabled = false;
        saveButton.textContent = id ? "Update camera" : "Save camera";
    }
}


// ==========================================
// CUSTOM DELETE CONFIRMATION
// ==========================================

function showDeleteConfirmation(cameraName) {
    return new Promise(resolve => {
        const modal = $("delete-confirm-modal");
        const message = $("delete-confirm-message");
        const confirmButton = $("confirm-delete");
        const cancelButton = $("cancel-delete");

        if (!modal || !confirmButton || !cancelButton) {
            resolve(false);
            return;
        }

        message.textContent =
            `Are you sure you want to delete "${cameraName}"?`;

        modal.classList.remove("hidden");

        function cleanup(result) {
            modal.classList.add("hidden");

            confirmButton.removeEventListener("click", confirm);
            cancelButton.removeEventListener("click", cancel);

            resolve(result);
        }

        function confirm() {
            cleanup(true);
        }

        function cancel() {
            cleanup(false);
        }

        confirmButton.addEventListener("click", confirm);
        cancelButton.addEventListener("click", cancel);
    });
}

// ==========================================
// DELETE CAMERA
// ==========================================
async function deleteCamera(id) {
    const camera = cameras.find(c => c.id === id);

    if (!camera) return;

    const confirmed = await showDeleteConfirmation(camera.name);

    if (!confirmed) return;

    const { error } = await supabaseClient
        .from("cameras")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Delete error:", error);
        notify("Could not delete camera.", "error");
        return;
    }

    await loadCameras();

    notify("Camera deleted successfully.");
}
// ==========================================
// SIDEBAR NAVIGATION
// ==========================================

function setupNavigation() {
    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", event => {
            event.preventDefault();

            const page = link.dataset.page;

            document.querySelectorAll(".nav-link").forEach(item => {
                item.classList.remove("active");
            });

            link.classList.add("active");

            document.querySelectorAll(".page-section").forEach(section => {
                section.classList.add("hidden");
            });

            const target = $(`${page}-page`);

            if (target) target.classList.remove("hidden");

            if ($("page-title")) {
                $("page-title").textContent =
                    page.charAt(0).toUpperCase() + page.slice(1);
            }

            if ($("breadcrumb")) {
                $("breadcrumb").textContent =
                    `Workspace / ${page.charAt(0).toUpperCase() + page.slice(1)}`;
            }
        });
    });
}


// ==========================================
// INITIALIZE EVENTS
// ==========================================

function setupEvents() {
    if (eventsInitialized) return;

    eventsInitialized = true;

    $("add-camera-btn")?.addEventListener("click", openAddModal);

    $("add-camera-btn-inventory")?.addEventListener("click", openAddModal);

    $("close-camera-modal")?.addEventListener("click", closeModal);

    $("cancel-camera-modal")?.addEventListener("click", closeModal);

    $("camera-form")?.addEventListener("submit", saveCamera);

    $("camera-search")?.addEventListener("input", renderCameraTables);

    $("camera-status-filter")?.addEventListener("change", renderCameraTables);

    $("camera-modal")?.addEventListener("click", event => {
        if (event.target === $("camera-modal")) {
            closeModal();
        }
    });

    $("logout-button")?.addEventListener("click", logoutAdmin);

    $("login-form")?.addEventListener("submit", handleLogin);

    setupNavigation();
    setupImageUpload();
}


// ==========================================
// ADMIN AUTHENTICATION
// ==========================================

async function verifyAdmin() {
    const { data, error } = await supabaseClient.rpc("is_obscura_admin");

    if (error || data !== true) {
        console.error("Admin verification failed:", error);

        await supabaseClient.auth.signOut();

        return false;
    }

    return true;
}


// ==========================================
// LOGIN SCREEN
// ==========================================

function showLogin() {
    $("login-screen")?.classList.remove("hidden");
    $("dashboard")?.classList.add("hidden");
}


// ==========================================
// SHOW DASHBOARD
// ==========================================

async function showDashboard() {
    $("login-screen")?.classList.add("hidden");
    $("dashboard")?.classList.remove("hidden");

    setupEvents();

    await loadCameras();

    if (window.lucide) lucide.createIcons();
}


// ==========================================
// LOGIN FORM
// ==========================================

async function handleLogin(event) {
    event.preventDefault();

    const email = $("login-email").value.trim();
    const password = $("login-password").value;

    const button = $("login-button");
    const errorMessage = $("login-error");

    button.disabled = true;
    button.textContent = "Signing in...";
    errorMessage.textContent = "";

    try {
        const { error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            throw new Error("Incorrect email or password.");
        }

        const isAdmin = await verifyAdmin();

        if (!isAdmin) {
            throw new Error(
                "This account is not an authorized administrator."
            );
        }

        $("login-form").reset();

        await showDashboard();

    } catch (error) {
        errorMessage.textContent = error.message;

    } finally {
        button.disabled = false;
        button.textContent = "Sign in";
    }
}


// ==========================================
// LOGOUT
// ==========================================

async function logoutAdmin() {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error("Logout error:", error);
        notify("Could not sign out.", "error");
        return;
    }

    cameras = [];
    resetImageSelection();

    showLogin();
}


// ==========================================
// START APPLICATION
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {
    showLogin();

    setupEvents();

    try {
        const { data, error } =
            await supabaseClient.auth.getSession();

        if (error) throw error;

        if (data.session) {
            const isAdmin = await verifyAdmin();

            if (isAdmin) {
                await showDashboard();
            }
        }

    } catch (error) {
        console.error("Application initialization error:", error);
        showLogin();
    }

    if (window.lucide) lucide.createIcons();
});


function setupImageUpload() {
    const input = document.getElementById("camera-images");

    if (!input) {
        console.error("camera-images input not found");
        return;
    }

    input.addEventListener("change", () => {
        selectedImageFiles = Array.from(input.files);
        renderImagePreviews();
    });
}


async function removeExistingCameraImage(imageId) {
    const confirmed = confirm("Remove this photo?");
    if (!confirmed) return;

    // Find the photo before deleting its database record
    const photo = existingCameraImages.find(item => item.id === imageId);
    if (!photo) return;

    // Extract the file path from its Supabase URL
    const marker = "/storage/v1/object/public/camera-images/";
    const markerIndex = photo.image_url.indexOf(marker);

    if (markerIndex === -1) {
        notify("Could not identify the image file.", "error");
        return;
    }

    const filePath = decodeURIComponent(
        photo.image_url.substring(markerIndex + marker.length)
    );

    console.log("Image URL:", photo.image_url);
console.log("Storage file path:", filePath);

    // Delete the database record
    const { error: databaseError } = await supabaseClient
        .from("camera_images")
        .delete()
        .eq("id", imageId);

    if (databaseError) {
        console.error(databaseError);
        notify("Could not remove photo.", "error");
        return;
    }

    // Delete the actual Storage file
    const { error: storageError } = await supabaseClient
        .storage
        .from("camera-images")
        .remove([filePath]);

    if (storageError) {
        console.error(storageError);
        notify("Photo removed from gallery, but storage cleanup failed.", "error");
    } else {
        notify("Photo removed successfully.");
    }

    existingCameraImages = existingCameraImages.filter(
        item => item.id !== imageId
    );

    renderImagePreviews();
}