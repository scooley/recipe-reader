/// <reference lib="dom" />
import { broadcastResponseToMainFrame } from "@azure/msal-browser/redirect-bridge";

try {
  await broadcastResponseToMainFrame();
} catch {
  const status = document.getElementById("status");
  if (status) {
    status.textContent =
      "Sign-in could not return to the original window. Close this window and try signing in again.";
    status.setAttribute("role", "alert");
  }
}
