#!/usr/bin/env bun
import { $ } from "bun"
import { existsSync, rmSync, mkdirSync } from "fs"

const DIST_DIR = "./dist"
const PUBLIC_DIR = "./public"

console.log("🦕 Building Dino Game...\n")

// Clean and create dist
if (existsSync(DIST_DIR)) {
  console.log("🧹 Cleaning dist directory...")
  rmSync(DIST_DIR, { recursive: true, force: true })
}
mkdirSync(DIST_DIR, { recursive: true })

// Build with Bun
console.log("📦 Building bundle...")
await $`bun build ./index.html --outdir ${DIST_DIR}`

// Copy assets
console.log("📁 Copying assets...")
await $`cp -r ${PUBLIC_DIR}/assets ${DIST_DIR}/assets`

// Copy public files (icons, manifest, etc)
console.log("🖼️  Copying icons and manifest...")
await $`cp ${PUBLIC_DIR}/*.png ${DIST_DIR}/`.quiet()
await $`cp ${PUBLIC_DIR}/*.ico ${DIST_DIR}/`.quiet()
await $`cp ${PUBLIC_DIR}/*.webmanifest ${DIST_DIR}/`.quiet()

// Copy functions
console.log("⚡ Copying API functions...")
await $`cp -r ./functions ${DIST_DIR}/functions`

// Copy config for API functions
console.log("⚙️  Copying config for API...")
mkdirSync(`${DIST_DIR}/src`, { recursive: true })
await $`cp ./src/config.js ${DIST_DIR}/src/config.js`

console.log("\n✅ Build complete! Output in ./dist")
