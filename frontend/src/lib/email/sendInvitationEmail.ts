import { Resend } from "resend"; // Adjust the import path as needed

export async function sendInvitationEmail(email: string, inviteLink: string): Promise<void> {
    const fromEmail = process.env.NEXT_PUBLIC_FROM_EMAIL || 'service@metrichub.com';
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: 'You have been invited to join a company on MetricHub',
    html: `
    <p>You have been invited to join a company on MetricHub.</p>
    <p>Click the link below to accept the invitation:</p>
    <p><a href="${inviteLink}">Accept Invitation</a></p>
    <p>If you did not expect this email, you can ignore it.</p>
    <p>Thank you!</p>`,
 });
}