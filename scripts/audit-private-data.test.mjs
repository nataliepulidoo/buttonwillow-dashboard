import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { auditPrivateData } from "./audit-private-data.mjs";

function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), "buttonwillow-privacy-test-"));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(tmpdir()));
    assert.ok(path.basename(root).startsWith("buttonwillow-privacy-test-"));
    rmSync(root, { recursive: true, force: true });
  });
  writeFileSync(path.join(root, "index.html"), "<p>Fictional fixture</p>");
  return root;
}

test("deployment source passes after Vercel strips Git metadata", (t) => {
  const root = fixture(t);
  mkdirSync(path.join(root, ".git", "objects"), { recursive: true });
  assert.doesNotThrow(() => auditPrivateData(root));
});

test("source without Git still rejects private workbooks and caches", (t) => {
  const root = fixture(t);
  writeFileSync(
    path.join(root, "synthetic-private.xlsx"),
    "Synthetic filename fixture only",
  );
  assert.throws(() => auditPrivateData(root), /synthetic-private.xlsx/);
  rmSync(path.join(root, "synthetic-private.xlsx"));
  mkdirSync(path.join(root, ".local-data"));
  writeFileSync(
    path.join(root, ".local-data", "synthetic-sales.json.gz"),
    "Synthetic fixture only",
  );
  assert.throws(() => auditPrivateData(root), /synthetic-sales.json.gz/);
});

test("pruned Git does not permit data containers in public or nested source folders", (t) => {
  const root = fixture(t);
  mkdirSync(path.join(root, ".git"));
  mkdirSync(path.join(root, "public"));
  writeFileSync(path.join(root, "public", "synthetic-sales.json"), "{}");
  assert.throws(() => auditPrivateData(root), /public\/synthetic-sales.json/);
  rmSync(path.join(root, "public", "synthetic-sales.json"));
  mkdirSync(path.join(root, "src", "dist"), { recursive: true });
  writeFileSync(
    path.join(root, "src", "dist", "synthetic-private.xlsx"),
    "Synthetic fixture only",
  );
  assert.throws(
    () => auditPrivateData(root),
    /src\/dist\/synthetic-private.xlsx/,
  );
});

test("deployment output still rejects private files without Git metadata", (t) => {
  const root = fixture(t);
  mkdirSync(path.join(root, "dist"));
  writeFileSync(path.join(root, "dist", "synthetic-sales.csv"), "demo,1");
  assert.throws(
    () => auditPrivateData(root, "dist"),
    /dist\/synthetic-sales.csv/,
  );
  rmSync(path.join(root, "dist", "synthetic-sales.csv"));
  writeFileSync(path.join(root, "dist", "index.html"), "<p>Demonstration</p>");
  assert.doesNotThrow(() => auditPrivateData(root, "dist"));
});
