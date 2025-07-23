# Zoho Mail Integration Setup

This document explains how to set up the Zoho Mail integration for your DaVeenci AI admin dashboard.

## 📦 1. Environment Variables

You need to set these environment variables in your hosting platform (e.g., Render):

### Required Variables for Multiple Mailboxes:
```ini
# Anton's mailbox (anton.osipov@daveenci.ai)
ZOHO_ANTON_CLIENT_ID=your_anton_client_id
ZOHO_ANTON_CLIENT_SECRET=your_anton_client_secret
ZOHO_ANTON_REFRESH_TOKEN=your_anton_refresh_token
ZOHO_ANTON_ACCOUNT_ID=your_anton_account_id
ZOHO_ANTON_FOLDER_ID_INBOX=your_anton_folder_id

# Astrid's mailbox (astrid@daveenci.ai)
ZOHO_ASTRID_CLIENT_ID=your_astrid_client_id
ZOHO_ASTRID_CLIENT_SECRET=your_astrid_client_secret
ZOHO_ASTRID_REFRESH_TOKEN=your_astrid_refresh_token
ZOHO_ASTRID_ACCOUNT_ID=your_astrid_account_id
ZOHO_ASTRID_FOLDER_ID_INBOX=your_astrid_folder_id

# Hello mailbox (hello@daveenci.ai)
ZOHO_HELLO_CLIENT_ID=your_hello_client_id
ZOHO_HELLO_CLIENT_SECRET=your_hello_client_secret
ZOHO_HELLO_REFRESH_TOKEN=your_hello_refresh_token
ZOHO_HELLO_ACCOUNT_ID=your_hello_account_id
ZOHO_HELLO_FOLDER_ID_INBOX=your_hello_folder_id

# Support mailbox (support@daveenci.ai)
ZOHO_SUPPORT_CLIENT_ID=your_support_client_id
ZOHO_SUPPORT_CLIENT_SECRET=your_support_client_secret
ZOHO_SUPPORT_REFRESH_TOKEN=your_support_refresh_token
ZOHO_SUPPORT_ACCOUNT_ID=your_support_account_id
ZOHO_SUPPORT_FOLDER_ID_INBOX=your_support_folder_id

# Operations mailbox (ops@daveenci.ai)
ZOHO_OPS_CLIENT_ID=your_ops_client_id
ZOHO_OPS_CLIENT_SECRET=your_ops_client_secret
ZOHO_OPS_REFRESH_TOKEN=your_ops_refresh_token
ZOHO_OPS_ACCOUNT_ID=your_ops_account_id
ZOHO_OPS_FOLDER_ID_INBOX=your_ops_folder_id

# Legacy (backward compatibility)
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