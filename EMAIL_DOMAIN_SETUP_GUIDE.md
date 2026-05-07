# Email Domain Setup Guide - property360.africa

This guide will help you configure `property360.africa` domain for sending emails through SendGrid to ensure high deliverability and avoid spam folders.

---

## 1. Domain Authentication (Critical for Avoiding Spam)

### A. SendGrid Domain Authentication

Domain authentication proves to email providers that you own the domain and are authorized to send emails from it.

#### Steps:

1. **Login to SendGrid Dashboard**
   - Go to https://app.sendgrid.com
   - Navigate to **Settings** → **Sender Authentication**

2. **Authenticate Your Domain**
   - Click **"Authenticate Your Domain"**
   - Select **"Yes"** when asked if you use a DNS host
   - Enter domain: `property360.africa`
   - Click **"Next"**

3. **Add DNS Records**

   SendGrid will provide you with DNS records to add. You'll need to add these to your domain registrar (Namecheap, GoDaddy, Cloudflare, etc.):

   **Example DNS Records (yours will be different):**

   | Type | Host | Value | TTL |
   |------|------|-------|-----|
   | CNAME | `s1._domainkey.property360.africa` | `s1.domainkey.u12345.wl.sendgrid.net` | 3600 |
   | CNAME | `s2._domainkey.property360.africa` | `s2.domainkey.u12345.wl.sendgrid.net` | 3600 |
   | CNAME | `em1234.property360.africa` | `u12345.wl.sendgrid.net` | 3600 |

4. **Verify DNS Records**
   - Wait 24-48 hours for DNS propagation (usually faster)
   - Click **"Verify"** in SendGrid
   - Status should show as **"Verified"** ✓

---

## 2. SPF (Sender Policy Framework) Record

SPF tells receiving mail servers which IP addresses are allowed to send email from your domain.

### Add SPF Record

In your DNS settings, add a **TXT record**:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| TXT | `@` or `property360.africa` | `v=spf1 include:sendgrid.net ~all` | 3600 |

**Note:** If you already have an SPF record, add `include:sendgrid.net` to the existing record. You can only have ONE SPF record per domain.

Example combined SPF:
```
v=spf1 include:sendgrid.net include:_spf.google.com ~all
```

---

## 3. DKIM (DomainKeys Identified Mail)

DKIM adds a digital signature to your emails. SendGrid automatically configures this when you authenticate your domain (Step 1).

**No additional action needed** - handled by domain authentication.

---

## 4. DMARC (Domain-based Message Authentication)

DMARC builds on SPF and DKIM to prevent email spoofing.

### Add DMARC Record

In your DNS settings, add a **TXT record**:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| TXT | `_dmarc` or `_dmarc.property360.africa` | `v=DMARC1; p=none; rua=mailto:postmaster@property360.africa` | 3600 |

**DMARC Policy Options:**
- `p=none` - Monitor only (recommended initially)
- `p=quarantine` - Send suspicious emails to spam
- `p=reject` - Reject suspicious emails entirely

Start with `p=none` to monitor, then upgrade to `p=quarantine` or `p=reject` after a few weeks.

---

## 5. Update Environment Variables

Update your `.env.dev` and `.env.prod` files:

```bash
# SendGrid Configuration
SENDGRID_API_KEY=SG.your_actual_api_key_here
SENDGRID_FROM_EMAIL=noreply@property360.africa
SENDGRID_FROM_NAME=Property360

# Alternative sender addresses (optional)
# SENDGRID_FROM_EMAIL=hello@property360.africa
# SENDGRID_FROM_EMAIL=support@property360.africa
# SENDGRID_FROM_EMAIL=notifications@property360.africa
```

---

## 6. Create Verified Sender Identity

Even with domain authentication, SendGrid requires verified sender identities.

### Steps:

1. Go to SendGrid Dashboard → **Settings** → **Sender Authentication**
2. Under **Single Sender Verification**, click **"Create New Sender"**
3. Fill in the form:
   - **From Name:** Property360
   - **From Email:** noreply@property360.africa
   - **Reply To:** support@property360.africa (if you have support email)
   - **Company Address:** Your business address in Nigeria
   - **Nickname:** Property360 Notifications
4. Check the verification email sent to `noreply@property360.africa`
5. Click the verification link

**Important:** You need to be able to receive emails at `noreply@property360.africa` to verify. If you can't receive at noreply@, use a different address like `hello@property360.africa`.

---

## 7. Email Best Practices to Avoid Spam

### A. Email Content
- ✅ **Use professional HTML templates** (already implemented)
- ✅ **Include plain text version** (already implemented)
- ✅ **Add unsubscribe link** for marketing emails
- ✅ **Include physical address** in footer (already in templates)
- ❌ Avoid spam trigger words: "FREE!!!", "Click here NOW!", excessive caps
- ❌ Don't use URL shorteners
- ✅ Keep good text-to-image ratio (already good)

### B. List Hygiene
- Remove invalid/bounced email addresses
- Don't send to purchased lists
- Implement email verification before adding to lists

### C. Sending Behavior
- Start with low volume and gradually increase
- Monitor bounce rates (keep under 5%)
- Monitor complaint rates (keep under 0.1%)
- Use consistent "From" name and email

