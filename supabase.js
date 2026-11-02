
const SUPABASE_URL = "https://lkdxrcrzkawlhvqcavfk.supabase.co";

const SUPABASE_KEY = "sb_publishable_8XGhXYPi85qObxLjM2O62A_F4hXOUEr";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// Admin login
async function adminLogin(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.error("Login error:", error.message);
        return { success: false, message: error.message };
    }

    return { success: true, user: data.user };
}

// Admin logout
async function adminLogout() {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error("Logout error:", error.message);
        return false;
    }

    return true;
}

// Check current session
async function getAdminSession() {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
        console.error("Session error:", error.message);
        return null;
    }

    return data.session;
}
