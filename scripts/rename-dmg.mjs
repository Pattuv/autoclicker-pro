import { readdirSync, renameSync } from "node:fs"
import { join } from "node:path"

const dir = "src-tauri/target/release/bundle/dmg"

for (const file of readdirSync(dir)) {
  const next = file.replace(/_(aarch64|x64|universal)(?=\.dmg$)/, "")
  if (next !== file) renameSync(join(dir, file), join(dir, next))
}
