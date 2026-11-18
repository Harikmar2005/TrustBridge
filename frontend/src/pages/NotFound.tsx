import { Link } from "react-router-dom";

export default function NotFound() {
    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1>404</h1>
                <p>Sorry, this page doesn't exist.</p>
                <Link to="/" className="btn btn-primary">
                    Back to Home
                </Link>
            </div>
        </div>
    );
}