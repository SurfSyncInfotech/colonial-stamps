export default function EmptyState({ title, message, action }) {
  return (
    <div className="empty-state">
      <h3 style={{ fontFamily: 'var(--serif)', color: 'var(--forest)', marginBottom: 8 }}>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  );
}
