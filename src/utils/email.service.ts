import { transporter } from "../lib/nodemailer";
import config from "../config";

export const sendEmail = async (to: string, subject: string, html: string) => {
	try {
		await transporter.sendMail({
			from: `"NagarFix Platform" <${config.smtp_user}>`,
			to,
			subject,
			html,
		});
	} catch (error) {
		console.error("Error sending email:", error);
		// Don't throw error to prevent failing the main transaction
	}
};

export const sendIssueResolvedEmail = async (
	to: string,
	userName: string,
	issueTitle: string,
	trackingNumber: string,
) => {
	const subject = `Your Issue "${issueTitle}" Has Been Resolved!`;
	const html = `
		<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
			<h2>Hello ${userName},</h2>
			<p>Great news! Your reported issue <strong>"${issueTitle}"</strong> (Tracking Number: ${trackingNumber}) has been resolved by our team.</p>
			<p>You can view the resolution details and provide feedback by logging into the NagarFix app.</p>
			<br />
			<p>Thank you for helping keep our city clean and safe!</p>
			<p><strong>- The NagarFix Team</strong></p>
		</div>
	`;
	await sendEmail(to, subject, html);
};
