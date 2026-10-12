import { io } from "socket.io-client";

// Opens a live connection to the server, logged in with the saved token.
// In development the Vite proxy handles it; when deployed, VITE_API_URL points to the backend.
export const connectSocket = () => io(import.meta.env.VITE_API_URL || undefined, { auth: { token: localStorage.getItem("token") } });
