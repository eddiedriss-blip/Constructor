import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    const isDev = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
    if (isDev) {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Default to 3000 if not specified.
    // This serves both the API and the client.
    let defaultPort = 3000;
    
    const port = parseInt(process.env.PORT || defaultPort.toString(), 10);
    
    // Ensure port is valid
    const finalPort = (isNaN(port) || port <= 0) ? defaultPort : port;

    // On Windows and macOS, use localhost instead of 0.0.0.0
    // On Linux, use 0.0.0.0 for network access
    const host = (process.platform === "win32" || process.platform === "darwin") ? "127.0.0.1" : "0.0.0.0";

    // Build listen options
    const listenOptions: any = {
      port: finalPort,
      host: host,
    };

    // Enable SO_REUSEADDR to allow port reuse (works on macOS and Linux)
    // This helps when a port is in TIME_WAIT state or occupied by a service
    if (process.platform === "linux") {
      listenOptions.reusePort = true;
    }
    // On macOS, we can use reuseAddress via the underlying socket
    // Node.js HTTP server doesn't expose this directly, but we'll handle it in error handler

    // Handle server errors gracefully
    server.on("error", (err: any) => {
      if (err.code === "EADDRINUSE") {
        log(`Port ${finalPort} est occupé. Utilisez un autre port avec PORT=<port> npm run dev`, "server");
      } else {
        log(`server listen error: ${err?.code || err?.message}`, "server");
      }
      process.exit(1);
    });

    server.listen(listenOptions, () => {
      log(`serving on http://${host}:${finalPort}`);
    });
  } catch (error: any) {
    log(`Erreur fatale: ${error?.message || error}`, "server");
    console.error(error);
    process.exit(1);
  }
})();
