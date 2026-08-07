// TawjihIQ backend — production entry point.
//
// The backend is written in TypeScript under ./src. Node cannot run .ts files
// directly, so it must be compiled first:
//
//   npm run build      (compiles ./src -> ./dist)
//   node server.js     (runs the compiled server)
//
// For development with auto-reload use: npm run dev

const fs = require("fs");
const path = require("path");

const compiled = path.join(__dirname, "dist", "index.js");

if (!fs.existsSync(compiled)) {
  console.error(
    "\n[TawjihIQ] Build output not found (dist/index.js).\n" +
      "Run `npm run build` first, then `node server.js`.\n"
  );
  process.exit(1);
}

require(compiled);
