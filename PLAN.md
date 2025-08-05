# Business Card Scanner Integration Plan

This document outlines the plan to integrate the `daveenci-ai-crm-business-cards` functionality into the existing `dev-admin` application.

## 1. Goal

The primary goal is to create a seamless, backend-only business card scanning pipeline that captures card images, uses AI to extract and research contact information, and saves the data directly into the existing CRM database, without adding any new UI components to the `dev-admin` dashboard.

## 2. Architecture Overview

The final workflow will be:
`iPhone Shortcut -> GitHub Repo -> dev-admin API Webhook -> Gemini AI -> PostgreSQL Database -> Telegram`

## 3. Implementation Phases

### Phase 1: Database Schema Update

1.  **Add `UseCase` Model:**
    *   The new `use_cases` table you provided will be added to `prisma/schema.prisma` as a `UseCase` model.
2.  **Create Migration:**
    *   A new Prisma migration will be generated to create the `use_cases` table in the database.
3.  **Verify Existing Models:**
    *   I will ensure the `Contact` and `Touchpoint` models in `prisma/schema.prisma` are compatible with the data being inserted by the business card pipeline. The `added_by` field in `Touchpoint` will be populated with a system identifier like "Business Card Scanner".

### Phase 2: Backend API and Service Integration

1.  **Create Webhook Endpoint:**
    *   A new API route will be created at `src/app/api/business-card/webhook/route.ts`. This will be the entry point for the GitHub webhook.
2.  **Port Core Logic:**
    *   The core processing logic from `serverless-function.js` in the original repository will be ported to the new webhook endpoint.
    *   This includes webhook signature validation for security.
3.  **Create Helper Services:**
    *   `src/lib/gemini.ts`: This new file will contain all logic for interacting with the Google Gemini API for both vision-based data extraction and text-based business research.
    *   `src/lib/telegram.ts`: This new file will handle formatting and sending notifications to the specified Telegram channel.
4.  **Integrate Prisma Client:**
    *   The database operations (checking for existing contacts, creating new contacts, adding touchpoints) will be updated to use the existing Prisma client instance from `src/lib/db.ts`.

### Phase 3: Dependencies & Configuration

1.  **Add NPM Packages:**
    *   I will identify and add any necessary npm packages, such as `@google/generative-ai`, to your `package.json`.
2.  **Update Environment Variables:**
    *   Your `.env.example` file will be updated to include the new required variables:
        ```
        # For Business Card Scanner
        GEMINI_API_KEY=
        GITHUB_WEBHOOK_SECRET=
        TELEGRAM_BOT_TOKEN=
        TELEGRAM_CHAT_ID=
        ```

### Phase 4: Setup and Documentation (Post-Implementation)

Upon completion, instructions will be provided for:
1.  **Environment Setup:** How to get the necessary API keys and set the environment variables in your deployment environment (e.g., Vercel).
2.  **GitHub Webhook Configuration:** How to create a webhook in the business card image repository and point it to the new `https://<your-deployment-url>/api/business-card/webhook` endpoint.
3.  **iPhone Shortcut Setup:** A copy or reference to the `iPhone-Shortcut-Setup.md` from the original repository will be provided.

## 4. Execution

I will proceed with the implementation phase by phase after you approve this plan. I will begin with **Phase 1** immediately. 