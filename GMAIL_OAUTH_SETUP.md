# Gmail OAuth2 Setup Guide

This guide will help you set up Gmail OAuth2 integration for your dashboard's Gmail tab.

## Overview

The Gmail OAuth2 integration allows your application to:
- Connect to Gmail accounts securely using OAuth2 (no passwords needed)
- Read, archive, delete, and manage Gmail emails
- Support multiple Gmail accounts
- Use Gmail API and IMAP with OAuth2 tokens

## Prerequisites

1. A Google Cloud Project
2. Gmail accounts you want to connect
3. Your application deployed with a public URL

## Step 1: Google Cloud Project Setup

### 1.1 Create or Select a Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

### 1.2 Enable Required APIs
Enable these APIs for your project:
1. **Gmail API** - For reading/managing emails
2. **Google OAuth2 API** - For authentication

```bash
# Via gcloud CLI (optional)
gcloud services enable gmail.googleapis.com
gcloud services enable oauth2.googleapis.com
```

### 1.3 Create OAuth2 Credentials
1. Go to **APIs & Services → Credentials**
2. Click **+ CREATE CREDENTIALS → OAuth 2.0 Client IDs**
3. Configure the consent screen first if prompted:
   - Choose **External** for most use cases
   - Fill in required app information
   - Add your domain to authorized domains
4. Create OAuth2 Client ID:
   - **Application type**: Web application
   - **Name**: Your app name (e.g., "DaVeenci Admin Gmail")
   - **Authorized redirect URIs**: Add your callback URL:
     ```
     https://admin.daveenci.ai/api/gmail/oauth/callback
     ```
     Replace with your actual domain.

5. Download the credentials JSON file or copy the Client ID and Client Secret

## Step 2: Environment Variables

Add these environment variables to your deployment platform:

```bash
# Required for Gmail OAuth2
GOOGLE_CLIENT_ID="123456789-abcdefghijklmnop.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-your-client-secret-here"
GOOGLE_REDIRECT_URI="https://admin.daveenci.ai/api/gmail/oauth/callback"

# Your existing variables
NEXTAUTH_URL="https://admin.daveenci.ai"
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="your-secret"
```

### Important Notes:
- **GOOGLE_REDIRECT_URI**: Must exactly match what you configured in Google Cloud Console
- **NEXTAUTH_URL**: Should match your domain
- If GOOGLE_REDIRECT_URI is not set, it defaults to `{NEXTAUTH_URL}/api/gmail/oauth/callback`

## Step 3: Database Migration

Run the database migration to add the Gmail OAuth2 table:

```bash
# Generate and apply Prisma migration
npx prisma generate
npx prisma db push
```

This creates the `gmail_accounts` table to store refresh tokens securely.

## Step 4: OAuth2 Flow Testing

### 4.1 Start Authorization
1. Go to your Gmail tab in the dashboard
2. Click **"Connect Gmail Account"** (this button will appear when no accounts are connected)
3. You'll be redirected to Google's consent screen
4. Sign in with your Gmail account
5. Grant the required permissions:
   - Read your emails
   - Modify your emails (for actions like archive/delete)
   - Send emails on your behalf
   - Access IMAP/SMTP

### 4.2 Callback Handling
After authorization:
1. Google redirects back to your callback URL
2. The app exchanges the authorization code for tokens
3. Refresh token is stored securely in your database
4. You're redirected back to the Gmail tab with a success message

### 4.3 Verify Connection
- Gmail tab should show your connected account(s)
- You should see email counts and be able to browse emails
- Email actions (archive, delete, mark as read) should work

## Step 5: Multiple Account Support

To connect additional Gmail accounts:
1. Use the **"Add Another Account"** button in the Gmail tab
2. Repeat the OAuth2 flow for each account
3. Each account stores its own refresh token
4. Switch between accounts using the account selector

## Security Considerations

### Token Storage
- **Refresh tokens** are stored encrypted in your PostgreSQL database
- **Access tokens** are short-lived (1 hour) and refreshed automatically
- Tokens are tied to specific Gmail accounts

### Permissions (Scopes)
The app requests these OAuth2 scopes:
- `https://www.googleapis.com/auth/gmail.readonly` - Read emails
- `https://www.googleapis.com/auth/gmail.modify` - Modify emails (archive, delete, etc.)
- `https://www.googleapis.com/auth/gmail.send` - Send emails
- `https://mail.google.com/` - IMAP access

### Revoking Access
Users can revoke access:
1. In your app: Use the "Disconnect" button in Gmail tab
2. In Google Account: [myaccount.google.com](https://myaccount.google.com) → Security → Third-party apps

## Troubleshooting

### Common Issues

**1. "redirect_uri_mismatch" error**
- Ensure GOOGLE_REDIRECT_URI exactly matches Google Cloud Console settings
- Check for trailing slashes, http vs https

**2. "invalid_client" error**
- Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are correct
- Check that OAuth2 client is enabled in Google Cloud Console

**3. "insufficient_scope" error**
- User may have denied some permissions
- Try the OAuth2 flow again and grant all requested permissions

**4. Token refresh failures**
- May happen if user revoked access in Google Account settings
- Solution: Re-run OAuth2 flow to get new tokens

**5. Rate limiting**
- Gmail API has usage limits
- The app implements batching and delays to respect limits
- For high-volume usage, consider requesting quota increases

### Checking Logs
Monitor your application logs for:
- `[Gmail OAuth]` - OAuth2 flow messages
- `[Gmail Service]` - Gmail API interactions
- `[Gmail API]` - API endpoint calls

### Testing Locally
For local development:
1. Use `ngrok` or similar to create a public tunnel
2. Update GOOGLE_REDIRECT_URI to use the tunnel URL
3. Add the tunnel URL to Google Cloud Console authorized URIs

## Production Deployment

### Rate Limits
- Gmail API: 1,000,000 units/day (default)
- Requests are automatically batched to stay within limits

### Monitoring
Monitor these metrics:
- OAuth2 success/failure rates
- Gmail API error rates
- Token refresh frequency
- User connection status

### Backup Strategy
- Database contains sensitive refresh tokens
- Ensure your database backup strategy includes the `gmail_accounts` table
- Consider encryption at rest for production databases

## API Endpoints

The Gmail OAuth2 system exposes these endpoints:

```
GET  /api/gmail/oauth/authorize?email=user@example.com  # Start OAuth2 flow
GET  /api/gmail/oauth/callback                          # Handle OAuth2 callback
GET  /api/gmail/oauth/accounts                          # List connected accounts
DELETE /api/gmail/oauth/accounts?email=user@example.com # Revoke account access

GET  /api/gmail/accounts                                # Get account stats
GET  /api/gmail/emails?email=user@example.com&limit=20  # Fetch emails
POST /api/gmail/actions                                 # Email actions (archive, delete, etc.)
```

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review application logs for error messages
3. Verify Google Cloud Console configuration
4. Test with a simple Gmail account first

The OAuth2 flow is complex but provides secure, scalable access to Gmail without storing passwords.
