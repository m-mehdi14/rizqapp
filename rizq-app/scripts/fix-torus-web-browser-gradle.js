const fs = require("fs");
const path = require("path");

const gradlePath = path.join(
  __dirname,
  "..",
  "node_modules",
  "@toruslabs",
  "react-native-web-browser",
  "android",
  "build.gradle"
);

if (!fs.existsSync(gradlePath)) {
  process.exit(0);
}

const content = fs.readFileSync(gradlePath, "utf8");
if (!content.includes("jcenter()")) {
  process.exit(0);
}

const updated = content.replace(/\s*jcenter\(\)\s*\n/g, "\n");
fs.writeFileSync(gradlePath, updated, "utf8");
console.log("patched @toruslabs/react-native-web-browser/android/build.gradle (removed jcenter)");
