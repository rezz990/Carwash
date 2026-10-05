// scripts/bundle-deploy.mjs
//
// Bundle deployment untuk cPanel dari output Next.js standalone.
//
// Alur:
//   1. npm run build (opsional, lewati dengan --skip-build)
//   2. public + .next/static disalin ke .next/standalone
//      lewat scripts/prepare-standalone.mjs
//   3. seluruh isi .next/standalone dikemas menjadi deploy/standalone.zip
//
// Satu zip berisi semuanya: server.js, node_modules, .next (server + static),
// dan public. Upload zip ke folder aplikasi cPanel, Extract, lalu restart
// Node.js App.
//
// Difokuskan untuk Windows dan aman dijalankan dari cmd maupun PowerShell.
// ZIP ditulis murni dengan API Node.js (tanpa perintah `zip`, tanpa
// Compress-Archive), jadi tidak butuh tool eksternal dan separator path di
// dalam zip selalu memakai "/" sehingga aman di-extract `unzip` di Linux.
//
// Usage:
//   npm run bundle
//   npm run bundle -- --skip-build
//   node scripts/bundle-deploy.mjs [--skip-build]

import { execFileSync } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { deflateRawSync } from "node:zlib"

const isWindows = process.platform === "win32"
const skipBuild = process.argv.includes("--skip-build")

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

const nextDir = path.join(root, ".next")
const standaloneDir = path.join(nextDir, "standalone")
const staticDir = path.join(nextDir, "static")
const publicDir = path.join(root, "public")
const prepareScript = path.join(root, "scripts", "prepare-standalone.mjs")

const deployDir = path.join(root, "deploy")
const bundleZip = path.join(deployDir, "standalone.zip")

function runNodeScript(scriptPath) {
  console.log(`$ node ${path.relative(root, scriptPath)}`)

  execFileSync(process.execPath, [scriptPath], {
    stdio: "inherit",
    cwd: root,
  })
}

function runBuild() {
  console.log("$ npm run build")

  const npmCli = process.env.npm_execpath

  if (npmCli) {
    // Dijalankan lewat `npm run bundle`.
    execFileSync(process.execPath, [npmCli, "run", "build"], {
      stdio: "inherit",
      cwd: root,
    })
    return
  }

  if (isWindows) {
    // Dijalankan langsung `node scripts/bundle-deploy.mjs` dari cmd/PowerShell.
    // npm dipanggil lewat cmd agar tidak bergantung pada shell pemanggil.
    execFileSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", "npm run build"], {
      stdio: "inherit",
      cwd: root,
    })
    return
  }

  execFileSync("npm", ["run", "build"], {
    stdio: "inherit",
    cwd: root,
  })
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)

  for (let index = 0; index < 256; index++) {
    let value = index

    for (let bit = 0; bit < 8; bit++) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }

    table[index] = value >>> 0
  }

  return table
})()

function crc32(buffer) {
  let crc = 0xffffffff

  for (let index = 0; index < buffer.length; index++) {
    crc = CRC_TABLE[(crc ^ buffer[index]) & 0xff] ^ (crc >>> 8)
  }

  return (crc ^ 0xffffffff) >>> 0
}

function collectFiles(dir, prefix, files) {
  const entries = readdirSync(dir, { withFileTypes: true })

  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    const zipPath = prefix ? `${prefix}/${entry.name}` : entry.name

    let isDirectory = entry.isDirectory()
    let isFile = entry.isFile()

    if (entry.isSymbolicLink()) {
      const stats = statSync(fullPath)

      isDirectory = stats.isDirectory()
      isFile = stats.isFile()
    }

    if (isDirectory) {
      collectFiles(fullPath, zipPath, files)
    } else if (isFile) {
      files.set(zipPath, fullPath)
    }
  }
}

