# Cloudflare Pages Migration Guide

This guide will help you migrate from Vercel to Cloudflare Pages for better performance, cost efficiency, and SaaS-ready infrastructure.

## Why Migrate to Cloudflare Pages?

| Feature | Vercel | Cloudflare Pages |
|---------|--------|------------------|
| Cost | Free tier has limits | Generous free tier, $20/month Pro |
| Performance | US-focused | Global edge network |
| Web Application Firewall (WAF) | Not included | ✅ Included free |
| Custom domains | ✅ (subdomain) | ✅ Unlimited |
| Subdomains | Limited | ✅ Unlimited (tenant subdomains) |
| Database support | Requires serverless | ✅ Supabase integration |
| Edge Functions | ✅ | ✅ (Cloudflare Workers) |
| Support tier | Community | ✅ Priority for paid |

## Migration Steps

### Phase 1: Prepare Your Project (1-2 hours)

#### 1.1 Verify Build Configuration

Your current `vite.config.ts` should work as-is. Verify:

```ts
// vite.config.ts
export default {
  build: {
    target: 'esnext',
    outDir: 'dist',
    // Cloudflare Pages will serve from dist/
  }
}
```

#### 1.2 Create Wrangler Configuration

Create `wrangler.toml` in your project root:

```toml
name = "ems-tracker"
type = "javascript"
account_id = "YOUR_ACCOUNT_ID"
workers_dev = false

[env.production]
name = "ems-tracker-prod"
route = "app.ems-tracker.com/*"

[env.staging]
name = "ems-tracker-staging"
route = "staging.ems-tracker.com/*"

# Environment variables
[env.production.vars]
VITE_SUPABASE_URL = "https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY = "your-anon-key"
CUSTOM_DOMAIN = "app.ems-tracker.com"

[env.staging.vars]
VITE_SUPABASE_URL = "https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY = "your-anon-key"
CUSTOM_DOMAIN = "staging.ems-tracker.com"
```

#### 1.3 Update Package.json

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "wrangler pages dev dist",
    "deploy": "npm run build && wrangler pages deploy dist"
  },
  "devDependencies": {
    "wrangler": "^3.0.0"
  }
}
```

### Phase 2: Setup Cloudflare Account (30 minutes)

#### 2.1 Create Cloudflare Account

1. Go to [Cloudflare Sign Up](https://dash.cloudflare.com/sign-up)
2. Create account or login
3. Go to Pages section

#### 2.2 Link GitHub Repository

1. In Cloudflare Pages, click "Create a project"
2. Connect your GitHub repository (ems-crm)
3. Select the repository and main branch

#### 2.3 Configure Build Settings

In the deployment configuration:

```
Framework preset: None (custom)
Build command: npm run build
Build output directory: dist
Root directory: / (or leave blank)
```

#### 2.4 Set Environment Variables

Add to Cloudflare Pages project settings:

```
VITE_SUPABASE_URL = https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGc...
PAYSTACK_SECRET_KEY = sk_live_...
RESEND_API_KEY = re_...
```

**Note**: Don't expose SECRET keys in browser (VITE_* only). Secret keys go in Worker environment.

### Phase 3: Custom Domain Setup (30 minutes)

#### 3.1 Register Domain

Option A: Register with Cloudflare (recommended)
- Go to Cloudflare Dashboard → Domains
- Search and register `ems-tracker.com`

Option B: Use existing registrar
- Update nameservers to Cloudflare (provided in dashboard)

#### 3.2 Configure DNS for Pages

In Cloudflare DNS settings:

```
Type: CNAME
Name: app
Target: your-pages-project.pages.dev
Proxy status: Proxied (orange cloud)
```

Wait for DNS propagation (can take 15-30 minutes).

#### 3.3 Setup SSL/TLS

Cloudflare automatically provides SSL via Let's Encrypt.

1. Go to SSL/TLS settings
2. Set to "Full" or "Full (strict)" mode
3. Pages will automatically validate

#### 3.4 Verify Domain in Supabase

1. Go to Supabase project settings
2. Update CORS origins:
   ```
   https://app.ems-tracker.com
   https://*.ems-tracker.com (for subdomains)
   ```

### Phase 4: Email Configuration (1 hour)

#### 4.1 Verify Resend Domain

For better email deliverability:

1. Get CNAME records from Resend dashboard
2. Add to Cloudflare DNS:
   ```
   Type: CNAME
   Name: default._domainkey
   Target: resend-verified.resend.dev
   ```

#### 4.2 Setup Domain Authentication

```
From: noreply@ems-tracker.com
Reply-To: support@ems-tracker.com
```

Update in your Edge Functions.

#### 4.3 Verify SPF/DKIM

Add to Cloudflare DNS:

```
Type: TXT
Name: @
Value: v=spf1 include:resend.com ~all

