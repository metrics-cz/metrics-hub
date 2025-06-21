import { Resend } from "resend";

interface InvitationEmailData {
  to: string;
  companyName: string;
  inviterEmail: string;
  role: string;
  message?: string;
  invitationId: string;
}

export async function sendInvitationEmail(data: InvitationEmailData): Promise<void> {
  const fromEmail = process.env.NEXT_PUBLIC_FROM_EMAIL || 'noreply@metrichub.com';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const acceptUrl = `${siteUrl}/en/invitations/${data.invitationId}`;
  
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  await resend.emails.send({
    from: fromEmail,
    to: data.to,
    subject: `Invitation to join ${data.companyName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You're invited to join ${data.companyName}!</h2>
        
        <p>Hi there!</p>
        
        <p><strong>${data.inviterEmail}</strong> has invited you to join <strong>${data.companyName}</strong> as a ${data.role}.</p>
        
        ${data.message ? `
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Personal message:</strong></p>
            <p style="font-style: italic;">"${data.message}"</p>
          </div>
        ` : ''}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${acceptUrl}" 
             style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Accept Invitation
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          This invitation will expire in 7 days. If you don't have an account yet, you'll need to register first.
        </p>
        
        <p style="color: #666; font-size: 12px;">
          If you didn't expect this email, you can safely ignore it.
        </p>
      </div>
    `,
  });
}