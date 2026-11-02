export function Panel({ title, subtitle, actions, children, id }) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section className="panel" aria-labelledby={headingId}>
      {(title || actions) && (
        <header className="panel__head">
          <div>
            {title && <h2 id={headingId} className="panel__title">{title}</h2>}
            {subtitle && <p className="panel__subtitle">{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatGrid({ items }) {
  return (
    <dl className="stats">
      {items.map((item) => (
        <div key={item.label} className="stat">
          <dd className="stat__value">{item.value}</dd>
          <dt className="stat__label">{item.label}</dt>
        </div>
      ))}
    </dl>
  );
}

export function Badge({ tone = "neutral", children }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

export function Notice({ tone = "info", children, role }) {
  return (
    <p className={`notice notice--${tone}`} role={role}>
      {children}
    </p>
  );
}

export function formatDateTime(iso) {
  return new Date(iso).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
}

export function minutesSince(iso, now = Date.now()) {
  return Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
}
