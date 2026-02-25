$utf8NoBom = [System.Text.UTF8Encoding]::new($false)

try {
    chcp 65001 > $null
} catch {
    # Ignore if chcp is unavailable in this host.
}

[Console]::InputEncoding = $utf8NoBom
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding = $utf8NoBom

# Make common file-write cmdlets default to UTF-8.
$PSDefaultParameterValues["Out-File:Encoding"] = "utf8"
$PSDefaultParameterValues["Set-Content:Encoding"] = "utf8"
$PSDefaultParameterValues["Add-Content:Encoding"] = "utf8"

