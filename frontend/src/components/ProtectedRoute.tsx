
import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getCurrentUser } from "../services/api";
import type { AuthUser } from "../services/api";

export default function ProtectedRoute() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        async function checkAuthentication() {
            try {
                const response = await getCurrentUser();

                if (active && response.success && response.user) {
                    setUser(response.user);
                }
            } catch {
                if (active) setUser(null);
            } finally {
                if (active) setLoading(false);
            }
        }

        checkAuthentication();

        return () => {
            active = false;
        };
    }, []);

    if (loading) {
        return (
            <div className="auth-loading" role="status">
                Checking your session...
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet context={{ user }} />;
}
