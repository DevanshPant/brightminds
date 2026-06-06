Google Forms integration (Apps Script fallback)

To ensure contact form responses appear in your Google Form reliably, deploy the Apps Script web app under `scripts/apps-script/Code.gs` (see `scripts/apps-script/README.md` for deploy steps). After deploying, set `VITE_APPS_SCRIPT_URL` to your web app URL (see `.env.example`) and rebuild the site; the contact form will then POST to your Apps Script which submits the response into your Google Form responses automatically.

Quick summary:
- Deploy Apps Script at https://script.google.com using `scripts/apps-script/Code.gs`.
- Set `VITE_APPS_SCRIPT_URL` to `https://script.google.com/macros/s/DEPLOY_ID/exec` before building.
- Rebuild and deploy your site. No other site changes required.

Security note:
- Consider adding a token or verifying requests on the script side to avoid abuse.
