param(
    [ValidateRange(5, 1440)][int]$IntervalMinutes = 5
)

$ErrorActionPreference = 'Stop'
$repo = Join-Path $PSScriptRoot '../..'
$branch = & git -C $repo branch --show-current
if ($LASTEXITCODE -ne 0 -or $branch -ne 'dev') {
    throw 'Lance ce script depuis une copie de travail sur la branche dev.'
}

$taskName = 'TekkiPro - Synchronisation dev'
$scriptPath = Join-Path $PSScriptRoot 'Sync-Dev.ps1'
$powershell = Join-Path $env:WINDIR 'System32/WindowsPowerShell/v1.0/powershell.exe'
$arguments = '-NoProfile -NonInteractive -WindowStyle Hidden -File "{0}" -Automatic' -f $scriptPath
$action = New-ScheduledTaskAction -Execute $powershell -Argument $arguments -WorkingDirectory $PSScriptRoot
$user = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
$repeat = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes)
$logon = New-ScheduledTaskTrigger -AtLogOn -User $user
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 15)

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger @($repeat, $logon) -Principal $principal -Settings $settings -Force | Out-Null
Write-Host "Synchronisation dev active toutes les $IntervalMinutes minutes pendant ta session Windows."
