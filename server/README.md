# BrightMinds Form Server with Resend Email Integration

This server receives Google Form submissions via Zapier webhook and sends formatted emails using Resend.

## Setup Steps

### 1. Get Resend API Key
- Go to [resend.com](https://resend.com)
- Sign up for free
- Go to **API Keys** and copy your API key
- (Free tier: 100 emails/day)

### 2. Install Dependencies
```bash
cd server
npm install
```

### 3. Configure Environment Variables
- Copy `.env.example` to `.env`
- Paste your Resend API key:
  ```
  RESEND_API_KEY=re_your_api_key_here
  ADMIN_EMAIL=devanshrhpant@gmail.com
  ```

### 4. Run the Server Locally (Testing)
```bash
npm run dev
```
Server will run at `http://localhost:3001`

Test the webhook:
```bash
curl -X POST http://localhost:3001/forms/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "student_name": "Devansh",
    "current_class": "Class 7",
    "parent_contact": "8976588403",
    "email_address": "devanshrhpant@gmail.com",
    "message": "Test message"
  }'
```

### 5. Deploy Server
Choose one:

#### Option A: Vercel (Recommended)
```bash
npm install -g vercel
vercel
# Follow prompts, add .env variables in Vercel dashboard
```
Your endpoint: `https://your-project.vercel.app/forms/webhook`

#### Option B: Render.com
- Push to GitHub
- Go to [render.com](https://render.com)
- Create New → Web Service → Connect GitHub repo
- Set environment variables in dashboard
- Deploy

#### Option C: Heroku / Railway / Fly.io
Similar process—push repo, add env vars, deploy.

### 6. Set Up Zapier Trigger
1. Go to [zapier.com](https://zapier.com)
2. Create New Zap → Trigger: **Google Forms → New Response**
3. Connect your Google account and select your form
4. Action: **Webhooks by Zapier → POST**
5. URL: `https://your-deployed-server.com/forms/webhook`
6. Payload (Raw):
   ```json
   {
     "student_name": "{{Student Name}}",
     "current_class": "{{Current Class}}",
     "parent_contact": "{{Parent Contact}}",
     "email_address": "{{Email Address}}",
     "message": "{{Message (Optional)}}"
   }
   ```
7. Test & Turn On

### 7. Verify Email Delivery
- Fill out your Google Form
- Check your inbox at `ADMIN_EMAIL` within 30 seconds
- Email should contain formatted student info

---

## Environment Variables Explained

| Variable | Purpose | Example |
|----------|---------|---------|
| `RESEND_API_KEY` | Authentication for Resend API | `re_xxxxx...` |
| `ADMIN_EMAIL` | Email to receive submissions | `your@email.com` |
| `PORT` | Server port (optional) | `3001` |

---

## Troubleshooting

**Email not sending?**
- Check Resend API key is correct
- Verify `ADMIN_EMAIL` is valid
- Check server logs for errors

**Zapier not triggering?**
- Test webhook URL: `curl https://your-url/health`
- Ensure form URL is correct in Zapier
- Check Zapier task history for errors

**Local testing not working?**
- Ensure server is running: `npm run dev`
- Use ngrok to expose local server: `ngrok http 3001`
- Use ngrok URL in Zapier for testing

---

## File Structure
```
server/
  ├── index.js           # Main server
  ├── package.json       # Dependencies
  ├── .env.example       # Environment template
  └── README.md          # This file
```
