import Hibiscus from './Hibiscus';

/** The top band of inner pages: label, title, short intro, and a soft botanical detail. */
export default function PageHero({ label, title, children }) {
  return (
    <div className="page-hero">
      <Hibiscus variant="silhouette" className="hero-deco" />
      <div className="page-hero-inner">
        {label && <div className="section-label">{label}</div>}
        <h1 className="section-title">{title}</h1>
        {children && <p className="section-sub">{children}</p>}
      </div>
    </div>
  );
}
