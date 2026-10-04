// scripts/bundle-deploy.mjs
//
// Build Next.js (standalone output) lalu bundle jadi 2 zip siap upload ke cPanel:
//
//   deploy/standalone.zip -> isi dari .next/standalone
//   deploy/static.zip     -> folder "static" dari .next
//
// Cross-platform:
//   - Windows
//   - Linux
//   - macOS
//
// Usage:
//   node scripts/bundle-deploy.mjs
//   node scripts/bundle-deploy.mjs --skip-build
//
// Tidak membutuhkan syntax shell seperti:
//   &&
//   |
//   >>
//   rm -rf
//   mkdir -p
//
// Script menggunakan Node.js API langsung sehingga terminal
// PowerShell / CMD / Bash / Zsh tidak memengaruhi cara kerjanya.

import { execFileSync } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  rmSync,
} from "node:fs"
import path from "node:path"

const root = process.cwd()
const skipBuild = process.argv.includes("--skip-build")

const isWindows = process.platform === "win32"

const standaloneDir = path.join(root, ".next", "standalone")
const staticDir = path.join(root, ".next", "static")
const nextDir = path.join(root, ".next")

const deployDir = path.join(root, "deploy")
const standaloneZip = path.join(deployDir, "standalone.zip")
const staticZip = path.join(deployDir, "static.zip")

function getCommand(command) {
  if (isWindows && command === "npm") {
    return "npm"
  }

  return command
}

function run(command, args, options = {}) {
  const executable = getCommand(command)

  console.log(`$ ${executable} ${args.join(" ")}`)

  execFileSync(executable, args, {
    stdio: "inherit",
    windowsHide: false,
    shell: isWindows,
    ...options,
  })
}

function commandExists(command, args = ["--version"]) {
  try {
    execFileSync(getCommand(command), args, {
      stdio: "ignore",
    })

    return true
  } catch {
    return false
  }
}

function ensureZipAvailable() {
  // Prefer native zip because it works consistently on Unix-like systems.
  if (commandExists("zip", ["-v"])) {
    return "zip"
  }

  // Windows normally has PowerShell available even when `zip`
  // is not installed.
  if (isWindows && commandExists("powershell", ["-NoProfile", "-Command", "$PSVersionTable.PSVersion"])) {
    return "powershell"
  }

  console.error("")
  console.error("Tidak menemukan tool untuk membuat ZIP.")
  console.error("")

  if (isWindows) {
    console.error("Windows:")
    console.error("  PowerShell tidak tersedia.")
    console.error("  Pastikan PowerShell tersedia di sistem.")
  } else {
    console.error("Linux/macOS:")
    console.error("  Install command `zip` terlebih dahulu.")
    console.error("")
    console.error("Ubuntu/Debian:")
    console.error("  sudo apt install zip")
    console.error("")
    console.error("Arch/CachyOS:")
    console.error("  sudo pacman -S zip")
    console.error("")
    console.error("macOS:")
    console.error("  zip biasanya sudah tersedia.")
  }

  process.exit(1)
}

function zipWithNativeZip(sourceDir, outputZip, entries) {
  run(
    "zip",
    [
      "-r",
      "-q",
      outputZip,
      ...entries,
    ],
    {
      cwd: sourceDir,
    },
  )
}

function zipWithPowerShell(sourceDir, outputZip, mode) {
  /*
   * Compress-Archive dipanggil langsung sebagai executable PowerShell,
   * bukan melalui CMD/Bash.
   *
   * mode:
   *   contents -> isi sourceDir masuk ke root ZIP
   *   folder   -> folder sourceDir sendiri masuk ke ZIP
   */

  const source = sourceDir.replace(/'/g, "''")
  const destination = outputZip.replace(/'/g, "''")

  let command

  if (mode === "contents") {
    command = `
      $ErrorActionPreference = 'Stop'
      $source = '${source}'
      $destination = '${destination}'
      Compress-Archive -Path (Join-Path $source '*') -DestinationPath $destination -Force
    `
  } else {
    command = `
      $ErrorActionPreference = 'Stop'
      $source = '${source}'
      $destination = '${destination}'
      Compress-Archive -Path $source -DestinationPath $destination -Force
    `
  }

  run(
    "powershell",
    [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      command,
    ],
  )
}

function createZip(sourceDir, outputZip, mode, zipTool) {
  rmSync(outputZip, {
    force: true,
  })

  if (zipTool === "zip") {
    if (mode === "contents") {
      zipWithNativeZip(
        sourceDir,
        outputZip,
        ["."],
      )
    } else {
      const parentDir = path.dirname(sourceDir)
      const folderName = path.basename(sourceDir)

      zipWithNativeZip(
        parentDir,
        outputZip,
        [folderName],
      )
    }

    return
  }

  if (zipTool === "powershell") {
    zipWithPowerShell(
      sourceDir,
      outputZip,
      mode,
    )

    return
  }

  throw new Error(`ZIP tool tidak dikenal: ${zipTool}`)
}

function runNodeScript(script, args = [], options = {}) {
  const npmCli = process.env.npm_execpath

  if (!npmCli) {
    throw new Error(
      "npm_execpath tidak tersedia. Jalankan script melalui npm.",
    )
  }

  console.log(`$ node ${npmCli} ${args.join(" ")}`)

  execFileSync(
    process.execPath,
    [npmCli, ...args],
    {
      stdio: "inherit",
      ...options,
    },
  )
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

  const zipTool = ensureZipAvailable()

  console.log(`ZIP tool: ${zipTool}`)
  console.log("")

  if (!skipBuild) {
    console.log("== Building (npm run build) ==")

    runNodeScript(
      "npm",
      ["run", "build"],
    )

    console.log("")
  } else {
    console.log("== Skip build, menggunakan hasil .next sebelumnya ==")
    console.log("")
  }

  if (!existsSync(standaloneDir)) {
    console.error(
      `Tidak ketemu:\n${standaloneDir}\n\n` +
      'Pastikan build berhasil dan `output: "standalone"` aktif di next.config.',
    )

    process.exit(1)
  }

  if (!existsSync(staticDir)) {
    console.error(
      `Tidak ketemu:\n${staticDir}\n\n` +
      "Build sepertinya belum menghasilkan aset static.",
    )

    process.exit(1)
  }

  rmSync(deployDir, {
    recursive: true,
    force: true,
  })

  mkdirSync(deployDir, {
    recursive: true,
  })

  console.log("== Creating standalone.zip ==")

  createZip(
    standaloneDir,
    standaloneZip,
    "contents",
    zipTool,
  )

  console.log("")
  console.log("== Creating static.zip ==")

  createZip(
    staticDir,
    staticZip,
    "folder",
    zipTool,
  )

  console.log("")
  console.log("========================================")
  console.log(" Deployment bundle selesai")
  console.log("========================================")
  console.log("")
  console.log(`Standalone : ${path.relative(root, standaloneZip)}`)
  console.log(`Static     : ${path.relative(root, staticZip)}`)
  console.log("")

  console.log("File siap di-upload ke cPanel.")
  console.log("")
  console.log("Di cPanel/Linux:")
  console.log("  unzip -o standalone.zip -d .")
  console.log("  unzip -o static.zip -d .next")
  console.log("")
  console.log("Setelah itu restart Node.js App dari cPanel.")
}

main()