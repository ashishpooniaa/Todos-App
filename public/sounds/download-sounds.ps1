# Download alarm sounds
$sounds = @{
    "gentle-alarm.mp3" = "https://assets.mixkit.co/active_storage/sfx/2566/2566-preview.mp3"
    "classic-alarm.mp3" = "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3"
    "digital-alarm.mp3" = "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3"
    "nature-alarm.mp3" = "https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3"
}

foreach ($sound in $sounds.GetEnumerator()) {
    Write-Host "Downloading $($sound.Key)..."
    Invoke-WebRequest -Uri $sound.Value -OutFile $sound.Key
}

Write-Host "All sounds downloaded successfully!" 