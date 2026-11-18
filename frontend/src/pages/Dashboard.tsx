
import { useState } from "react";
import {
    ShieldCheck,
    LayoutDashboard,
    MessageSquare,
    AlertTriangle,
    Settings,
    LogOut,
    UserRound,
    Loader2
} from "lucide-react";

import {
    Link,
    useNavigate,
    useOutletContext
} from "react-router-dom";

import type { AuthUser } from "../services/api";
import { logoutUser } from "../services/api";

interface DashboardContext {
    user: AuthUser;
}

export default function Dashboard() {
    const { user } = useOutletContext<DashboardContext>();
    const navigate = useNavigate();

    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [error, setError] = useState("");

    async function handleLogout() {
        try {
            setIsLoggingOut(true);
            setError("");

            await logoutUser();

            navigate("/login", { replace: true });
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to sign out. Please try again."
            );
        } finally {
            setIsLoggingOut(false);
        }
    }

    const initials = user.fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");

    return (
        <div className="dashboard">

            {/* Sidebar */}
            <aside className="sidebar">

                <h2>
                    <ShieldCheck />
                    TrustBridge
                </h2>

                <nav>
                    <Link to="/dashboard" className="active">
                        <LayoutDashboard />
                        Overview
                    </Link>

                    <a href="#messages">
                        <MessageSquare />
                        Messages
                    </a>

                    <a href="#security-alerts">
                        <AlertTriangle />
                        Security Alerts
                    </a>

                    <a href="#settings">
                        <Settings />
                        Settings
                    </a>
                </nav>

                <button
                    type="button"
                    className="logout"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                >
                    {isLoggingOut ? (
                        <Loader2 className="spin" />
                    ) : (
                        <LogOut />
                    )}

                    {isLoggingOut ? "Signing out..." : "Sign Out"}
                </button>

            </aside>

            {/* Main Dashboard */}
            <main className="dashboard-main">

                <header className="dashboard-header">

                    <div>
                        <h1>Dashboard</h1>

                        <p>
                            Welcome back, {user.fullName}.
                        </p>

                        <span className="dashboard-role">
                            {user.role.toUpperCase()} ACCOUNT
                        </span>
                    </div>

                    <div className="profile" title={user.fullName}>
                        {initials || <UserRound />}
                    </div>

                </header>

                {/* Welcome Section */}
                <section className="welcome-card">

                    <ShieldCheck size={45} />

                    <div>
                        <h2>Your trust journey starts here.</h2>

                        <p>
                            Monitor your interactions and stay informed
                            about potential risks.
                        </p>
                    </div>

                </section>

                {/* Dashboard Statistics */}
                <section className="stats-grid">

                    <div className="card">
                        <MessageSquare />

                        <h3>0</h3>

                        <p>Total conversations</p>
                    </div>

                    <div className="card">
                        <ShieldCheck />

                        <h3>Not available</h3>

                        <p>Trust score</p>
                    </div>

                    <div className="card">
                        <AlertTriangle />

                        <h3>0</h3>

                        <p>Security alerts</p>
                    </div>

                </section>

                {/* Recent Activity */}
                <section className="card activity">

                    <h2>Recent activity</h2>

                    <p>
                        No activity yet. Your interactions will appear here.
                    </p>

                </section>

                {/* Account Information */}
                <section className="card account-information">

                    <h2>Account information</h2>

                    <div>
                        <span>Full name</span>
                        <strong>{user.fullName}</strong>
                    </div>

                    <div>
                        <span>Email address</span>
                        <strong>{user.email}</strong>
                    </div>

                    <div>
                        <span>Account type</span>
                        <strong>{user.role}</strong>
                    </div>

                    <div>
                        <span>Account ID</span>
                        <strong>{user.id}</strong>
                    </div>

                </section>

                {error && (
                    <p className="auth-feedback" role="alert">
                        {error}
                    </p>
                )}

            </main>
        </div>
    );
}
