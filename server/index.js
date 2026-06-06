import express from 'express';
import cors from 'cors';
import { Resend } from 'resend';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const resend = new Resend(process.env.RESEND_API_KEY);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../dist')));

// Your email (where form submissions should be sent)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'hello@brightmindsclasses.in';

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Form submission endpoint
app.post('/forms/webhook', async (req, res) => {
  try {
    const { student_name, current_class, parent_contact, email_address, message } = req.body;

    // Validate required fields
    if (!student_name || !current_class || !parent_contact) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create email HTML content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px;">
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h1 style="color: #333; text-align: center; margin-bottom: 30px; font-size: 28px;">🎓 New Form Submission</h1>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 12px 0; font-weight: bold; color: #667eea; width: 150px;">Student Name:</td>
                <td style="padding: 12px 0; color: #333;">${student_name}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 12px 0; font-weight: bold; color: #667eea;">Current Class:</td>
                <td style="padding: 12px 0; color: #333;">${current_class}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 12px 0; font-weight: bold; color: #667eea;">Parent Contact:</td>
                <td style="padding: 12px 0; color: #333;">${parent_contact}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 12px 0; font-weight: bold; color: #667eea;">Email Address:</td>
                <td style="padding: 12px 0; color: #333;">${email_address || 'Not provided'}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; font-weight: bold; color: #667eea;">Message:</td>
                <td style="padding: 12px 0; color: #333;">${message || 'No message'}</td>
              </tr>
            </table>
          </div>

          <div style="background: #e3f2fd; padding: 15px; border-left: 4px solid #667eea; border-radius: 4px; margin-bottom: 20px;">
            <p style="margin: 0; color: #1565c0; font-size: 14px;">
              <strong>Submitted at:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
            </p>
          </div>

          <div style="text-align: center; color: #999; font-size: 12px;">
            <p>This is an automated email from BrightMinds Classes Form System</p>
          </div>
        </div>
      </div>
    `;

    // Send email using Resend
    const response = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: ADMIN_EMAIL,
      subject: `🎓 New Student Inquiry - ${student_name} (${current_class})`,
      html: emailHtml,
    });

    console.log('Email sent successfully:', response);

    return res.status(200).json({
      success: true,
      message: 'Form submission received and email sent',
      emailId: response.id,
    });
  } catch (error) {
    console.error('Error processing form submission:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

// Catch-all handler: send back index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
  console.log(`📧 Admin email: ${ADMIN_EMAIL}`);
});
