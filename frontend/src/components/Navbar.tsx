import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { Logo } from "./Logo";

function navLinkClass({ isActive }: { isActive: boolean }) {
  return isActive ? "active-link" : undefined;
}

export function Navbar() {
  const { session } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand">
        <Logo size={30} />
        Landlee
      </NavLink>
      <div className="navbar-links">
        {session ? (
          <>
            <NavLink to="/" end className={navLinkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/add-job" className={navLinkClass}>
              Add job
            </NavLink>
            <NavLink to="/settings" className={navLinkClass}>
              Settings
            </NavLink>
            {session.user.email && <span className="navbar-user">{session.user.email}</span>}
            <button onClick={handleLogout} className="button-ghost">
              Log out
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login" className={navLinkClass}>
              Log in
            </NavLink>
            <NavLink to="/signup" className="button-primary">
              Sign up
            </NavLink>
          </>
        )}
      </div>
    </nav>
  );
}
