export default function Loading({ message = 'Loading...' }) {
  return (
    <div className="loading">
      <div className="loading-spinner" />
      <p>{message}</p>
    </div>
  );
}