Type: TXT  
Name: default._domainkey
Value: v=DKIM1; k=rsa; p=MIGfMA0BGkqhkiG9w0BA...
```

### Phase 5: Paystack Configuration (15 minutes)

#### 5.1 Update Webhook URL

1. Go to Paystack Dashboard → Settings → Webhooks
2. Update webhook URL to:
   ```
   https://app.ems-tracker.com/api/webhooks/paystack
   ```
3. Test webhook delivery

#### 5.2 Update OAuth Redirect URIs

If using OAuth:
- Add `https://app.ems-tracker.com/auth/callback`
- Keep localhost for development

### Phase 6: Deploy (15 minutes)

#### 6.1 Deploy via Cloudflare Pages

Option A: Automatic (GitHub integration)
```bash
git push origin main
# Cloudflare will auto-build and deploy
```

Option B: Manual deployment
```bash
npm install -g wrangler
wrangler login
npm run deploy
```

#### 6.2 Verify Deployment

```bash
# Check deployment status
wrangler pages deployments list

# Test domain
curl https://app.ems-tracker.com
```

#### 6.3 Test App

1. Visit `https://app.ems-tracker.com`
2. Test login/signup
3. Test subscription upgrade (Paystack)
4. Test email sending
5. Test API calls

### Phase 7: Optimize & Secure (1 hour)

#### 7.1 Enable WAF

1. Go to Cloudflare Dashboard → Security → WAF
2. Enable OWASP ModSecurity rules
3. Enable "Rate Limiting" under DDoS Protection
   - Limit: 1000 requests per 10 seconds

#### 7.2 Setup Page Rules

```
Rule 1: Cache everything
Path: /*
Cache Level: Cache Everything
Browser Cache TTL: 30 minutes

Rule 2: Bypass cache for API
Path: /api/*
Cache Level: Bypass

Rule 3: Bypass cache for auth
Path: /auth/*
Cache Level: Bypass
```

#### 7.3 Enable Performance Features

1. **Minify JavaScript**: ON
2. **Minify CSS**: ON
3. **Minify HTML**: ON
4. **HTTP/2 Server Push**: ON
5. **Brotli Compression**: ON

#### 7.4 Configure Headers

Go to Rules → Headers Rewrite:

```
# Add security headers
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), camera=()
```

### Phase 8: Monitoring & Troubleshooting (Ongoing)

#### 8.1 Setup Alerts

1. Cloudflare Dashboard → Notifications
2. Create alert for:
   - High error rate (>1%)
   - High CPU usage
   - DDoS attack detected

#### 8.2 Monitor Performance

Use Cloudflare Analytics:
- Page load times
- Cache hit ratio
- Bot traffic

#### 8.3 Logs

View deployment logs:
```bash
wrangler pages deployment list
wrangler pages deployment tail <deployment-id>
```

## Rollback Plan

If you need to rollback to Vercel:

```bash
# In Vercel dashboard
1. Go to Deployments
2. Click "Redeploy" on previous deployment
3. Set as production

# Total downtime: ~5 minutes
```

## Cost Comparison

**Before (Vercel Pro)**: $20/month
- 100 GB bandwidth
- 3 production deployments

**After (Cloudflare)**: FREE
- Unlimited bandwidth
- Unlimited deployments
- Free WAF + DDoS protection

**Savings**: $240/year + better performance

## Tenant Subdomains (Advanced)

Once migrated, you can offer custom subdomains per tenant:

```
chevron.ems-tracker.com → Chevron's workspace
exxon.ems-tracker.com → Exxon's workspace
```

Setup:
1. Cloudflare wildcard DNS:
   ```
   Type: CNAME
   Name: *.tenants
   Target: ems-tracker.pages.dev
   ```

2. Update Router to detect subdomain:
   ```tsx
   const subdomain = window.location.hostname.split('.')[0];
   if (subdomain !== 'app') {
     // Load tenant-specific workspace
   }
   ```

## Troubleshooting

### Issue: Domain not resolving

**Solution**: 
1. Verify nameservers are set to Cloudflare
2. Wait 48 hours for full propagation
3. Check CNAME record in Cloudflare DNS

### Issue: 404 on SPA routes

**Solution**:
Add `_redirects` file in `public/` folder:

```
/* /index.html 200
```

### Issue: Slow builds

**Solution**:
- Check build logs: `wrangler pages deployment tail`
- Optimize npm dependencies
- Use npm ci instead of npm install

### Issue: Paystack webhook failing

**Solution**:
- Verify webhook URL is correct
- Check Cloudflare WAF rules allow POST
- Test with Paystack dashboard webhook retry

## Next: Stripe Integration

Once stable on Cloudflare, you can add Stripe as backup/alternative:

1. Create Stripe account
2. Add Stripe webhook function
3. Update billing component to support both Paystack + Stripe

---

**Estimated Total Migration Time**: 3-4 hours
**Recommended**: Do during off-hours to minimize disruption