function createZip(sourceDir, outputZip) {
  const files = new Map()

  collectFiles(sourceDir, "", files)

  console.log(`Mengemas ${files.size} file dari ${path.relative(root, sourceDir)} ...`)

  // Timestamp tetap supaya zip yang dihasilkan deterministik.
  const dosTime = 0
  const dosDate = ((2024 - 1980) << 9) | (1 << 5) | 1

  const localParts = []
  const centralParts = []
  let offset = 0

  for (const [zipPath, filePath] of files) {
    const content = readFileSync(filePath)
    const deflated = deflateRawSync(content)
    const useDeflate = deflated.length < content.length
    const method = useDeflate ? 8 : 0
    const data = useDeflate ? deflated : content
    const nameBuffer = Buffer.from(zipPath, "utf8")
    const crc = crc32(content)

    // Local file header (30 byte) + nama + isi.
    const localHeader = Buffer.alloc(30)

    localHeader.writeUInt32LE(0x04034b50, 0)
    localHeader.writeUInt16LE(20, 4)
    localHeader.writeUInt16LE(0x0800, 6) // flag: nama file UTF-8
    localHeader.writeUInt16LE(method, 8)
    localHeader.writeUInt16LE(dosTime, 10)
    localHeader.writeUInt16LE(dosDate, 12)
    localHeader.writeUInt32LE(crc, 14)
    localHeader.writeUInt32LE(data.length, 18)
    localHeader.writeUInt32LE(content.length, 22)
    localHeader.writeUInt16LE(nameBuffer.length, 26)
    localHeader.writeUInt16LE(0, 28)

    localParts.push(localHeader, nameBuffer, data)

    // Central directory entry (46 byte) + nama.
    const centralHeader = Buffer.alloc(46)

    centralHeader.writeUInt32LE(0x02014b50, 0)
    centralHeader.writeUInt16LE(20, 4)
    centralHeader.writeUInt16LE(20, 6)
    centralHeader.writeUInt16LE(0x0800, 8)
    centralHeader.writeUInt16LE(method, 10)
    centralHeader.writeUInt16LE(dosTime, 12)
    centralHeader.writeUInt16LE(dosDate, 14)
    centralHeader.writeUInt32LE(crc, 16)
    centralHeader.writeUInt32LE(data.length, 20)
    centralHeader.writeUInt32LE(content.length, 24)
    centralHeader.writeUInt16LE(nameBuffer.length, 28)
    centralHeader.writeUInt32LE(0, 38)
    centralHeader.writeUInt32LE(offset, 42)

    centralParts.push(centralHeader, nameBuffer)

    offset += localHeader.length + nameBuffer.length + data.length
  }

  const centralSize = centralParts.reduce((total, part) => total + part.length, 0)

  // End of central directory record (22 byte).
  const endRecord = Buffer.alloc(22)

  endRecord.writeUInt32LE(0x06054b50, 0)
  endRecord.writeUInt16LE(files.size, 8)
  endRecord.writeUInt16LE(files.size, 10)
  endRecord.writeUInt32LE(centralSize, 12)
  endRecord.writeUInt32LE(offset, 16)

  writeFileSync(outputZip, Buffer.concat([...localParts, ...centralParts, endRecord]))

  return files.size
}

function main() {
  console.log("")
  console.log("========================================")
  console.log(" Carwash - Deployment Bundle")
  console.log("========================================")
  console.log(`OS      : ${process.platform}`)
  console.log(`Node    : ${process.version}`)
  console.log(`Root    : ${root}`)
  console.log("")

  if (skipBuild) {
    console.log("== Skip build, memakai hasil .next sebelumnya ==")
    console.log("")
  } else {
    console.log("== Build ==")
    runBuild()
    console.log("")
  }

  const requiredDirs = [
    ["standalone", standaloneDir],
    ["static", staticDir],
    ["public", publicDir],
  ]

  for (const [label, dir] of requiredDirs) {
    if (!existsSync(dir)) {
      console.error(`Tidak ketemu folder ${label}:\n${dir}\n`)
      console.error("Jalankan `npm run bundle` tanpa --skip-build.")
      process.exit(1)
    }
  }

  console.log("== Menyiapkan aset standalone (public + static) ==")
  runNodeScript(prepareScript)
  console.log("")

  if (!existsSync(path.join(standaloneDir, "server.js"))) {
    console.error(`Tidak ketemu:\n${path.join(standaloneDir, "server.js")}\n`)
    console.error('Pastikan `output: "standalone"` aktif di next.config.ts, lalu build ulang.')
    process.exit(1)
  }

  rmSync(deployDir, { recursive: true, force: true })
  mkdirSync(deployDir, { recursive: true })

  console.log("== Membuat deploy/standalone.zip ==")
  const fileCount = createZip(standaloneDir, bundleZip)

  const sizeMb = (statSync(bundleZip).size / 1024 / 1024).toFixed(1)

  console.log("")
  console.log("========================================")
  console.log(" Selesai")
  console.log("========================================")
  console.log("")
  console.log(`Zip : ${path.relative(root, bundleZip)} (${sizeMb} MB, ${fileCount} file)`)
  console.log("Isi : server.js, node_modules/, .next/ (server + static), public/")
  console.log("")
  console.log("Pasang di cPanel:")
  console.log("  1. Buka File Manager ke folder aplikasi (mis. dev.bujon.my.id).")
  console.log("  2. Upload deploy/standalone.zip lalu Extract (timpa file lama).")
  console.log("     Lewat terminal cPanel: unzip -o standalone.zip -d .")
  console.log("  3. Restart Node.js App.")
  console.log("")
}

main()
