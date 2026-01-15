# Documentation Deployment

## Live URL

**Production:** https://documentation-dqbkfehnq-ankursoni948-gmailcoms-projects.vercel.app

## Project Information

- **Project Name:** documentation
- **Project ID:** prj_0DIxQfjg5Gi6U5YcnfFPjnuuZ15s
- **Organization ID:** team_FBKcmEFjzO5vacWlE4hnFqfj

## To Rename Project to "raga-radio-architecture"

You can rename the project via Vercel Dashboard:

1. Go to https://vercel.com/dashboard
2. Find the "documentation" project
3. Click Settings
4. Under General → Project Name
5. Change to: `raga-radio-architecture`
6. The URL will become: `https://raga-radio-architecture.vercel.app`

## Deployment Details

- **File:** END_TO_END_FLOW.html
- **Root Path:** Configured to show END_TO_END_FLOW.html at `/`
- **Clean URLs:** Enabled
- **Framework:** Static HTML (no build required)

## Redeploy

To redeploy after changes:

```bash
cd documentation
vercel --yes --prod
```

## Files Deployed

- END_TO_END_FLOW.html (Interactive documentation)
- vercel.json (Configuration)

---

**Note:** The Vercel CLI `--name` flag is deprecated. Project naming must be done via the Vercel Dashboard.
