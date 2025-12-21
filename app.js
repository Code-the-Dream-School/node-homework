const express = require("express");

const errorHandler = require("./middleware/error-handler");
const notfoundHandler = require("./middleware/not-found");

const userRouter = require("./routes/userRoutes");

const app = express();

// **********
// USER STORAGE
// **********
global.user_id = null;
global.users = [];
global.tasks = [];
// **********

app.use(express.json({ limit: "1kb" }));

// *********
// authentication
const authMiddleware = require("./middleware/auth");
const taskRouter = require("./routes/taskRoutes");
app.use("/api/tasks", authMiddleware, taskRouter);

app.use((req, res, next) => {
  console.log(
    "req.method: ",
    req.method,
    "\nreq.path: ",
    req.path,
    "\nreq.query: ",
    req.query
  );
  next();
});

app.get("/", (req, res) => {
  res.json({ message: "/ get..." });
});

app.use("/api/users", userRouter);

// NOT FOUND
app.use(notfoundHandler);

// ERROR
app.use(errorHandler);

const port = process.env.PORT || 3000;
const server = app.listen(port, () =>
  console.log(`Server is listening on port ${port}...`)
);

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use.`);
  } else {
    console.error("Server error:", err);
  }
  process.exit(1);
});

let isShuttingDown = false;
async function shutdown(code = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log("Shutting down gracefully...");
  try {
    await new Promise((resolve) => server.close(resolve));
    console.log("HTTP server closed.");
    // If you have DB connections, close them here
  } catch (err) {
    console.error("Error during shutdown:", err);
    code = 1;
  } finally {
    console.log("Exiting process...");
    process.exit(code);
  }
}

process.on("SIGINT", () => shutdown(0)); // ctrl+c
process.on("SIGTERM", () => shutdown(0)); // e.g. `docker stop`
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  shutdown(1);
});
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  shutdown(1);
});

module.exports = { app, server };
