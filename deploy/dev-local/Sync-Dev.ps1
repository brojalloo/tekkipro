param([switch]$Build, [switch]$Automatic)

if ($Build -and $Automatic) { throw 'Choisis Build ou Automatic.' }

$ErrorActionPreference = 'Stop'
$context = 'desktop-linux'
$compose = Join-Path $PSScriptRoot 'compose.yaml'
$envFile = Join-Path $PSScriptRoot '.env'

function Invoke-Docker {
    & docker --context $context @args
    if ($LASTEXITCODE -ne 0) {
        throw "Docker a echoue (code $LASTEXITCODE)."
    }
}

if ($Automatic) {
    $repo = Join-Path $PSScriptRoot '../..'
    $branch = & git -C $repo branch --show-current
    if ($LASTEXITCODE -ne 0) { throw 'Impossible de lire la branche Git.' }
    if ($branch -ne 'dev') { return }

    # Docker Desktop can be unavailable while Windows or the session starts.
    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & docker --context $context info --format '{{.OSType}}' 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) { return }
    } finally {
        $ErrorActionPreference = $previousPreference
    }
} else {
    Invoke-Docker info --format '{{.OSType}}' | Out-Null
}

if (-not (Test-Path -LiteralPath $envFile)) {
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $rng.GetBytes($bytes)
    } finally {
        $rng.Dispose()
    }
    $value = '' + [Convert]::ToBase64String($bytes)
    $stream = [System.IO.File]::Open($envFile, [System.IO.FileMode]::CreateNew)
    try {
        $writer = New-Object System.IO.StreamWriter($stream)
        try {
            $writer.WriteLine("TEKKIPRO_JWT_SECRET=$value")
        } finally {
            $writer.Dispose()
        }
    } finally {
        $stream.Dispose()
    }
}

$composeArgs = @('compose', '--env-file', $envFile, '-f', $compose)
$previousImage = $env:DEV_IMAGE
$previousBackendImage = $env:DEV_BACKEND_IMAGE
try {
    if ($Build) {
        $env:DEV_IMAGE = 'tekkipro-web-dev-local:local'
        $env:DEV_BACKEND_IMAGE = 'tekkipro-api-dev:local'
        Invoke-Docker @composeArgs up --build --wait --wait-timeout 180
    } else {
        $repository = 'ghcr.io/brojalloo/tekkipro-web-dev-local'
        Invoke-Docker pull "${repository}:dev"
        $image = Invoke-Docker image inspect "${repository}:dev" --format '{{index .RepoDigests 0}}'
        if ($image -notlike "$repository@sha256:*") {
            throw "Empreinte de l'image introuvable pour $repository."
        }
        $env:DEV_IMAGE = $image
        $labels = Invoke-Docker image inspect $image --format '{{json .Config.Labels}}' | ConvertFrom-Json
        $revision = $labels.'org.opencontainers.image.revision'
        if ($revision -notmatch '^[a-f0-9]{40}$') {
            throw "La revision de l'image TekkiPro est introuvable."
        }
        $backend = 'ghcr.io/brojalloo/tekkipro-api-dev'
        Invoke-Docker pull "${backend}:$revision"
        $backendImage = Invoke-Docker image inspect "${backend}:$revision" --format '{{index .RepoDigests 0}}'
        if ($backendImage -notlike "$backend@sha256:*") {
            throw "Empreinte de l'API TekkiPro introuvable."
        }
        $env:DEV_BACKEND_IMAGE = $backendImage
        Invoke-Docker @composeArgs up --no-build --pull missing --wait --wait-timeout 180
    }
} finally {
    $env:DEV_IMAGE = $previousImage
    $env:DEV_BACKEND_IMAGE = $previousBackendImage
}

Write-Host 'Application disponible sur http://127.0.0.1:8092'
