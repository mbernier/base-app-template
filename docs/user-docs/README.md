# User-Facing Documentation Templates

This directory contains foundational user-facing documentation that you can customize for your app. These are starting points, not final docs.

## What's Here

| File | Purpose | What to customize |
|------|---------|------------------|
| [help.md](help.md) | Getting started guide for end users | App name, features, screenshots, wallet instructions |
| [faq.md](faq.md) | Common questions and answers | Add app-specific questions, remove irrelevant ones |
| [terms-template.md](terms-template.md) | Terms of service starting point | **Must** be reviewed by legal counsel before use |

## How to Use These

### Option 1: Convert to app pages

Copy the content into your Next.js pages:

```
docs/user-docs/help.md    →  app/help/page.tsx
docs/user-docs/faq.md     →  app/faq/page.tsx
docs/user-docs/terms.md   →  app/terms/page.tsx
```

### Option 2: Use as markdown with a renderer

Install a markdown renderer and serve these files directly. The template already has `app/terms/` and `app/privacy/` pages you can adapt.

### Option 3: External docs site

Use these as source content for an external documentation site (Docusaurus, GitBook, Notion, etc.).

## Customization Checklist

When adapting these for your app:

- [ ] Replace `[App Name]` with your actual app name throughout
- [ ] Replace `[your-domain.com]` with your actual domain
- [ ] Replace `[your-email]` with your support email
- [ ] Update wallet connection instructions for your specific UI
- [ ] Add screenshots of your actual app
- [ ] Add app-specific FAQ entries
- [ ] Have legal counsel review the terms template before publishing
- [ ] Remove sections that don't apply to your app
- [ ] Add sections for features unique to your app
