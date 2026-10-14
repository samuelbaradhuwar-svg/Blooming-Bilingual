import Hibiscus from './Hibiscus';
import { BRAND } from '../../data/brand';

/** Two-panel sign-in layout: botanical panel on the left (a slim banner on phones), form on the right. */
export default function AuthShell({ headline, children }) {
  return (
    <div className="auth-page">
      <aside className="auth-art" aria-hidden="true">
        <Hibiscus className="hibiscus" />
        <div className="auth-art-copy">
          <h2>{headline}</h2>
          <p className="tagline">{BRAND.tagline}</p>
        </div>
      </aside>
      <div className="auth-main">
        <div className="auth-card">{children}</div>
      </div>
    </div>
  );
}
