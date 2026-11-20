Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "E:\Notch"
WshShell.Run "node_modules\.bin\electron.cmd .", 0, False
