$ErrorActionPreference = "Stop"

$repoDir = "C:\Users\user\Desktop\WEB TEST"
$origin = "https://github.com/harryhsu0203/kaichuan-shop-web.git"
$renderApi = "https://kaichuan-api.onrender.com"     # Render API
$adminToken = "your-admin-token"          # 後台登入用 token

Set-Location $repoDir

# 1) 改前後端 API 位置
(Get-Content ".\app.js") -replace 'const API_BASE = "http://localhost:4000";', "const API_BASE = `"$renderApi`";" | Set-Content ".\app.js"
(Get-Content ".\admin.js") -replace 'const API_BASE = "http://localhost:4000";', "const API_BASE = `"$renderApi`";" | Set-Content ".\admin.js"

# 2) 產生 render.yaml（同一 repo 兩個服務）
$renderYaml = @"
services:
  - type: web
    name: kaichuan-api
    env: node
    rootDir: server
    buildCommand: "npm install"
    startCommand: "npm start"
    envVars:
      - key: ADMIN_TOKEN
        value: $adminToken
      - key: DB_PATH
        value: ./data.db

  - type: web
    name: kaichuan-web
    env: static
    rootDir: .
    buildCommand: ""
    staticPublishPath: .
"@
$renderYaml | Set-Content ".\render.yaml" -Encoding UTF8

# 3) 初始化 git + 推送
if (-not (Test-Path ".git")) { git init }
# 設定本地 git 身分（避免無法提交）
git config user.name "Kaichuan Tech"
git config user.email "admin@kaichuan.com"
git add .
git commit -m "deploy kaichuan shop" --allow-empty
$remotes = git remote 2>$null
if ($remotes -match "^origin$") { git remote remove origin }
git remote add origin $origin
git branch -M main
git push -u origin main

Write-Host "Push completed. Go to Render and deploy this repo."

