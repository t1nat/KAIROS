/**
 * Custom Next.js server.
 *
 * WebSocket handling has moved to a standalone process (ws-server/).
 * This server only handles HTTP requests via Next.js.
 *
 * Usage:
 *   dev:   tsx watch server.ts        (Next.js)
 *          pnpm ws:dev                (WS server — separate terminal)
 *   prod:  node --import tsx server.ts
 */

import { createServer } from "node:http";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "localhost";
const port = parseInt(process.env.PORT ?? "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    void handle(req, res);
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
