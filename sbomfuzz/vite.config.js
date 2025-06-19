import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  root: path.resolve(__dirname, "frontend"),
  publicDir: path.resolve(__dirname, "public"), // <-- this is key!
   build: {
    outDir: path.resolve(__dirname, "media"),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "frontend", "main.js"),
      output: {
        entryFileNames: "webview.js",
      },
    },
  },
});
