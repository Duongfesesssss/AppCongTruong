# Email Notification Setup Guide

This guide explains how to configure Gmail SMTP for sending email notifications in AppCongTruong.

## Overview

The application now supports email notifications for:
- **@Mentions in chat**: When a user is mentioned in chat (global or project scope)
- **Pin/Task status updates**: When a task status changes in a project

## Configuration

### 1. Gmail App Password Setup

To use Gmail SMTP, you need to create an **App Password** (not your regular Gmail password):

1. **Enable 2-Factor Authentication** on your Google account:
   - Go to https://myaccount.google.com/security
   - Enable "2-Step Verification"

2. **Generate an App Password**:
   - Visit https://myaccount.google.com/apppasswords
   - Select "Mail" and your device type
   - Click "Generate"
   - Copy the 16-character password (you won't be able to see it again)

### 2. Environment Variables

Add the following variables to your `.env` file in the `server` directory:

```bash
# Email Configuration (Gmail SMTP)
MAIL_ENABLED=true
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password-here
MAIL_FROM_NAME=AppCongTruong
MAIL_FROM_EMAIL=your-email@gmail.com
```

### Configuration Options

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MAIL_ENABLED` | Enable/disable email sending | `false` | Yes |
| `MAIL_HOST` | SMTP server hostname | `smtp.gmail.com` | Yes |
| `MAIL_PORT` | SMTP server port | `587` | Yes |
| `MAIL_SECURE` | Use TLS connection | `false` | Yes |
| `MAIL_USER` | Gmail email address | - | Yes |
| `MAIL_PASSWORD` | Gmail App Password | - | Yes |
| `MAIL_FROM_NAME` | Sender display name | `AppCongTruong` | No |
| `MAIL_FROM_EMAIL` | Sender email address | Same as `MAIL_USER` | No |

### 3. Testing

After configuration, restart the server:

```bash
cd server
npm run dev
```

The server will log the email service initialization status on startup:

- ✅ Success: `Email service initialized with smtp.gmail.com`
- ⚠️ Warning: `Email service is disabled (MAIL_ENABLED=false)`
- ⚠️ Warning: `Email service is enabled but credentials are missing`

## Email Templates

### Mention Notification Email

**Subject**: `[AppCongTruong] {ActorName} đã nhắc đến bạn [trong project "{ProjectName}" / trong chat toàn cục]`

**Content**:
- Greeting with recipient name
- Actor name who mentioned them
- Message preview (first 180 characters)
- Link to deep context (if available)

**Example**:
```
Xin chào Nguyễn Văn A,

Trần Văn B đã nhắc đến bạn trong project "Tòa nhà XYZ":

"@nguyenvana chúng ta cần check lại phần chống cháy tầng 3..."

Xem chi tiết →
```

### Task Status Update Email

**Subject**: `[AppCongTruong] Cập nhật trạng thái Pin/Task: {TaskCode} ({TaskName})`

**Content**:
- Greeting with recipient name
- Actor name who updated the status
- Task code and name
- Old and new status
- Project name
- Link to deep context (if available)

**Example**:
```
Xin chào Nguyễn Văn A,

Trần Văn B đã cập nhật trạng thái của Pin/Task PRJ-A1-02-FW-000123 (Kiểm tra van chống cháy) trong project "Tòa nhà XYZ":

Trạng thái cũ: Đang xử lý
Trạng thái mới: Hoàn thành

Xem chi tiết →
```

## Email Recipients

### Mention Notifications
- All users mentioned with `@username` or `@email` in the chat message
- Excludes the message sender (won't email yourself)

### Task Status Update Notifications
- All project members (owner + members)
- Excludes the user who updated the status

## Troubleshooting

### Email Not Sending

1. **Check server logs** for error messages
2. **Verify App Password**: Make sure you're using the 16-character App Password, not your regular Gmail password
3. **Check 2FA**: Ensure 2-Factor Authentication is enabled on your Google account
4. **Firewall/Network**: Ensure port 587 is not blocked
5. **Gmail Security**: Check if Gmail has blocked the login attempt (check your email for security alerts)

### Common Errors

**"Invalid login"**
- You're using your regular password instead of App Password
- The App Password is incorrect
- 2FA is not enabled

**"Connection timeout"**
- Port 587 is blocked by firewall
- Network connectivity issues

**"Email sending failed but notification created"**
- Email service is misconfigured but the application continues to work
- Check server logs for specific error messages

## Disabling Email Notifications

To disable email notifications while keeping other features:

```bash
MAIL_ENABLED=false
```

The application will continue to:
- Show in-app notifications
- Send real-time Socket.IO notifications
- Display chat messages

Only email delivery will be disabled.

## Architecture

### Email Service (`server/src/lib/mail.ts`)

The email service provides:
- `initMailTransporter()`: Initialize nodemailer with Gmail SMTP
- `sendEmail()`: Core email sending function
- `sendMentionEmail()`: Template for mention notifications
- `sendTaskStatusEmail()`: Template for task status notifications

### Integration Points

1. **Chat mentions** (`server/src/chats/index.ts`):
   - Triggered after creating mention notifications
   - Sends emails to all mentioned users
   - Non-blocking (uses Promise.all without await)

2. **Task status updates** (`server/src/tasks/index.ts`):
   - Triggered when task status changes
   - Sends emails to project members
   - Non-blocking (uses Promise.all without await)

### Error Handling

- Email failures are logged but don't block the main request
- Users still receive in-app and real-time notifications even if email fails
- Email sending happens asynchronously after the API response

## Security Considerations

⚠️ **Never commit your `.env` file or App Password to version control**

- Keep `.env` in `.gitignore`
- Use environment variables in production
- Rotate App Passwords periodically
- Revoke App Passwords when no longer needed

## Alternative SMTP Providers

While this guide focuses on Gmail, you can use any SMTP provider by adjusting:

```bash
MAIL_HOST=smtp.your-provider.com
MAIL_PORT=587  # or 465 for SSL
MAIL_SECURE=true  # if using port 465
MAIL_USER=your-email@domain.com
MAIL_PASSWORD=your-password
```

Common providers:
- **Outlook/Office365**: `smtp.office365.com:587`
- **SendGrid**: `smtp.sendgrid.net:587`
- **Mailgun**: `smtp.mailgun.org:587`
- **Amazon SES**: Regional endpoints

## Support

For issues or questions:
- Check server logs for detailed error messages
- Review the Gmail App Password setup guide
- Ensure all environment variables are correctly set
- Test with a simple email first before debugging mentions/tasks
