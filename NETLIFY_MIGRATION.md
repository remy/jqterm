# Netlify Migration

This project has been refactored to support deployment on Netlify Functions while maintaining backwards compatibility with the original Express server.

## Key Changes

### Architecture
- **Netlify Functions**: API endpoints are now handled by `netlify/functions/api.js`
- **Static files**: Served directly by Netlify from the `public` directory
- **Backwards compatible**: Original `server.js` remains unchanged and functional

### WASM Support
The jq WASM module works seamlessly in Netlify Functions because:
- The WASM virtual filesystem (`Module.FS`) operates entirely in-memory, not on the OS filesystem
- Files written via `Module.FS.writeFile()` exist only within the WASM runtime environment
- The implementation has been updated with proper async initialization for serverless environments

### File Structure

#### New Files
- `netlify.toml` - Netlify build configuration and routing rules
- `netlify/functions/api.js` - Serverless function handler for all API endpoints
- `lib/jq-node-netlify.js` - Async WASM wrapper optimized for Netlify Functions
- `lib/index-netlify.js` - Serverless-compatible lib exports with async operations

#### Original Files (Unchanged)
- `server.js` - Original Express server (still functional)
- `lib/index.js` - Original lib exports
- `lib/jq-node.js` - Original WASM wrapper
- All other application files

### API Endpoints
The Netlify function handles all the same endpoints as the Express server:
- `GET /:id.json` - Retrieve gist data by ID
- `POST /` - Create new gist
- `POST /:id` - Update existing gist
- `PUT /:id?` - Execute jq query (supports method override via `?_method=PUT`)
- `GET /config.js` - Dynamic configuration endpoint

### Environment Variables
Configure these in the Netlify dashboard (Site settings > Environment variables):
- `USER` - GitHub username for Gist API authentication
- `TOKEN` - GitHub personal access token
- `API` - Your Netlify deployment URL (e.g., `https://yoursite.netlify.app`)

### Deployment to Netlify

1. **Connect Repository**: Link your GitHub repository to Netlify
2. **Set Environment Variables**: Configure `USER`, `TOKEN`, and `API` in Netlify dashboard
3. **Deploy**: Netlify automatically builds and deploys using `netlify.toml` configuration

The build command (`npm run build`) and publish directory (`public`) are configured in `netlify.toml`.

### Local Development

#### Using Netlify CLI (Recommended for testing Netlify Functions):
```bash
npm install -g netlify-cli
netlify dev
```

This runs the Netlify Functions locally with the same environment as production.

#### Using Express Server (Original method):
```bash
npm start
# or
npm run dev
```

This runs the original Express server on port 3000 (or `PORT` env variable).

### Technical Details

#### WASM Initialization
The Netlify version uses async initialization to ensure the WASM runtime is ready before processing requests:
```javascript
await initializeModule(); // Waits for Module.onRuntimeInitialized
```

#### Routing
Netlify redirects are configured to route API calls to the function while serving static assets directly:
- `/config.js` → Function handler
- `/:id.json` → Function handler  
- `/:id` (POST/PUT) → Function handler
- `/*` → Static files or SPA fallback to `/index.html`

#### CORS
The function handler includes CORS headers to allow cross-origin requests and supports OPTIONS preflight requests.

## Migration Benefits

1. **Serverless**: No server management, automatic scaling
2. **Performance**: CDN distribution for static assets
3. **Cost**: Pay only for function execution time
4. **Backwards Compatible**: Original Express server still works for local development
5. **WASM Support**: Properly handles WebAssembly in serverless environment

## Troubleshooting

### WASM Module Issues
If you encounter WASM-related errors:
- Ensure the WASM file exists at `public/vendor/jq/jq.wasm`
- Verify the jq.js file exists at `public/vendor/jq/jq.js`
- Check that the function has sufficient memory (default Netlify limits should be fine)

### Environment Variables
If API calls fail:
- Verify `USER` and `TOKEN` are set in Netlify dashboard
- Ensure `API` points to your Netlify deployment URL
- Check Netlify function logs for detailed error messages

### Build Errors
If the build fails:
- Check Node.js version matches `engines.node` in package.json
- Verify all dependencies install successfully
- Review Netlify build logs for specific errors
