import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

export function privateDataPath(value) {
  const name = value.replaceAll("\\", "/").toLowerCase();
  return (
    /\.(xlsx|xls|xlsm|tsv|parquet|sqlite|db)$/.test(name) ||
    /(^|\/)(\.local-data|private)(\/|$)/.test(name) ||
    (/(^|\/)\.env(\.|$)/.test(name) && !name.endsWith(".env.example")) ||
    (/\.(csv|json\.gz)$/.test(name) &&
      !/(^|\/)data\/sample-sales\.csv$/.test(name))
  );
}

function files(folder) {
  if (!existsSync(folder)) return [];
  const result = [];
  for (const name of readdirSync(folder)) {
    const target = path.join(folder, name);
    const stat = lstatSync(target);
    if (stat.isSymbolicLink())
      throw Error("Deployment audit does not permit symlinks: " + target);
    if (stat.isDirectory()) result.push(...files(target));
    else result.push(target);
  }
  return result;
}

export function auditPrivateData(root, artifactDirectory) {
  const violations = [];
  for (const file of files(path.join(root, "public"))) {
    const relative = path.relative(root, file).replaceAll("\\", "/");
    // Public files must be presentation assets, never company data containers.
    if (privateDataPath(relative) || /\.(json|gz|zip)$/.test(relative))
      violations.push(relative);
  }
  if (existsSync(path.join(root, ".git"))) {
    const git = spawnSync(
      "git",
      ["-c", `safe.directory=${root.replaceAll("\\", "/")}`, "ls-files", "-z"],
      { cwd: root, encoding: "utf8" },
    );
    if (git.status !== 0)
      throw Error(
        "Cannot inspect tracked files. Make Git available before building.",
      );
    violations.push(
      ...git.stdout.split("\0").filter(Boolean).filter(privateDataPath),
    );
  }
  if (artifactDirectory) {
    const artifactRoot = path.resolve(root, artifactDirectory);
    if (!existsSync(artifactRoot))
      throw Error("Build output missing: " + artifactDirectory);
    for (const file of files(artifactRoot)) {
      const relative = path.relative(root, file).replaceAll("\\", "/");
      if (privateDataPath(relative)) violations.push(relative);
      if (file.endsWith(".nft.json")) {
        for (const traced of JSON.parse(readFileSync(file, "utf8")).files ||
          []) {
          const target = path.resolve(path.dirname(file), traced);
          if (privateDataPath(path.relative(root, target)))
            violations.push(path.relative(root, target));
        }
      }
    }
  }
  if (violations.length)
    throw Error(
      "Private data must be removed from the Git snapshot/public assets/build traces (preserve originals outside deployment):\n" +
        [...new Set(violations)].join("\n"),
    );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    auditPrivateData(process.cwd(), process.argv[2]);
    console.log(
      "Privacy audit passed: no private data files in tracked source, public assets, or requested build traces.",
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
