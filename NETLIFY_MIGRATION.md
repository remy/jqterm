# Netlify Migration

This project has been refactored to support deployment on Netlify Functions.

## Key Changes

### Architecture
- Converted Express server to Netlify Functions
- API endpoints are now handled by `netlify/functions/api.js`
- Static files are served directly by Netlify from the `public` directory

### WASM Support
The jq WASM module continues to work in Netlify Functions because:
- The WASM virtual filesystem (`Module.FS`) is in-memory, not OS filesystem
- Files written via `Module.FS.writeFile()` exist only in the WASM runtime
- The lib has been updated to initialize the WASM module properly for serverless

### New Files
- `netlify.toml` - Netlify configuration
- `netlify/functions/api.js` - Main API handler
- `lib/jq-node-netlify.js` - Updated WASM wrapper for Netlify
- `lib/index-netlify.js` - Updated lib exports for Netlify

### Environment Variables
Set these in Netlify dashboard under Site settings > Environment variables:
- `USER` - GitHub username for Gist API
- `TOKEN` - GitHub personal access token
- `API` - Your Netlify function URL (e.g., `https://yoursite.netlify.app`)

### Deployment
The project can be deployed to Netlify by:
1. Connecting your GitHub repository to Netlify
2. Setting the environment variables in Netlify dashboard
3. Netlify will automatically build and deploy using the settings in `netlify.toml`

### Local Development
For local testing with Netlify Functions:
```bash
npm install -g netlify-cli
netlify dev
```

## Backwards Compatibility
The original `server.js` remains unchanged and can still be used for local development:
```bash
npm start
```
