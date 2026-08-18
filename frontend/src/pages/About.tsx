import { Link } from "react-router-dom";
import { Logo } from "../components/Logo";
import { useAuth } from "../context/AuthContext";

export function About() {
  const { session } = useAuth();

  return (
    <div className="about-page">
      <div className="about-hero">
        <Logo size={44} />
        <p className="eyebrow">About Landlee</p>
        <h1>A calmer way to job hunt</h1>
        <p className="lede">
          Landlee exists for one moment: the one where you actually land the role, not just add
          another posting to a pile of tabs. Paste a job link, and it handles the parts of
          applying that are tedious but not hard — reading the posting closely, writing a letter
          that actually mirrors it, and remembering the deadline before it's too late.
        </p>
      </div>

      <section className="about-section">
        <h2>What it does</h2>

        <div className="about-feature">
          <h3>Understands the job, instantly</h3>
          <p>
            Paste a link to any posting. Landlee fetches the page and pulls out what actually
            matters — title, company, responsibilities, requirements, and the application
            deadline — so you're not re-reading a wall of text to decide if you're even
            qualified.
          </p>
        </div>

        <div className="about-feature">
          <h3>Writes from your real experience</h3>
          <p>
            Generate a tailored cover letter or CV notes for that specific role, built from your
            own resume. Landlee never invents experience, employers, or skills you don't have —
            it helps you say what's already true, in the language the posting uses.
          </p>
        </div>

        <div className="about-feature">
          <h3>Never lets a deadline slip past</h3>
          <p>
            Every saved job's closing date is tracked automatically. Landlee emails you a
            reminder before it's too late — 7 days out, 3 days out, and the day before, by
            default.
          </p>
        </div>
      </section>

      <section className="about-section">
        <h2>How it works</h2>
        <ol className="about-steps">
          <li>
            <span className="step-number">1</span>
            <div>
              <strong>Paste a job link</strong>
              <p>Any posting URL — Landlee reads the page for you.</p>
            </div>
          </li>
          <li>
            <span className="step-number">2</span>
            <div>
              <strong>Review what it found</strong>
              <p>Title, requirements, responsibilities, and deadline, laid out clearly.</p>
            </div>
          </li>
          <li>
            <span className="step-number">3</span>
            <div>
              <strong>Generate your materials</strong>
              <p>A cover letter and CV tailoring notes, grounded in your actual resume.</p>
            </div>
          </li>
          <li>
            <span className="step-number">4</span>
            <div>
              <strong>Track it, and get reminded</strong>
              <p>Update status as you go — Landlee watches the deadline so you don't have to.</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="about-section about-trust">
        <h2>Your data stays yours</h2>
        <p>
          Your resume and job history belong to you alone. Every account is fully isolated at
          the database level — nobody, including us, can see another user's saved jobs,
          generated documents, or resume text.
        </p>
      </section>

      <div className="about-cta">
        <h2>Ready to land the next one?</h2>
        <Link to={session ? "/add-job" : "/signup"} className="button-primary">
          {session ? "Add a job" : "Get started"}
        </Link>
      </div>
    </div>
  );
}
