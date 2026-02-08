import fs from "node:fs";
import path from "node:path";

const filePath = path.join(
  process.cwd(),
  "node_modules",
  "@vue-macros",
  "common",
  "dist",
  "index.js"
);

if (!fs.existsSync(filePath)) {
  process.exit(0);
}

const content = fs.readFileSync(filePath, "utf8");
const needle = "if (process.getBuiltinModule) {\n    const module = process.getBuiltinModule(\"module\");\n    _require = module.createRequire(import.meta.url);\n  } else {\n    import(\"node:module\").then(\n      ({ default: { createRequire } }) => {\n        _require = createRequire(import.meta.url);\n      },\n      () => {\n      }\n    );\n  }";

if (!content.includes(needle)) {
  process.exit(0);
}

const replacement = "if (process.getBuiltinModule) {\n    const module = process.getBuiltinModule(\"module\");\n    if (module && typeof module.createRequire === \"function\") {\n      _require = module.createRequire(import.meta.url);\n    } else {\n      import(\"node:module\").then(\n        ({ default: { createRequire } }) => {\n          _require = createRequire(import.meta.url);\n        },\n        () => {\n        }\n      );\n    }\n  } else {\n    import(\"node:module\").then(\n      ({ default: { createRequire } }) => {\n        _require = createRequire(import.meta.url);\n      },\n      () => {\n      }\n    );\n  }";

fs.writeFileSync(filePath, content.replace(needle, replacement));
