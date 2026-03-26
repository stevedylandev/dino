import index from "./index.html";

Bun.serve({
  routes: {
    "/": index,
    "/assets/*": async (req) => {
      const url = new URL(req.url);
      const file = Bun.file(`./public${url.pathname}`);
      return new Response(file);
    },
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log("Dino server running at http://localhost:3000");
