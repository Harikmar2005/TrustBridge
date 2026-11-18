
const API_BASE_URL = "http://localhost:5000/api";

export interface AuthUser {
    id: string;
    fullName: string;
    email: string;
    role: "buyer" | "seller";
    createdAt: string;
}

interface ApiResponse<T> {
    success: boolean;
    message?: string;
    user?: T;
    errors?: {
        field: string;
        message: string;
    }[];
}

async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    const headers = new Headers(options.headers);

    if (options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        credentials: "include",
        headers,
    });

    let data: ApiResponse<T>;

    try {
        data = await response.json();
    } catch {
        throw new Error("The server returned an invalid response.");
    }

    if (!response.ok) {
        throw new Error(data.message || `Request failed (${response.status})`);
    }

    return data;
}

// Register a new buyer or seller
export function registerUser(details: {
    fullName: string;
    email: string;
    password: string;
    role: "buyer" | "seller";
}) {
    return apiRequest<AuthUser>("/auth/register", {
        method: "POST",
        body: JSON.stringify(details),
    });
}

// Login existing user
export function loginUser(details: {
    email: string;
    password: string;
}) {
    return apiRequest<AuthUser>("/auth/login", {
        method: "POST",
        body: JSON.stringify(details),
    });
}

// Get currently authenticated user
export function getCurrentUser() {
    return apiRequest<AuthUser>("/auth/me");
}

// Logout user
export function logoutUser() {
    return apiRequest<never>("/auth/logout", {
        method: "POST",
    });
}
