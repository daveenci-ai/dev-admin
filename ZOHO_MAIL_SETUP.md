# Zoho Mail Integration Setup

This document explains how to set up the Zoho Mail integration for your DaVeenci AI admin dashboard.

## 📦 1. Environment Variables

You need to set these environment variables in your hosting platform (e.g., Render):

### Required Variables:
```ini
ZOHO_CLIENT_ID=your_client_id
ZOHO_CLIENT_SECRET=your_client_secret
ZOHO_REFRESH_TOKEN=your_refresh_token
ZOHO_ACCOUNT_ID=7039029000000008002
ZOHO_FOLDER_ID=7039029000000008014
```

### Where to Set These:

#### In Render Dashboard:
1. Go to your service dashboard
2. Navigate to Settings → Environment
3. Add each variable with its corresponding value

#### For Local Development:
Create a `.env.local` file in your project root:
```ini
ZOHO_CLIENT_ID=your_client_id
ZOHO_CLIENT_SECRET=your_client_secret
ZOHO_REFRESH_TOKEN=your_refresh_token
ZOHO_ACCOUNT_ID=7039029000000008002
ZOHO_FOLDER_ID=7039029000000008014
```

## 🔑 2. Getting Your Zoho Credentials

### Step 1: Create a Self Client in Zoho Developer Console
1. Go to [Zoho Developer Console](https://api-console.zoho.com/)
2. Create a new "Self Client" application
3. Note down your `client_id` and `client_secret`

### Step 2: Get Refresh Token
1. Generate an authorization code using OAuth 2.0 flow
2. Exchange the authorization code for a refresh token
3. Store the `refresh_token` securely

### Step 3: Get Account and Folder IDs
Use the Zoho Mail API to get your account and folder information:
```bash
GET https://mail.zoho.com/api/accounts
GET https://mail.zoho.com/api/accounts/{accountId}/folders
```

## 🛠 3. Dependencies

The following packages are required and have been installed:
- `axios` - For making HTTP requests to Zoho Mail API

## 🚀 4. Features Implemented

### API Endpoints:
- `GET /api/email/inbox` - Fetch inbox messages
- `POST /api/email/send` - Send emails
- `GET /api/email/stats` - Get email statistics

### Frontend Features:
- 📧 View recent emails from inbox
- ✉️ Compose and send new emails
- 📊 Email statistics dashboard
- 🔄 Refresh inbox manually
- ❌ Error handling and user feedback

## 🔐 5. Security Features

- ✅ OAuth 2.0 token management
- ✅ Automatic token refresh
- ✅ Environment variable protection
- ✅ Server-side API calls only
- ✅ Error handling and logging

## 📋 6. Usage

1. Set up your environment variables
2. Deploy your application
3. Navigate to the Email tab in your dashboard
4. Start managing your Zoho Mail!

## 🐛 7. Troubleshooting

### Common Issues:
1. **"Missing Zoho credentials"** - Check environment variables
2. **"Failed to refresh token"** - Verify client_id, client_secret, and refresh_token
3. **"Failed to fetch emails"** - Check account_id and folder_id
4. **API Rate Limits** - Zoho has rate limits, the app handles retries automatically

### Debug Steps:
1. Check server logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test API endpoints directly using the browser network tab
4. Ensure your Zoho OAuth app has the correct permissions

## 📞 8. Support

If you encounter issues:
1. Check the browser console for frontend errors
2. Check server logs for backend errors
3. Verify your Zoho Mail API access and permissions
4. Ensure your OAuth tokens haven't expired

## 🎉 9. What's Next?

Potential enhancements:
- Email threading and conversations
- Advanced email filtering and search
- Email templates
- Scheduled email sending
- Integration with CRM contacts
- Email analytics and reporting 