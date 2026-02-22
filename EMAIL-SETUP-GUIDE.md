# Email Setup Guide for Contact Form

The contact form is now configured to send emails to: **preciousenoch2026@gmail.com**

## Setup Required (Gmail App Password)

To enable email sending, you need to create a Gmail App Password:

### Step 1: Enable 2-Factor Authentication
1. Go to https://myaccount.google.com/security
2. Click on "2-Step Verification"
3. Follow the steps to enable it (if not already enabled)

### Step 2: Create App Password
1. Go to https://myaccount.google.com/apppasswords
2. Sign in with your Gmail account (preciousenoch2026@gmail.com)
3. Select "Mail" as the app
4. Select "Other" as the device and name it "Enoch Legal Website"
5. Click "Generate"
6. Copy the 16-character password (it will look like: xxxx xxxx xxxx xxxx)

### Step 3: Add to Railway
1. Go to your Railway project: https://railway.app/project/ecf367ca-2aec-4a12-b961-a22e9f819a0a
2. Click on your "enochlegal" service
3. Go to "Variables" tab
4. Add these two variables:
   - `EMAIL_USER` = `preciousenoch2026@gmail.com`
   - `EMAIL_PASS` = `[paste the 16-character app password here]`
5. Railway will automatically redeploy

### Step 4: Test
1. Go to your website: https://enochlegal-production.up.railway.app
2. Scroll to Contact section
3. Fill out the form and submit
4. Check preciousenoch2026@gmail.com inbox for the message!

## How It Works

When someone submits the contact form:
1. Form data is sent to your Railway backend
2. Backend uses Nodemailer to send email via Gmail
3. Email arrives at preciousenoch2026@gmail.com
4. User sees success message on the website

## Email Format

The email will include:
- Sender's name
- Sender's email (you can reply directly)
- Subject
- Message content
- Professional formatting with your brand colors

## Troubleshooting

If emails don't send:
1. Check that EMAIL_USER and EMAIL_PASS are set in Railway
2. Verify the app password is correct (no spaces)
3. Check Railway logs: `railway logs`
4. Make sure 2FA is enabled on the Gmail account

## Alternative: Use Your Own Email

If you want to use a different email service:
- Update `EMAIL_USER` to your email
- Create app password for that email service
- Update `EMAIL_PASS` with the new app password
