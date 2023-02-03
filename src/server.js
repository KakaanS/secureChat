import express from "express";
import * as url from "url";
import router from "./routes/routes.js";
import * as dotenv from "dotenv";
import serveStatic from "serve-static";

dotenv.config();
const app = express();
const staticPath = url.fileURLToPath(new URL("../static", import.meta.url));

app.use(express.static(staticPath));

app.use(
  serveStatic(staticPath, {
    setHeaders: (res) => {
      if (res.getHeader("Content-Type").endsWith("css")) {
        res.setHeader("Content-Type", "text/css");
      }
    },
  })
);

const logger = (req, res, next) => {
  console.log(`${req.method} ${req.url}`, req.body);
  next();
};

app.use(express.json());
app.use(express.static(staticPath));
app.use(logger);
app.use("/api/", router);

app.get("*.css", function (req, res, next) {
  res.set("Content-Type", "text/css");
  console.log(res.get("Content-Type"));
  next();
});

app.listen(3000);
