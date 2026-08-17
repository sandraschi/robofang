# Per-repo fleet start config for robofang
# Edit ports/backend target here - start.ps1 is fleet-standard.
@{
    Name         = 'robofang'
    BackendPort  = 10870
    FrontendPort = 10870
    HealthPath   = '/health'
    WebRoot      = 'D:\Dev\repos\robofang\robofang-hub'
    Backend = @{
        Kind          = 'uvicorn'
        UvicornTarget = 'robofang.main:app'
        SyncExtras    = @('dev')
        Env           = @{ WEB_PORT = '10870' }
    }
    Frontend = @{
        Kind           = 'vite-npm'
        PackageManager = 'npm'
        PortEnvVar     = 'VITE_PORT'
        ApiTargetEnv   = 'VITE_API_TARGET'
    }
}
