const fs = require("fs");
const path = require("path");

const templatePath = path.join(__dirname, "config.template.json");
const outputPath = path.join(__dirname, "config.json");

const template = fs.readFileSync(templatePath, "utf8");

const result = template.replace(
  "__BACKEND_URL__",
  process.env.REACT_APP_BACKEND_URL
);

fs.writeFileSync(outputPath, result);

console.log("config.json generated");