import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");

const ROOT = resolve(__dirname, "..");

const packageJson = JSON.parse(
  readFileSync(resolve(ROOT, "package.json"), "utf8"),
);

const IMAGE = "afbeals/supper-club";
const VERSION = packageJson.version;

if (!VERSION) {
  throw new Error("package.json must contain a version.");
}

const VERSION_TAG = `${IMAGE}:${VERSION}`;
const LATEST_TAG = `${IMAGE}:latest`;

function run(command, args) {
  console.log(`\n> ${command} ${args.join(" ")}`);

  execFileSync(command, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}

function build() {
  run("docker", ["build", "-t", VERSION_TAG, "."]);
}

function tag() {
  run("docker", ["tag", VERSION_TAG, LATEST_TAG]);
}

function push() {
  run("docker", ["push", VERSION_TAG]);
  run("docker", ["push", LATEST_TAG]);
}

function test() {
  console.log(`
Starting local production-image test container.

App:  http://localhost:3000
Data: ./docker-data

Press Ctrl+C to stop the container.
`);

  run("docker", [
    "run",
    "--rm",
    "-p",
    "3000:3000",
    "-e",
    "SESSION_SECRET=temporary-test-secret",
    "-e",
    "DATABASE_URL=file:/app/data/prod.db",
    "-e",
    "COOKIE_SECURE=false",
    "-e",
    "UPLOAD_DIR=./data/uploads",
    "-v",
    `${resolve(ROOT, "docker-data")}:/app/data`,
    LATEST_TAG,
  ]);
}

function release() {
  build();
  tag();
  push();

  console.log("\nReleased:");
  console.log(`  ${VERSION_TAG}`);
  console.log(`  ${LATEST_TAG}`);
}

const command = process.argv[2];

switch (command) {
  case "build":
    build();
    break;

  case "tag":
    tag();
    break;

  case "test":
    test();
    break;

  case "push":
    push();
    break;

  case "release":
    release();
    break;

  default:
    console.log(`
Usage:

  yarn docker:build
  yarn docker:tag
  yarn docker:test
  yarn docker:push
  yarn docker:release

Current version:
  ${VERSION_TAG}
`);

    process.exit(command ? 1 : 0);
}
