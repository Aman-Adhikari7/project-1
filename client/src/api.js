// One helper for every backend call. It adds the login token automatically,
// sends files (FormData) correctly, and talks to VITE_API_URL when deployed.
const BASE = import.meta.env.VITE_API_URL || "";

export async function api(path, { method = "GET", body } = {}) {
  const token = localStorage.getItem("token");
  const isForm = body instanceof FormData;
  const res = await fetch(BASE + "/api" + path, {
    method,
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

// Downloads a file the server sends (for example the CSV of results).
export async function download(path, filename) {
  const res = await fetch(BASE + "/api" + path, { headers: { Authorization: "Bearer " + localStorage.getItem("token") } });
  if (!res.ok) throw new Error("Download failed.");
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}
