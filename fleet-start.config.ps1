# Per-repo fleet start config for robofang
# Edit ports/backend target here - start.ps1 is fleet-standard.
@{
    Name         = 'robofang'
    BackendPort  = 10871
    FrontendPort = 10870
    HealthPath   = '/health'
    WebRoot      = 'robofang-hub'
    Backend = @{
        Kind          = 'uvicorn'
        UvicornTarget = 'robofang.app.lifecycle:app'
        WorkDir       = '.'
        SyncExtras    = @('dev')
        Env           = @{ WEB_PORT = '10871' }
    }
    Frontend = @{
        Kind           = 'vite-npm'
        PackageManager = 'npm'
        PortEnvVar     = 'VITE_PORT'
        ApiTargetEnv   = 'VITE_API_TARGET'
    }
}
