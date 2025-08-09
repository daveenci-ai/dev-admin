# Environment Variables Setup

This document outlines all the environment variables required for the Avatar Generation System.

## Required Environment Variables

Create a `.env.local` file in your project root with the following variables:

### Database Configuration
```bash
DATABASE_URL="postgresql://username:password@localhost:5432/dev_admin"
```

### NextAuth Configuration
```bash
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-here"
```

### Replicate AI Configuration
```bash
REPLICATE_API_TOKEN="r_your_replicate_api_token_here"
REPLICATE_MODEL_VERSION="black-forest-labs/flux-dev-lora"
```

### OpenAI Configuration (ChatGPT only)
```bash
# Default key (fallback)
OPENAI_API_KEY=
# Per-use-case keys
OPENAI_API_KEY_BLOG=
OPENAI_API_KEY_CASE=
OPENAI_API_KEY_AVATAR=
OPENAI_API_KEY_CHATBOT=
OPENAI_API_KEY_RESEARCH=
```
Models used:
- All tasks: `chatgpt-5-nano`

### GitHub Storage Configuration
```bash
GITHUB_TOKEN="ghp_your_github_personal_access_token"
# Avatar image storage repository (owner/repo)
GITHUB_REPO_AVATAR="username/repository-name"

# Business cards image repo (owner/repo)
GITHUB_REPO_BUSINESS_CARDS="username/another-repo"
```

## Setup Instructions

### 1. Database Setup
- Install PostgreSQL
- Create database: `createdb dev_admin`
- Run migrations: `npx prisma migrate dev`

### 2. Replicate API Setup
- Sign up at [Replicate.com](https://replicate.com)
- Get your API token from account settings
- Ensure you have access to FLUX-dev-lora model

### 3. ChatGPT Setup
- No additional setup beyond setting `OPENAI_API_KEY`

### 4. GitHub Storage Setup
- Create a GitHub repository for image storage
- Generate a Personal Access Token with repository permissions
- Update GITHUB_REPO with your repository path

## Enhanced Avatar Generation Workflow

The new system includes a friendly user choice flow:

1. **User Input** → Avatar selected + 10+ character prompt
2. **Preview Mode** → Get ChatGPT optimization without generating images
3. **User Choice Modal** → Compare original vs optimized prompt
4. **Image Generation** → 1-4 images generated with chosen prompt
5. **PENDING_REVIEW** → Images await user approval
6. **GitHub Upload** → Approved images stored in GitHub repository
7. **Database Storage** → Final URLs saved in `avatars_generated` table

## Recent Fixes (Latest Update)

### ✅ Fixed/Updated:
- **AI Provider**: Gemini removed. Standardized on ChatGPT (`chatgpt-5-nano`).
- **Number of Images**: Limited to 1-4 instead of 1-8 for better performance  
- **User Experience**: Friendly modal for prompt comparison
- **Error Handling**: Improved fallback when AI API is overloaded
- **Replicate Parameters**: Fixed parameter formatting issues

### ✅ New Features:
- **Preview Mode**: Get prompt optimization without starting generation
- **Friendly Modal**: Visual comparison between original and optimized prompts
- **Enhanced Fallback**: Includes avatar description in fallback prompts
- **Better Logging**: Detailed API request/response logging for debugging

## Troubleshooting

### Common Issues:

#### OpenAI API Issues:
- **429 Too Many Requests**: Rate limit exceeded, implement retry with backoff
- **401 Unauthorized**: Check `OPENAI_API_KEY`
- **5xx Errors**: Temporary service issues, retry with backoff

#### Replicate API Issues:
- **Unprocessable Entity (422)**: Check model version and input parameters
- **Rate Limits**: Upgrade Replicate plan for more concurrent requests
- **Model Access**: Ensure you have access to the specific LoRA model

#### GitHub Upload Issues:
- **Repository Not Found**: Check GITHUB_REPO format and permissions
- **Token Expired**: Regenerate Personal Access Token
- **File Size Limits**: GitHub has 100MB file size limits

#### Database Issues:
- **Connection Timeout**: Check PostgreSQL is running and DATABASE_URL
- **Migration Errors**: Run `npx prisma db push` to sync schema

## Performance Optimization

### For Production:
- Set `NODE_ENV=production`
- Use environment-specific database URLs
- Configure proper CORS for your domain
- Enable Redis caching for better performance
- Consider CDN for GitHub image delivery

### API Quotas to Monitor:
- **OpenAI**: Rate limits per tier
- **Replicate**: Concurrent prediction limits
- **GitHub**: API rate limits for file uploads