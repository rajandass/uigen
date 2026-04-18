# UIGen — Azure Deployment Guide

Step-by-step instructions for deploying UIGen to Azure App Service manually.

---

## Prerequisites

Make sure you have these tools installed:
- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) — `az`
- [Node.js 20 LTS](https://nodejs.org/)
- [Git](https://git-scm.com/)

---

## Step 1 — Log in to Azure

```bash
az login
```

A browser window will open. Sign in with your Azure account.

Set the subscription you want to use (skip if you only have one):

```bash
az account list --output table
az account set --subscription "YOUR_SUBSCRIPTION_NAME_OR_ID"
```

---

## Step 2 — Create a Resource Group

All Azure resources for this project go inside one resource group.

```bash
az group create \
  --name uigen-rg \
  --location eastus
```

> You can replace `eastus` with a region closer to you. Run `az account list-locations -o table` to see all options.

---

## Step 3 — Create a PostgreSQL Database

UIGen uses PostgreSQL in production (SQLite only works locally).

```bash
az postgres flexible-server create \
  --resource-group uigen-rg \
  --name uigen-db-server \
  --location eastus \
  --admin-user dbadmin \
  --admin-password "CHANGE_ME_STRONG_PASSWORD" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 16 \
  --storage-size 32 \
  --yes
```

This takes 3–5 minutes. When done, create the database:

```bash
az postgres flexible-server db create \
  --resource-group uigen-rg \
  --server-name uigen-db-server \
  --database-name uigen
```

Allow Azure services to connect to the database:

```bash
az postgres flexible-server firewall-rule create \
  --resource-group uigen-rg \
  --name uigen-db-server \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

Your `DATABASE_URL` will be:
```
postgresql://dbadmin:CHANGE_ME_STRONG_PASSWORD@uigen-db-server.postgres.database.azure.com:5432/uigen?sslmode=require
```

Keep this — you'll need it in Step 5.

---

## Step 4 — Create an App Service Plan and Web App

Create the App Service Plan (the server that runs your app):

```bash
az appservice plan create \
  --resource-group uigen-rg \
  --name uigen-plan \
  --sku B2 \
  --is-linux
```

Create the Web App (Node.js 20):

```bash
az webapp create \
  --resource-group uigen-rg \
  --plan uigen-plan \
  --name uigen-app \
  --runtime "NODE:20-lts"
```

> The `--name` must be globally unique on Azure. If `uigen-app` is taken, try `uigen-app-yourname`.

Your app will be live at: `https://uigen-app.azurewebsites.net`

---

## Step 5 — Set Environment Variables

Set all required environment variables on the App Service:

```bash
# Generate a strong JWT secret (run this locally and copy the output)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Set all env vars in Azure (replace values with your own)
az webapp config appsettings set \
  --resource-group uigen-rg \
  --name uigen-app \
  --settings \
    NODE_ENV="production" \
    JWT_SECRET="PASTE_YOUR_GENERATED_SECRET_HERE" \
    DATABASE_URL="postgresql://dbadmin:CHANGE_ME_STRONG_PASSWORD@uigen-db-server.postgres.database.azure.com:5432/uigen?sslmode=require" \
    ANTHROPIC_API_KEY="sk-ant-YOUR_KEY_HERE" \
    WEBSITE_RUN_FROM_PACKAGE="1"
```

Set the startup command so Azure runs the standalone Next.js server:

```bash
az webapp config set \
  --resource-group uigen-rg \
  --name uigen-app \
  --startup-file "node server.js"
```

---

## Step 6 — Set Up GitHub Actions for CI/CD

### 6a — Connect your GitHub repo to Azure

Download the publish profile (used by GitHub Actions to authenticate):

```bash
az webapp deployment list-publishing-profiles \
  --resource-group uigen-rg \
  --name uigen-app \
  --xml > publish-profile.xml
```

Open `publish-profile.xml`, copy **the entire contents**.

### 6b — Add the secret to GitHub

1. Go to your GitHub repo: https://github.com/rajandass/uigen
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `AZURE_WEBAPP_PUBLISH_PROFILE`
5. Value: paste the entire contents of `publish-profile.xml`
6. Click **Add secret**

Delete the local file after:
```bash
rm publish-profile.xml
```

### 6c — Update the workflow file

Open `.github/workflows/azure.yml` and confirm this line matches your App Service name:

```yaml
AZURE_WEBAPP_NAME: uigen-app   # must match the --name from Step 4
```

---

## Step 7 — Run Database Migrations

Before the app can start, the PostgreSQL database needs the schema applied.

You can do this from your local machine (make sure you have PostgreSQL access from your IP):

```bash
# Allow your local IP to connect to the database
az postgres flexible-server firewall-rule create \
  --resource-group uigen-rg \
  --name uigen-db-server \
  --rule-name AllowLocalMachine \
  --start-ip-address YOUR_LOCAL_IP \
  --end-ip-address YOUR_LOCAL_IP

# Run migrations (from the project root)
DATABASE_URL="postgresql://dbadmin:CHANGE_ME_STRONG_PASSWORD@uigen-db-server.postgres.database.azure.com:5432/uigen?sslmode=require" \
  npx prisma migrate deploy
```

> Find your local IP: run `curl ifconfig.me` in a terminal.

---

## Step 8 — Push Code and Deploy

Push to `main` to trigger the GitHub Actions deployment:

```bash
git push origin main
```

Watch the deployment:
1. Go to https://github.com/rajandass/uigen/actions
2. Click the running workflow to see progress
3. When it shows a green checkmark, the deployment is complete

Visit your app at: `https://uigen-app.azurewebsites.net`

---

## Step 9 — Verify Everything Works

Test these things after deployment:

1. **App loads** — open `https://uigen-app.azurewebsites.net` in a browser
2. **Sign up** — create a new account
3. **Sign in** — log in with the same account
4. **Generate a component** — type a prompt, confirm the preview renders
5. **Persistence** — refresh the page, confirm your project is still there
6. **Auth protection** — open `https://uigen-app.azurewebsites.net/api/chat` in a browser — should return `401 Unauthorized`

---

## Troubleshooting

### App won't start

Check the logs:
```bash
az webapp log tail \
  --resource-group uigen-rg \
  --name uigen-app
```

### Database connection error

- Check `DATABASE_URL` is set correctly (Step 5)
- Check firewall rules allow Azure services (Step 3)
- Confirm `prisma migrate deploy` ran successfully (Step 7)

### JWT errors / can't log in

- Check `JWT_SECRET` is set (Step 5)
- It must be the same value every time — don't regenerate it after users have signed up

### GitHub Actions build fails

- Check the Actions tab for the error message
- The most common cause is a missing `AZURE_WEBAPP_PUBLISH_PROFILE` secret (Step 6)

---

## Cost Estimate (per month)

| Resource | SKU | Approx. cost |
|----------|-----|-------------|
| App Service Plan B2 | Linux | ~$30/mo |
| PostgreSQL Flexible Server B1ms | Burstable | ~$15/mo |
| **Total** | | **~$45/mo** |

To reduce cost during development: scale down to B1 App Service Plan (~$13/mo).

---

## Useful Commands

```bash
# View app logs live
az webapp log tail --resource-group uigen-rg --name uigen-app

# Restart the app
az webapp restart --resource-group uigen-rg --name uigen-app

# SSH into the app container
az webapp ssh --resource-group uigen-rg --name uigen-app

# Stop/start the app
az webapp stop --resource-group uigen-rg --name uigen-app
az webapp start --resource-group uigen-rg --name uigen-app

# Delete everything (destructive!)
az group delete --name uigen-rg --yes
```
