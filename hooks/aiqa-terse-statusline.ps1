[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ClaudeDir = if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { Join-Path $HOME ".claude" }
$Flag = Join-Path $ClaudeDir ".aiqa-terse-active"

if (-not (Test-Path $Flag)) { exit 0 }

# Security: refuse reparse points (symlinks/junctions) and oversized files
try {
    $Item = Get-Item -LiteralPath $Flag -Force -ErrorAction Stop
    if ($Item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) { exit 0 }
    if ($Item.Length -gt 64) { exit 0 }
} catch { exit 0 }

$Mode = ""
try {
    $Raw = Get-Content -LiteralPath $Flag -TotalCount 1 -ErrorAction Stop
    if ($null -ne $Raw) { $Mode = ([string]$Raw).Trim() }
} catch { exit 0 }

# Strip anything outside [a-z0-9-] to block terminal-escape injection
$Mode = $Mode.ToLowerInvariant()
$Mode = ($Mode -replace '[^a-z0-9-]', '')

$Valid = @('off', 'lite', 'full', 'ultra')
if (-not ($Valid -contains $Mode) -or $Mode -eq 'off') { exit 0 }

$Esc = [char]27
$Label = if ($Mode -eq 'full') { 'AIQA' } else { "AIQA:$($Mode.ToUpperInvariant())" }
[Console]::Write("${Esc}[38;5;172m[$Label]${Esc}[0m")

# Savings suffix (opt-out: AIQA_STATUSLINE_SAVINGS=0)
if ($env:AIQA_STATUSLINE_SAVINGS -ne "0") {
    $SuffixFile = Join-Path $ClaudeDir ".aiqa-terse-statusline-suffix"
    if (Test-Path $SuffixFile) {
        try {
            $SuffixItem = Get-Item -LiteralPath $SuffixFile -Force -ErrorAction Stop
            if (-not ($SuffixItem.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -and
                $SuffixItem.Length -le 64) {
                $Suffix = (Get-Content -LiteralPath $SuffixFile -Encoding UTF8 -Raw -ErrorAction Stop).TrimEnd()
                # Strip control characters
                $Suffix = ($Suffix -replace '[\x00-\x1F]', '')
                if ($Suffix.Length -gt 0) {
                    [Console]::Write(" ${Esc}[38;5;172m$Suffix${Esc}[0m")
                }
            }
        } catch {}
    }
}
