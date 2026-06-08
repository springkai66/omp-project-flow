param(
  [switch]$Force
)

$ErrorActionPreference = "Stop"

$pluginRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
$pkgPath = Join-Path $pluginRoot "package.json"
if (-not (Test-Path -LiteralPath $pkgPath)) {
  throw "package.json not found at $pkgPath"
}

$pkg = Get-Content -LiteralPath $pkgPath -Raw | ConvertFrom-Json
if (-not $pkg.name) {
  throw "package.json must have a name"
}

$pluginsRoot = Join-Path $env:USERPROFILE ".omp\plugins"
$nodeModules = Join-Path $pluginsRoot "node_modules"
$dest = Join-Path $nodeModules $pkg.name

New-Item -ItemType Directory -Force -Path $nodeModules | Out-Null

if (Test-Path -LiteralPath $dest) {
  if (-not $Force) {
    throw "Destination already exists: $dest. Re-run with -Force to replace it."
  }
  Remove-Item -LiteralPath $dest -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $dest | Out-Null
$exclude = @("node_modules", ".git", ".omp", "dist")
Get-ChildItem -LiteralPath $pluginRoot -Force | Where-Object {
  $exclude -notcontains $_.Name
} | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination $dest -Recurse -Force
}

$pluginsPkgPath = Join-Path $pluginsRoot "package.json"
if (Test-Path -LiteralPath $pluginsPkgPath) {
  $pluginsPkg = Get-Content -LiteralPath $pluginsPkgPath -Raw | ConvertFrom-Json
} else {
  $pluginsPkg = [PSCustomObject]@{
    name = "omp-plugins"
    private = $true
    dependencies = [PSCustomObject]@{}
  }
}
if (-not $pluginsPkg.dependencies) {
  $pluginsPkg | Add-Member -NotePropertyName dependencies -NotePropertyValue ([PSCustomObject]@{})
}
$pluginsPkg.dependencies | Add-Member -Force -NotePropertyName $pkg.name -NotePropertyValue ("file:node_modules/" + $pkg.name)
$pluginsPkg | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $pluginsPkgPath -Encoding UTF8

$lockPath = Join-Path $pluginsRoot "omp-plugins.lock.json"
if (Test-Path -LiteralPath $lockPath) {
  $lock = Get-Content -LiteralPath $lockPath -Raw | ConvertFrom-Json
} else {
  $lock = [PSCustomObject]@{
    plugins = [PSCustomObject]@{}
    settings = [PSCustomObject]@{}
  }
}
if (-not $lock.plugins) {
  $lock | Add-Member -NotePropertyName plugins -NotePropertyValue ([PSCustomObject]@{})
}
if (-not $lock.settings) {
  $lock | Add-Member -NotePropertyName settings -NotePropertyValue ([PSCustomObject]@{})
}
$lock.plugins | Add-Member -Force -NotePropertyName $pkg.name -NotePropertyValue ([PSCustomObject]@{
  version = $pkg.version
  enabledFeatures = $null
  enabled = $true
})
$lock | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $lockPath -Encoding UTF8

Write-Output "Installed $($pkg.name)@$($pkg.version) to $dest"
