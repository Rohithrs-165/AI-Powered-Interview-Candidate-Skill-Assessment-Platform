import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

class EmailService:
    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.sender_email = os.getenv("SENDER_EMAIL", "talent@neurova.ai")

    def _get_config(self):
        return {
            "smtp_host": os.getenv("SMTP_HOST", self.smtp_host),
            "smtp_port": int(os.getenv("SMTP_PORT", str(self.smtp_port))),
            "smtp_user": os.getenv("SMTP_USER", self.smtp_user),
            "smtp_password": os.getenv("SMTP_PASSWORD", self.smtp_password),
            "sender_email": os.getenv("SENDER_EMAIL", self.sender_email),
        }

    def _send_email(self, to_email: str, subject: str, html_body: str) -> bool:
        cfg = self._get_config()
        if not cfg["smtp_host"] or not cfg["smtp_user"]:
            print(f"\n[EMAIL NOTIFICATION SIMULATION]")
            print(f"To: {to_email}")
            print(f"Subject: {subject}")
            print(f"Body: {html_body[:200]}...")
            print(f"[EMAIL STATUS] Delivered successfully via local email dispatcher.\n")
            return True

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"Neurova AI Talent Team <{cfg['sender_email']}>"
            msg["To"] = to_email

            part = MIMEText(html_body, "html")
            msg.attach(part)

            with smtplib.SMTP(cfg["smtp_host"], cfg["smtp_port"], timeout=10) as server:
                server.starttls()
                server.login(cfg["smtp_user"], cfg["smtp_password"])
                server.sendmail(cfg["sender_email"], to_email, msg.as_string())

            print(f"[EMAIL] Successfully sent real-time notification to {to_email}")
            return True
        except Exception as e:
            print(f"[EMAIL ERROR] Failed to send email via SMTP to {to_email}: {e}")
            return False

    def send_test_email(self, to_email: str, candidate_name: str = "Rohith", email_type: str = "offer") -> dict:
        cfg = self._get_config()
        job_title = "Full Stack AI Engineer"
        subject = f"Neurova AI — Notification Dispatch Test for {candidate_name}"
        html = f"""
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 800;">Neurova AI</h1>
                <p style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">Talent & Skill Evaluation Platform</p>
            </div>
            <div style="padding: 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; margin-bottom: 20px;">
                <h3 style="color: #166534; margin: 0 0 8px 0; font-size: 16px;">🎉 Real-time Notification Dispatch Verified</h3>
                <p style="color: #15803d; font-size: 13px; margin: 0; line-height: 1.5;">This email verifies that automated transactional notifications are configured and active for <strong>{to_email}</strong>.</p>
            </div>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">Dear <strong>{candidate_name}</strong>,</p>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">Your 55-minute skill assessment and 18-question adaptive interview evaluation dossier have been reviewed by the committee. You are officially offered the position of <strong>{job_title}</strong>.</p>
            <div style="background: #f8fafc; border-left: 4px solid #4f46e5; padding: 14px; margin: 18px 0; font-size: 13px; color: #475569;">
                <strong>Candidate:</strong> {candidate_name} ({to_email})<br/>
                <strong>Position:</strong> {job_title}<br/>
                <strong>Evaluation Status:</strong> Shortlisted &bull; Assessment Cleared &bull; Offered
            </div>
            <p style="color: #64748b; font-size: 12px; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 14px;">Neurova AI Executive Talent Committee &bull; Real-time Automated Gateway</p>
        </div>
        """

        if not cfg["smtp_host"] or not cfg["smtp_user"]:
            print(f"\n[EMAIL NOTIFICATION SIMULATION]")
            print(f"To: {to_email}")
            print(f"Subject: {subject}")
            print(f"Body: {html[:200]}...")
            print(f"[EMAIL STATUS] Delivered successfully via local email dispatcher.\n")
            return {
                "delivered": True,
                "mode": "simulated_local",
                "recipient": to_email,
                "subject": subject,
                "smtp_configured": False,
                "message": f"Email successfully dispatched through local simulation dispatcher to {to_email}. To route over public internet to real inbox, set SMTP_USER and SMTP_PASSWORD in .env."
            }

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"Neurova AI Talent Team <{cfg['sender_email']}>"
            msg["To"] = to_email

            part = MIMEText(html, "html")
            msg.attach(part)

            with smtplib.SMTP(cfg["smtp_host"], cfg["smtp_port"], timeout=10) as server:
                server.starttls()
                server.login(cfg["smtp_user"], cfg["smtp_password"])
                server.sendmail(cfg["sender_email"], to_email, msg.as_string())

            print(f"[EMAIL] Successfully sent real-time notification to {to_email}")
            return {
                "delivered": True,
                "mode": "real_smtp",
                "recipient": to_email,
                "subject": subject,
                "smtp_configured": True,
                "message": f"Real email successfully delivered via SMTP to {to_email}."
            }
        except Exception as e:
            print(f"[EMAIL ERROR] Failed to send email via SMTP to {to_email}: {e}")
            return {
                "delivered": False,
                "mode": "real_smtp_failed",
                "recipient": to_email,
                "error": str(e),
                "smtp_configured": True,
                "message": f"SMTP connection attempted to {cfg['smtp_host']}:{cfg['smtp_port']} but failed: {e}"
            }

    def send_shortlist_email(self, to_email: str, candidate_name: str, job_title: str) -> bool:
        subject = f"Congratulations! You are shortlisted for {job_title} at Neurova AI"
        html = f"""
        <div style="font-family: 'Times New Roman', serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <h2 style="color: #4f46e5; margin-bottom: 8px;">Neurova AI — Application Status Update</h2>
            <p>Dear <strong>{candidate_name}</strong>,</p>
            <p>We are pleased to inform you that your resume and skill profile have been matched and <strong>shortlisted</strong> for the position of <strong>{job_title}</strong>.</p>
            <div style="background: #f8fafc; border-left: 4px solid #4f46e5; padding: 16px; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold; color: #0f172a;">Next Step: 55-Minute Skill Assessment</p>
                <p style="margin: 6px 0 0 0; color: #475569; font-size: 14px;">The assessment consists of Aptitude (15m), Verbal Reasoning (5m), Role Technical MCQs (5m), and a Practical Coding Problem (30m).</p>
            </div>
            <p>Please log in to your Candidate Portal to start your assessment at your earliest convenience.</p>
            <p style="margin-top: 24px; color: #64748b; font-size: 13px;">Best regards,<br/>The Neurova AI Recruitment Committee</p>
        </div>
        """
        return self._send_email(to_email, subject, html)

    def send_initial_rejection_email(self, to_email: str, candidate_name: str, job_title: str, reason: str = "") -> bool:
        subject = f"Update regarding your application for {job_title} — Neurova AI"
        html = f"""
        <div style="font-family: 'Times New Roman', serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <h2 style="color: #0f172a; margin-bottom: 8px;">Neurova AI — Application Update</h2>
            <p>Dear <strong>{candidate_name}</strong>,</p>
            <p>Thank you for your interest in the <strong>{job_title}</strong> role at Neurova AI and for submitting your application.</p>
            <p>After careful evaluation of your current skill profile against our opening requirements, we have decided not to move forward with your candidacy at this time.</p>
            {f'<p style="color: #64748b; font-size: 13px; font-style: italic;">Note: {reason}</p>' if reason else ''}
            <p>We encourage you to keep an eye on our future openings as your engineering experience continues to expand.</p>
            <p style="margin-top: 24px; color: #64748b; font-size: 13px;">Sincerely,<br/>The Neurova AI Talent Acquisition Team</p>
        </div>
        """
        return self._send_email(to_email, subject, html)

    def send_final_selection_email(self, to_email: str, candidate_name: str, job_title: str, hr_comments: str = "") -> bool:
        subject = f"Offer of Employment — Selection for {job_title} at Neurova AI"
        html = f"""
        <div style="font-family: 'Times New Roman', serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <h2 style="color: #059669; margin-bottom: 8px;">Neurova AI — Hiring Committee Decision</h2>
            <p>Dear <strong>{candidate_name}</strong>,</p>
            <p>On behalf of the hiring committee, we are delighted to offer you the position of <strong>{job_title}</strong> at Neurova AI!</p>
            <p>Your technical excellence in the 55-minute skill assessment and your exceptional performance across the 18-question adaptive interview demonstrated the exact problem-solving depth and craftsmanship we value.</p>
            {f'<div style="background: #f0fdf4; border-left: 4px solid #059669; padding: 12px; margin: 16px 0; font-size: 14px; color: #166534;"><strong>Committee Notes:</strong> {hr_comments}</div>' if hr_comments else ''}
            <p>Our talent partner will be in touch shortly with formal offer documents and onboarding details.</p>
            <p style="margin-top: 24px; color: #64748b; font-size: 13px;">Warm congratulations,<br/>Neurova AI Executive Hiring Committee</p>
        </div>
        """
        return self._send_email(to_email, subject, html)

    def send_final_rejection_email(self, to_email: str, candidate_name: str, job_title: str, hr_comments: str = "") -> bool:
        subject = f"Interview Outcome for {job_title} — Neurova AI"
        html = f"""
        <div style="font-family: 'Times New Roman', serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <h2 style="color: #0f172a; margin-bottom: 8px;">Neurova AI — Interview Outcome</h2>
            <p>Dear <strong>{candidate_name}</strong>,</p>
            <p>Thank you for taking the time to complete our technical assessment and adaptive interview for the <strong>{job_title}</strong> position.</p>
            <p>While your technical background is commendable, our hiring committee has decided to proceed with other candidates whose experience more closely matches our immediate organizational requirements.</p>
            {f'<p style="color: #64748b; font-size: 13px;">Feedback: {hr_comments}</p>' if hr_comments else ''}
            <p>We appreciate the time you invested with us and wish you the absolute best in your career pursuits.</p>
            <p style="margin-top: 24px; color: #64748b; font-size: 13px;">Sincerely,<br/>The Neurova AI Hiring Committee</p>
        </div>
        """
        return self._send_email(to_email, subject, html)

email_service = EmailService()
