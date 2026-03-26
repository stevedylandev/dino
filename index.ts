import index from "./index.html";

Bun.serve({
  routes: {
    "/": index,
    "/assets/*": async (req) => {
      const url = new URL(req.url);
      const file = Bun.file(`./public${url.pathname}`);
      return new Response(file);
    },
    "/*": async (req) => {
      const url = new URL(req.url);
      const file = Bun.file(`./public${url.pathname}`);
      if (await file.exists()) {
        return new Response(file);
      }
      return new Response("Not found", { status: 404 });
    },
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log("Dino server running at http://localhost:3000");
