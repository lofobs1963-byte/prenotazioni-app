function getToken() {
    return localStorage.getItem("accessToken");
}

function checkAuth() {
    const token = getToken();

    if (!token) {
        window.location.href = "/login.html";
    }
}

function logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    window.location.href = "/login.html";
}