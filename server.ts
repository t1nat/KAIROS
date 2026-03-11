/**
 * Custom Next.js server that attaches Socket.IO to the same HTTP server.
 *
 * Usage:
 *   dev:   tsx watch server.ts
 *   prod:  node --import tsx server.ts   (after `next build`)
 */

import { createServer } from "node:http";
import next from "next";
import { initSocketIO } from "./src/server/socket/index";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "localhost";
const port = parseInt(process.env.PORT ?? "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    void handle(req, res);
  });

  initSocketIO(httpServer);

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
