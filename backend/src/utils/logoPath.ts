import { fileURLToPath } from "node:url";
import path from "node:path";

// Resolved once here rather than in each controller -- both PDF exports
// (sales report, activity report) embed the same store logo.
export const LOGO_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "assets",
  "logo.jpg",
);
