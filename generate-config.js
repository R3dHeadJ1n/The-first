const fs = require("fs");

let template = fs.readFileSync("config.template.json", "utf8");

template = template.replace(
  "__BACKEND_URL__",
  process.env.BACKEND_URL
);

fs.writeFileSync("config.json", template);