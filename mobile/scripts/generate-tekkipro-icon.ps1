param(
  [string]$OutputDir = "assets"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName PresentationCore, WindowsBase

function New-ColorBrush([byte]$r, [byte]$g, [byte]$b, [byte]$a = 255) {
  $brush = New-Object System.Windows.Media.SolidColorBrush([
    System.Windows.Media.Color]::FromArgb($a, $r, $g, $b))
  $brush.Freeze()
  return $brush
}

function Save-Png($Path, [int]$Size, [scriptblock]$DrawAction) {
  $visual = New-Object System.Windows.Media.DrawingVisual
  $context = $visual.RenderOpen()
  & $DrawAction $context $Size
  $context.Close()

  $bitmap = New-Object System.Windows.Media.Imaging.RenderTargetBitmap(
    $Size, $Size, 96, 96, [System.Windows.Media.PixelFormats]::Pbgra32
  )
  $bitmap.Render($visual)

  $encoder = New-Object System.Windows.Media.Imaging.PngBitmapEncoder
  $encoder.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($bitmap))

  $stream = [System.IO.File]::Open($Path, [System.IO.FileMode]::Create)
  try {
    $encoder.Save($stream)
  } finally {
    $stream.Dispose()
  }
}

function New-Monogram([string]$Text, [double]$FontSize, $Brush) {
  $typeface = New-Object System.Windows.Media.Typeface('Segoe UI Semibold')
  return New-Object System.Windows.Media.FormattedText -ArgumentList @(
    $Text,
    [System.Globalization.CultureInfo]::InvariantCulture,
    [System.Windows.FlowDirection]::LeftToRight,
    $typeface,
    $FontSize,
    $Brush,
    1.0
  )
}

$assetsPath = Join-Path (Join-Path $PSScriptRoot '..') $OutputDir
$assetsPath = [System.IO.Path]::GetFullPath($assetsPath)
if (-not (Test-Path $assetsPath)) {
  New-Item -ItemType Directory -Path $assetsPath | Out-Null
}

$blueA = [System.Windows.Media.Color]::FromRgb(29, 78, 216)
$blueB = [System.Windows.Media.Color]::FromRgb(37, 99, 235)
$white = New-ColorBrush 255 255 255
$black = New-ColorBrush 17 24 39
$softHighlight = New-ColorBrush 255 255 255 36

$gradient = New-Object System.Windows.Media.LinearGradientBrush($blueA, $blueB, 45)
$gradient.Freeze()

$drawIcon = {
  param($dc, $size)
  $radius = [double]($size * 0.22)
  $rect = New-Object System.Windows.Rect -ArgumentList 0, 0, $size, $size
  $dc.DrawRoundedRectangle($gradient, $null, $rect, $radius, $radius)

  $dc.DrawEllipse($softHighlight, $null, (New-Object System.Windows.Point -ArgumentList ($size * 0.38), ($size * 0.32)), ($size * 0.28), ($size * 0.28))
  $dc.DrawEllipse($softHighlight, $null, (New-Object System.Windows.Point -ArgumentList ($size * 0.70), ($size * 0.63)), ($size * 0.14), ($size * 0.14))

  $text = New-Monogram 'TP' ($size * 0.40) $white
  $point = New-Object System.Windows.Point -ArgumentList ((($size - $text.Width) / 2), ((($size - $text.Height) / 2) - ($size * 0.03)))
  $dc.DrawText($text, $point)
}

$drawForeground = {
  param($dc, $size)
  $text = New-Monogram 'TP' ($size * 0.42) $white
  $point = New-Object System.Windows.Point -ArgumentList ((($size - $text.Width) / 2), ((($size - $text.Height) / 2) - ($size * 0.03)))
  $dc.DrawText($text, $point)
}

$drawMonochrome = {
  param($dc, $size)
  $text = New-Monogram 'TP' ($size * 0.42) $black
  $point = New-Object System.Windows.Point -ArgumentList ((($size - $text.Width) / 2), ((($size - $text.Height) / 2) - ($size * 0.03)))
  $dc.DrawText($text, $point)
}

Save-Png (Join-Path $assetsPath 'icon.png') 1024 $drawIcon
Save-Png (Join-Path $assetsPath 'android-icon-foreground.png') 1024 $drawForeground
Save-Png (Join-Path $assetsPath 'android-icon-monochrome.png') 1024 $drawMonochrome

Write-Output "Generated icon assets in $assetsPath"
