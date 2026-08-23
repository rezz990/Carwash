export type UserAgentInfo = {
  deviceType: "Desktop" | "Mobile" | "Tablet" | "Bot" | "Tidak diketahui"
  device: string
  operatingSystem: string
  browser: string
}

function version(value: string | undefined) {
  return value?.replaceAll("_", ".") ?? ""
}

export function parseUserAgent(userAgent: string | null): UserAgentInfo {
  if (!userAgent) {
    return {
      deviceType: "Tidak diketahui",
      device: "Tidak tersedia",
      operatingSystem: "Tidak tersedia",
      browser: "Tidak tersedia",
    }
  }

  const isBot = /bot|crawler|spider|slurp|headless/i.test(userAgent)
  const isTablet = /iPad|Tablet|PlayBook|Silk/i.test(userAgent) || (/Android/i.test(userAgent) && !/Mobile/i.test(userAgent))
  const isMobile = /Mobile|iPhone|iPod|Android|IEMobile|Windows Phone/i.test(userAgent)
  const deviceType = isBot ? "Bot" : isTablet ? "Tablet" : isMobile ? "Mobile" : "Desktop"

  let device = deviceType === "Desktop" ? "Komputer" : "Perangkat tidak dikenali"
  if (/iPad/i.test(userAgent)) device = "Apple iPad"
  else if (/iPhone/i.test(userAgent)) device = "Apple iPhone"
  else if (/iPod/i.test(userAgent)) device = "Apple iPod"
  else if (/Windows Phone/i.test(userAgent)) device = "Windows Phone"
  else if (/Android/i.test(userAgent)) {
    const model = userAgent.match(/Android[^;)]*;\s*(?:[a-z]{2}(?:-[A-Z]{2})?;\s*)?([^;)]+?)(?:\s+Build\/[^;)]*)?[;)]/i)?.[1]?.trim()
    device = model && !/^wv$/i.test(model) ? model : "Perangkat Android"
  } else if (/Macintosh/i.test(userAgent)) device = "Apple Mac"
  else if (/CrOS/i.test(userAgent)) device = "Chromebook"
  else if (/Linux/i.test(userAgent)) device = "Komputer Linux"
  else if (/Windows/i.test(userAgent)) device = "Komputer Windows"

  let operatingSystem = "Tidak dikenali"
  const android = userAgent.match(/Android\s+([\d.]+)/i)
  const ios = userAgent.match(/(?:CPU (?:iPhone )?OS|iPhone OS)\s+([\d_]+)/i)
  const mac = userAgent.match(/Mac OS X\s+([\d_]+)/i)
  if (android) operatingSystem = `Android ${android[1]}`
  else if (ios) operatingSystem = `iOS ${version(ios[1])}`
  else if (/Windows NT 10\.0/i.test(userAgent)) operatingSystem = "Windows 10/11"
  else if (/Windows NT 6\.3/i.test(userAgent)) operatingSystem = "Windows 8.1"
  else if (/Windows NT 6\.1/i.test(userAgent)) operatingSystem = "Windows 7"
  else if (mac) operatingSystem = `macOS ${version(mac[1])}`
  else if (/CrOS/i.test(userAgent)) operatingSystem = "ChromeOS"
  else if (/Linux/i.test(userAgent)) operatingSystem = "Linux"

  let browser = "Tidak dikenali"
  const browserMatchers: Array<[RegExp, string]> = [
    [/SamsungBrowser\/([\d.]+)/i, "Samsung Internet"],
    [/EdgA?\/([\d.]+)/i, "Microsoft Edge"],
    [/(?:OPR|Opera)\/([\d.]+)/i, "Opera"],
    [/CriOS\/([\d.]+)/i, "Google Chrome"],
    [/Chrome\/([\d.]+)/i, "Google Chrome"],
    [/FxiOS\/([\d.]+)/i, "Mozilla Firefox"],
    [/Firefox\/([\d.]+)/i, "Mozilla Firefox"],
    [/Version\/([\d.]+).*Safari\//i, "Safari"],
    [/okhttp\/([\d.]+)/i, "Aplikasi Android (okhttp)"],
    [/PostmanRuntime\/([\d.]+)/i, "Postman"],
    [/curl\/([\d.]+)/i, "cURL"],
  ]
  for (const [pattern, name] of browserMatchers) {
    const match = userAgent.match(pattern)
    if (match) {
      browser = `${name} ${match[1]}`
      break
    }
  }

  return { deviceType, device, operatingSystem, browser }
}
