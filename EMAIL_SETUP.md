# Email Confirmation Setup Guide

## 🔧 **Supabase Email Configuration**

### **Step 1: Configure Email Settings in Supabase Dashboard**

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project

2. **Navigate to Authentication > Settings**
   - Click on "Authentication" in the sidebar
   - Click on "Settings" tab

3. **Enable Email Confirmations**
   - ✅ **Enable email confirmations**: Turn ON
   - ✅ **Secure email change**: Turn ON
   - ✅ **Double confirm changes**: Turn ON

### **Step 2: Configure SMTP Settings**

#### **Option A: Gmail SMTP (Recommended for testing)**
```
SMTP Host: smtp.gmail.com
Port: 587
Username: your-email@gmail.com
Password: your-app-password (not your regular password)
```

**To get Gmail App Password:**
1. Go to Google Account settings
2. Enable 2-factor authentication
3. Generate an App Password for "Mail"
4. Use that password in Supabase

#### **Option B: SendGrid**
```
SMTP Host: smtp.sendgrid.net
Port: 587
Username: apikey
Password: your-sendgrid-api-key
```

#### **Option C: Resend (Recommended for production)**
```
SMTP Host: smtp.resend.com
Port: 587
Username: resend
Password: your-resend-api-key
```

### **Step 3: Configure Email Templates**

#### **Confirm Signup Template:**
```html
<h2>Welcome to Forexcomplex!</h2>
<p>Please confirm your email address by clicking the link below:</p>
<p><a href="{{ .ConfirmationURL }}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Confirm Email Address</a></p>
<p>If the button doesn't work, copy and paste this link into your browser:</p>
<p>{{ .ConfirmationURL }}</p>
<p>This link will expire in 24 hours.</p>
```

#### **Email Change Template:**
```html
<h2>Email Change Request</h2>
<p>You requested to change your email address. Click the link below to confirm:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm Email Change</a></p>
```

### **Step 4: Test Email Configuration**

1. **Create a test user** in your application
2. **Check the email** (including spam folder)
3. **Click the confirmation link**
4. **Verify the user can log in** after confirmation

### **Step 5: Troubleshooting**

#### **Emails not sending:**
- Check SMTP settings in Supabase
- Verify SMTP credentials
- Check email provider limits

#### **Emails going to spam:**
- Add SPF/DKIM records to your domain
- Use a reputable email provider (Resend, SendGrid)
- Avoid spam trigger words in templates

#### **Confirmation links not working:**
- Check redirect URL settings
- Verify domain is allowed in Supabase
- Check browser console for errors

#### **Users can't login after confirmation:**
- Check if email is actually confirmed in Supabase
- Verify user profile was created
- Check authentication logs

### **Step 6: Production Recommendations**

1. **Use a professional email service** (Resend, SendGrid, Mailgun)
2. **Set up proper DNS records** (SPF, DKIM, DMARC)
3. **Monitor email delivery rates**
4. **Set up email templates** with your branding
5. **Configure proper redirect URLs** for your domain

### **Step 7: Environment Variables (Optional)**

For better security, you can use environment variables:

```env
# .env.local
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### **Step 8: Testing Checklist**

- [ ] Email confirmation is enabled in Supabase
- [ ] SMTP settings are configured
- [ ] Email templates are set up
- [ ] Test user can sign up
- [ ] Confirmation email is received
- [ ] Confirmation link works
- [ ] User can log in after confirmation
- [ ] Error handling works for unconfirmed users

## 🚀 **Quick Test**

1. **Sign up with a real email address**
2. **Check your inbox** (and spam folder)
3. **Click the confirmation link**
4. **Try logging in** with the same credentials

If everything works, your email confirmation is properly configured!

## 📞 **Need Help?**

If you're still having issues:
1. Check Supabase logs in the dashboard
2. Verify SMTP credentials
3. Test with a different email provider
4. Check browser console for errors
5. Ensure your domain is properly configured 