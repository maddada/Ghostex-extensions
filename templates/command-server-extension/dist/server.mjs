import { createServer } from "node:http";

const port = Number.parseInt(process.argv[2] ?? "", 10);
if (!Number.isInteger(port) || port < 1) {
  throw new Error("Ghostex must supply a valid {port} argument");
}

const page = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Command Server Extension</title>
    <style>
      :root { color-scheme: dark; font-family: system-ui, sans-serif; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0e0e0e; color: #f4f4f5; }
      main { padding: 32px; text-align: center; }
      p { color: #a1a1aa; }
    </style>
  </head>
  <body>
    <main>
      <h1>Command Server Extension</h1>
      <p>This page comes from a process managed by Ghostex.</p>
    </main>
  </body>
</html>`;

createServer((request, response) => {
  if (request.url !== "/") {
    response.writeHead(404).end("Not found");
    return;
  }
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(page);
}).listen(port, "127.0.0.1");
