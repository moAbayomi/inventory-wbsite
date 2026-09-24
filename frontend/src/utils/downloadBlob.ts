// Triggers a browser download for an already-fetched Blob (e.g. a PDF
// export response) without navigating away from the current page --
// create a throwaway object URL, click a hidden anchor pointed at it,
// then clean both up immediately.
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
