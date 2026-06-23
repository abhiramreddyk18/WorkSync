import { sendDailySummary, sendWeeklySummary, emailStats, logAndSendMail } from '../services/emailscheduler.js';

export const triggerDailySummary = async (req, res) => {
    try {
        await sendDailySummary();
        return res.status(200).send({ message: 'Daily absentee summary triggered and sent successfully!', stats: emailStats });
    } catch (error) {
        console.error('Manual daily summary trigger error:', error);
        return res.status(500).send({ message: 'Error triggering daily summary', error: error.message });
    }
};

export const triggerWeeklySummary = async (req, res) => {
    try {
        await sendWeeklySummary();
        return res.status(200).send({ message: 'Weekly attendance report triggered and sent successfully!', stats: emailStats });
    } catch (error) {
        console.error('Manual weekly summary trigger error:', error);
        return res.status(500).send({ message: 'Error triggering weekly summary', error: error.message });
    }
};

export const sendTestEmail = async (req, res) => {
    const { toEmail } = req.body;
    if (!toEmail) {
        return res.status(400).send({ message: 'Target email is required.' });
    }
    try {
        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: toEmail,
            subject: 'WorkSync: SMTP Test Email',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #10b981; border-radius: 8px; background-color: #f0fdf4;">
                    <h2 style="color: #047857; text-align: center;">SMTP Configuration Successful!</h2>
                    <p>Hello,</p>
                    <p>This is a test email sent from your <strong>WorkSync</strong> employee management application.</p>
                    <p>If you received this email, it means your SMTP configuration details are working correctly and the server can send automatic notifications.</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #dcfce7; font-weight: bold; color: #14532d;">SMTP Host:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #dcfce7; color: #166534;">smtp-relay.brevo.com</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #dcfce7; font-weight: bold; color: #14532d;">Sender Email:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #dcfce7; color: #166534;">${process.env.SENDER_EMAIL}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #dcfce7; font-weight: bold; color: #14532d;">Sent At:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #dcfce7; color: #166534;">${new Date().toLocaleString('en-IN')}</td>
                        </tr>
                    </table>
                    <hr style="border: 0; border-top: 1px solid #bbf7d0; margin: 20px 0;" />
                    <p style="text-align: center; color: #86efac; font-size: 12px; margin: 0;">WorkSync automated system tests</p>
                </div>
            `
        };
        await logAndSendMail(mailOptions, 'test');
        return res.status(200).send({ message: `Test email sent successfully to ${toEmail}!`, stats: emailStats });
    } catch (error) {
        console.error('SMTP test email sending failed:', error);
        return res.status(500).send({ message: 'SMTP test email sending failed', error: error.message });
    }
};

export const getEmailStats = async (req, res) => {
    try {
        return res.status(200).send(emailStats);
    } catch (error) {
        return res.status(500).send({ message: 'Error retrieving email stats', error: error.message });
    }
};
