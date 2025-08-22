# Email Integration Options for SharePay Invites

## Option 1: Firebase Functions + SendGrid (Recommended)

### Setup Steps:
1. **Install Firebase Functions:**
   ```bash
   npm install -g firebase-tools
   firebase init functions
   ```

2. **Add SendGrid to Functions:**
   ```bash
   cd functions
   npm install @sendgrid/mail
   ```

3. **Create Function:**
   ```javascript
   // functions/src/index.ts
   import * as functions from 'firebase-functions';
   import * as sgMail from '@sendgrid/mail';

   sgMail.setApiKey(functions.config().sendgrid.key);

   export const sendInviteEmail = functions.firestore
     .document('invites/{inviteId}')
     .onCreate(async (snap, context) => {
       const invite = snap.data();
       
       const msg = {
         to: invite.toEmail,
         from: 'noreply@sharepay.app', // Your verified sender
         subject: `${invite.fromUserEmail} invited you to SharePay!`,
         html: `
           <h2>🎉 You're invited to SharePay!</h2>
           <p><strong>${invite.fromUserEmail}</strong> wants to split expenses with you.</p>
           <p>${invite.message}</p>
           <a href="${invite.inviteLink}" style="background: linear-gradient(45deg, #3B82F6, #8B5CF6); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0;">
             Join SharePay
           </a>
           <p>SharePay makes splitting expenses with friends easy and fair.</p>
         `
       };

       await sgMail.send(msg);
     });
   ```

4. **Deploy:**
   ```bash
   firebase deploy --only functions
   firebase functions:config:set sendgrid.key="YOUR_SENDGRID_API_KEY"
   ```

### Cost: 
- SendGrid: Free for 100 emails/day, $19.95/month for 50K emails
- Firebase Functions: Free for 2M invocations/month

## Option 2: Next.js API Route + Resend

### Setup Steps:
1. **Install Resend:**
   ```bash
   npm install resend
   ```

2. **Create API Route:**
   ```javascript
   // src/app/api/send-invite/route.ts
   import { Resend } from 'resend';

   const resend = new Resend(process.env.RESEND_API_KEY);

   export async function POST(request: Request) {
     const { toEmail, fromEmail, message, inviteLink } = await request.json();

     await resend.emails.send({
       from: 'SharePay <invites@sharepay.app>',
       to: toEmail,
       subject: `${fromEmail} invited you to SharePay!`,
       html: `
         <h2>🎉 You're invited to SharePay!</h2>
         <p><strong>${fromEmail}</strong> wants to split expenses with you.</p>
         <p>${message}</p>
         <a href="${inviteLink}">Join SharePay</a>
       `
     });

     return Response.json({ success: true });
   }
   ```

3. **Update Invite Dialog:**
   ```javascript
   // In invite-dialog.tsx
   const response = await fetch('/api/send-invite', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       toEmail: email,
       fromEmail: user.email,
       message: values.message,
       inviteLink
     })
   });
   ```

### Cost:
- Resend: Free for 3K emails/month, $20/month for 50K emails

## Option 3: Client-Side mailto: Links

### Simple Implementation:
```javascript
const handleEmailInvite = (email: string) => {
  const subject = `You're invited to SharePay!`;
  const body = `Hi!\n\n${user?.email} invited you to join SharePay to split expenses together.\n\n${values.message}\n\nClick here to join: ${inviteLink}\n\nBest regards,\nSharePay Team`;
  
  window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
};
```

### Cost: Free (uses user's email client)

## Option 4: Third-Party Email Services

### Services to Consider:
- **EmailJS**: Browser-based, $15/month for 10K emails
- **Mailgun**: $35/month for 50K emails  
- **Amazon SES**: $0.10 per 1K emails
- **Postmark**: $15/month for 10K emails

## Recommendation

For **production SharePay**, I recommend:

1. **Start with Option 3** (mailto links) - Free and works immediately
2. **Upgrade to Option 2** (Resend) when you have users - Professional and reliable
3. **Consider Option 1** (Firebase Functions) if you need advanced email automation

Would you like me to implement any of these options?