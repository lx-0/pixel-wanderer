export function isNode() {
  return (
    typeof process !== 'undefined' && process.versions != null && process.versions.node != null
  );
}

export function isBrowser() {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}
