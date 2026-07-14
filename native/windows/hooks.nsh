; Kill UI + backend before install/uninstall (backend locks resources/*.exe).
!macro KillRobofangFleetProcesses
  DetailPrint "Stopping robofang processes..."
  ExecWait 'taskkill /F /IM robofang-backend.exe /T' $0
  ExecWait 'taskkill /F /IM robofang-native.exe /T' $0
  !if "${INSTALLMODE}" == "currentUser"
    nsis_tauri_utils::KillProcessCurrentUser "robofang-backend.exe"
    Pop $0
    nsis_tauri_utils::KillProcessCurrentUser "robofang-native.exe"
    Pop $0
  !else
    nsis_tauri_utils::KillProcess "robofang-backend.exe"
    Pop $0
    nsis_tauri_utils::KillProcess "robofang-native.exe"
    Pop $0
  !endif
  Sleep 2000
!macroend

!macro NSIS_HOOK_PREINSTALL
  !insertmacro KillRobofangFleetProcesses
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  !insertmacro KillRobofangFleetProcesses
!macroend

!macro NSIS_HOOK_POSTINSTALL
  IfFileExists "$INSTDIR\resources\install-mcp-clients.ps1" 0 mcp_hook_done
    DetailPrint "Optional: register robofang in Cursor / Claude Desktop"
    ExecWait 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\resources\install-mcp-clients.ps1" -Interactive'
  mcp_hook_done:
!macroend