---

## 8. Configure Custom Reply-To (Optional)

If you want users to reply to a different email address:

```typescript
// In EmailOtpService.ts
const msg = {
  to: email,
  from: {
    email: this.fromEmail,
    name: this.fromName,
  },
  replyTo: 'support@property360.africa', // Add this
  subject: 'Your Property360 Verification Code',
  // ... rest of config
};
```

---

## 9. Monitoring & Testing

### A. Test Email Deliverability

Use these tools to test your emails:

1. **Mail Tester** - https://www.mail-tester.com
   - Send a test email to the provided address
   - Get a spam score out of 10
   - Aim for 8+/10

2. **MXToolbox** - https://mxtoolbox.com/SuperTool.aspx
   - Check SPF: `nslookup -type=txt property360.africa`
   - Check DMARC: `nslookup -type=txt _dmarc.property360.africa`

3. **Google Postmaster Tools** - https://postmaster.google.com
   - Monitor Gmail deliverability
   - Track spam rates and domain reputation

### B. Monitor SendGrid Statistics

In SendGrid Dashboard → **Statistics**:
- **Delivered Rate** - Should be >95%
- **Bounce Rate** - Should be <5%
- **Spam Report Rate** - Should be <0.1%
- **Open Rate** - Industry average: 15-25%

---

## 10. Implementation Checklist

### Pre-Launch Checklist

- [ ] Domain authentication completed in SendGrid
- [ ] SPF record added to DNS
- [ ] DMARC record added to DNS
- [ ] DKIM configured (via domain authentication)
- [ ] Verified sender identity created
- [ ] Environment variables updated with new domain
- [ ] Test email sent and checked with Mail Tester (score 8+)
- [ ] Reply-to address configured (optional)
- [ ] Email templates reviewed for spam triggers
- [ ] Unsubscribe mechanism implemented for marketing emails

### Post-Launch Monitoring

- [ ] Week 1: Check deliverability stats daily
- [ ] Week 2-4: Monitor bounce/complaint rates
- [ ] Month 1: Review DMARC reports
- [ ] Month 2: Consider upgrading DMARC policy to `p=quarantine`
- [ ] Month 3+: Upgrade to `p=reject` if all metrics are good

---

## 11. Recommended Email Addresses to Set Up

Configure these email addresses on your domain (via email forwarding or mailboxes):

| Email | Purpose | Forwards To |
|-------|---------|-------------|
| `noreply@property360.africa` | System notifications | (verification only) |
| `hello@property360.africa` | General inquiries | Your main email |
| `support@property360.africa` | Customer support | Support team |
| `admin@property360.africa` | Administrative | Admin team |
| `postmaster@property360.africa` | DMARC reports | Your main email |

---

## 12. DNS Configuration Summary

Here's what your final DNS should look like:

```dns
# Domain Authentication (from SendGrid)
CNAME  s1._domainkey.property360.africa  →  s1.domainkey.u12345.wl.sendgrid.net
CNAME  s2._domainkey.property360.africa  →  s2.domainkey.u12345.wl.sendgrid.net
CNAME  em1234.property360.africa         →  u12345.wl.sendgrid.net

# SPF
TXT    @                                  →  v=spf1 include:sendgrid.net ~all

# DMARC
TXT    _dmarc.property360.africa         →  v=DMARC1; p=none; rua=mailto:postmaster@property360.africa
```

---

## 13. Troubleshooting

### Emails Going to Spam?

1. **Check domain authentication status** in SendGrid
2. **Verify DNS records** are properly configured
3. **Test with Mail Tester** - identify specific issues
4. **Review email content** - remove spam trigger words
5. **Check sender reputation** - use Google Postmaster Tools
6. **Warm up your domain** - start with low volume

### DNS Not Propagating?

- Wait 24-48 hours (can take time)
- Use `nslookup` or `dig` to check records
- Clear DNS cache: `ipconfig /flushdns` (Windows) or `sudo dscacheutil -flushcache` (Mac)

### SendGrid Verification Failing?

- Double-check DNS records match exactly what SendGrid provided
- Ensure no typos in CNAME values
- Check with your DNS provider (some have specific formatting)

---

## 14. Additional Resources

- **SendGrid Documentation:** https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication
- **SPF Record Guide:** https://www.spf-record.com/
- **DMARC Guide:** https://dmarc.org/overview/
- **Email Deliverability Best Practices:** https://sendgrid.com/blog/email-deliverability-guide/

---

## Next Steps

1. **Authenticate your domain** in SendGrid (most important!)
2. **Add DNS records** (SPF, DMARC, DKIM via SendGrid)
3. **Update environment variables** with `noreply@property360.africa`
4. **Create verified sender** in SendGrid
5. **Send test emails** and check with Mail Tester
6. **Monitor deliverability** in first few weeks

---

**Need Help?**

If you encounter issues:
- Contact SendGrid Support: https://support.sendgrid.com
- Check DNS propagation: https://dnschecker.org
- Test email health: https://www.mail-tester.com

---

*Last Updated: April 2026*
