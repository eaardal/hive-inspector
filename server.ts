import http from "http";
import { parse } from "url";
import next from "next";
import WebSocket from "ws";
import express from "express";
import bodyParser from "body-parser";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const port = process.env.PORT || 3001;

app.prepare().then(() => {
  const server = express();

  server.use(bodyParser.json());

  const wss = new WebSocket.Server({ noServer: true });

  let wsClients: WebSocket[] = [];

  wss.on("connection", (ws: WebSocket) => {
    wsClients.push(ws);

    ws.on("close", () => {
      wsClients = wsClients.filter((client) => client !== ws);
    });
  });

  server.post("/api/:key", (req, res) => {
    const payload = req.body;
    const key = req.params.key;
    console.log(key, JSON.stringify(payload));

    wsClients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ key, data: payload }));
      }
    });

    res.json({ status: "ok" });
  });

  server.all("*", (req, res) => {
    const parsedUrl = parse(req.url ?? "", true);
    return handle(req, res, parsedUrl);
  });

  const httpServer = http.createServer(server);
  httpServer.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  httpServer.listen(port, () => {
    console.log("> Ready on http://localhost:" + port);
  });
});
