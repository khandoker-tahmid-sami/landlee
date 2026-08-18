import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { Avatar } from "./Avatar";
import { Logo } from "./Logo";

function navLinkClass({ isActive }: { isActive: boolean }) {
  return isActive ? "active-link" : undefined;
}

function dropdownItemClass({ isActive }: { isActive: boolean }) {
  return isActive ? "navbar-dropdown-item active-link" : "navbar-dropdown-item";
}

export function Navbar() {
  const { session, profile } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function handleLogout() {
    setMenuOpen(false);
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
            <NavLink to="/jobs" className={navLinkClass}>
              Jobs
            </NavLink>
            <NavLink to="/add-job" className={navLinkClass}>
              Add job
            </NavLink>
            <NavLink to="/about" className={navLinkClass}>
              About
            </NavLink>
            <div className="navbar-menu" ref={menuRef}>
              <button
                type="button"
                className="navbar-avatar-button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="true"
                aria-expanded={menuOpen}
                title={session.user.email}
              >
                <Avatar url={profile?.avatar_url} name={profile?.full_name ?? session.user.email} size={30} />
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="navbar-chevron"
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {menuOpen && (
                <div className="navbar-dropdown" role="menu">
                  <NavLink
                    to="/profile"
                    className={dropdownItemClass}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    Profile
                  </NavLink>
                  <NavLink
                    to="/settings"
                    className={dropdownItemClass}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    Settings
                  </NavLink>
                  <button
                    type="button"
                    className="navbar-dropdown-item navbar-dropdown-logout"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <NavLink to="/about" className={navLinkClass}>
              About
            </NavLink>
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
