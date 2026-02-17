import ejs from "ejs";
import nodemailer from "nodemailer";
import path from "path";
import { retryAsync, withTimeout } from "@/utils/resilience";

const __dirname = process.cwd();
const templatesPath = path.join(__dirname, "public/templates");

interface EmailService {
	email: string;
	emailSubject: string;
	template: string;
	data?: any;
	user?: string;
	password?: string;
	emailFrom?: string;
}

const sendEmail = async ({
	email,
	emailSubject,
	template,
	data,
	user = process.env.EMAIL_SERVER_USER,
	password = process.env.EMAIL_SERVER_PASSWORD,
	emailFrom = process.env.EMAIL_FROM
}: EmailService) => {
	// Configure your email transporter (replace placeholders with actual values)
	const transporter = nodemailer.createTransport({
		host: process.env.EMAIL_SERVER_HOST,
		port: Number(process.env.EMAIL_SERVER_PORT),
		auth: {
			user,
			pass: password
		},
		secure: false
	});

	const html = await ejs.renderFile(path.join(templatesPath, `${template}.ejs`), data, {
		async: true
	});

	// Email content
	const mailOptions = {
		from: emailFrom,
		to: email,
		reply_to: emailFrom,
		subject: emailSubject,
		html
	};

	// Send the email
	try {
		const report = await retryAsync(
			() =>
				withTimeout(
					() => transporter.sendMail(mailOptions),
					10000,
					"Email provider timed out while sending message"
				),
			{
				attempts: 3,
				backoffMs: 250,
				retryIf: () => true
			}
		);
		console.log("Email sent: %s", report.messageId);
		return Promise.resolve(report);
	} catch (error) {
		return Promise.reject(error);
	}
};

export default sendEmail;
