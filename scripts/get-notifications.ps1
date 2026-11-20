# Windows Toast Notifications Collector via WinRT UserNotificationListener
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { 
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' 
}

try {
    [Windows.UI.Notifications.Management.UserNotificationListener, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
    $listener = [Windows.UI.Notifications.Management.UserNotificationListener]::Current
    $asTask = $asTaskGeneric[0].MakeGenericMethod([Windows.UI.Notifications.Management.UserNotificationListenerAccessStatus])
    $status = $asTask.Invoke($null, @($listener.RequestAccessAsync())).GetAwaiter().GetResult()
    
    if ($status -eq "Allowed") {
        $getNotifsTask = $asTaskGeneric[0].MakeGenericMethod([System.Collections.Generic.IReadOnlyList[Windows.UI.Notifications.UserNotification]])
        $notifs = $getNotifsTask.Invoke($null, @($listener.GetNotificationsAsync([Windows.UI.Notifications.NotificationKinds]::Toast))).GetAwaiter().GetResult()
        
        $list = @()
        foreach ($n in $notifs) {
            $app = $n.AppInfo.DisplayInfo.DisplayName
            $time = $n.CreationTime.ToUnixTimeMilliseconds()
            $id = $n.Id
            $bindings = $n.Notification.Visual.GetBinding([Windows.UI.Notifications.KnownNotificationBindings]::ToastGeneric)
            $title = ""
            $body = ""
            if ($bindings) {
                $texts = $bindings.GetTextElements() | ForEach-Object { $_.Text }
                if ($texts.Count -gt 0) { $title = $texts[0] }
                if ($texts.Count -gt 1) { $body = ($texts[1..($texts.Count - 1)] -join " ") }
            }
            if ($title -or $body) {
                $list += [PSCustomObject]@{
                    id = $id
                    app = $app
                    title = $title
                    body = $body
                    time = $time
                }
            }
        }
        $list | ConvertTo-Json -Compress
    } else {
        Write-Output "[]"
    }
} catch {
    Write-Output "[]"
}
