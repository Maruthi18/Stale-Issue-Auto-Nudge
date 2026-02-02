# Email Configuration Setup

This guide will help you configure email notifications for the Stale Issue Auto-Nudge app using SendGrid.

## Prerequisites

1. A SendGrid account (free tier allows 100 emails/day)
2. SendGrid API key
3. A verified sender email address in SendGrid

## Step 1: Get SendGrid API Key

1. Sign up for SendGrid at https://sendgrid.com/
2. Navigate to **Settings > API Keys** in the SendGrid dashboard
3. Click **Create API Key**
4. Give it a name (e.g., "Forge Stale Issue App")
5. Select **Full Access** or **Restricted Access** with Mail Send permissions
6. Copy the API key (you won't be able to see it again!)

## Step 2: Verify Sender Email

1. Go to **Settings > Sender Authentication** in SendGrid
2. Choose either:
   - **Single Sender Verification** (easier, for testing)
   - **Domain Authentication** (recommended for production)
3. Follow the verification steps
4. Update `fromEmail` in [src/email.js](src/email.js) line 8 with your verified email

## Step 3: Configure Forge Environment Variables

Run these commands in your terminal from the app directory:

```bash
# Set SendGrid API key (encrypted)
forge variables set --encrypt SENDGRID_API_KEY your-sendgrid-api-key-here

# Set recipient email address
forge variables set RECIPIENT_EMAIL your-email@example.com
```

**Important:** Replace the placeholder values with your actual API key and email address.

## Step 4: Update Email Configuration

Edit [src/email.js](src/email.js) and update the `EMAIL_CONFIG` object:

```javascript
const EMAIL_CONFIG = {
  fromEmail: 'noreply@yourdomain.com',  // Change to your verified sender email
  fromName: 'Stale Issue Auto-Nudge',
  subject: 'Stale Issue Auto-Nudge - Execution Summary',
};
```

## Step 5: Deploy the App

```bash
# Deploy the updated app
forge deploy

# Install to your Jira site (if not already installed)
forge install
```

## Step 6: Test Email Functionality

1. Go to any Jira issue in your project
2. Look for **Stale Issue Auto-Nudge** in the issue panel on the right side
3. Click **Run Stale Issue Check**
4. Check your email for the execution summary

## Verifying Environment Variables

To check if your environment variables are set correctly:

```bash
# List all environment variables (values will be hidden)
forge variables list
```

You should see:
- `SENDGRID_API_KEY` (encrypted)
- `RECIPIENT_EMAIL`

## Troubleshooting

### Email not received?

1. **Check SendGrid dashboard** for email delivery status
2. **Check spam folder** in your email client
3. **Verify sender email** is authenticated in SendGrid
4. **Check logs** with `forge logs` to see error messages

### Common Issues

**Issue:** "SendGrid API key not configured"
- **Solution:** Make sure you ran `forge variables set --encrypt SENDGRID_API_KEY`
- Redeploy the app after setting variables

**Issue:** "Recipient email not configured"
- **Solution:** Run `forge variables set RECIPIENT_EMAIL your-email@example.com`
- Redeploy the app

**Issue:** SendGrid returns 403 Forbidden
- **Solution:** Verify your sender email in SendGrid dashboard
- Make sure the `fromEmail` in email.js matches your verified sender

**Issue:** SendGrid returns 401 Unauthorized
- **Solution:** Check if your API key is correct
- Create a new API key if needed

## Email Content Customization

To customize the email content, edit these functions in [src/email.js](src/email.js):

- `generateHtmlContent()` - HTML email template
- `generateTextContent()` - Plain text version
- `EMAIL_CONFIG` - Subject line and sender details

## Additional Configuration

### Change email recipient per environment

```bash
# For development
forge variables set --environment development RECIPIENT_EMAIL dev@example.com

# For production
forge variables set --environment production RECIPIENT_EMAIL prod@example.com
```

### Multiple recipients

To send to multiple recipients, modify the `sendEmailViaSendGrid()` function in [src/email.js](src/email.js):

```javascript
personalizations: [
  {
    to: [
      { email: 'person1@example.com' },
      { email: 'person2@example.com' }
    ],
    subject: subject,
  },
],
```

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use encrypted variables** for sensitive data (`--encrypt` flag)
3. **Rotate API keys** periodically
4. **Use restricted API keys** with minimum required permissions
5. **Use domain authentication** instead of single sender verification for production

## Support

For SendGrid support: https://support.sendgrid.com/
For Forge support: https://developer.atlassian.com/platform/forge/

---

**Next Steps:**
- Configure your SendGrid account and API key
- Set environment variables
- Deploy and test the app
