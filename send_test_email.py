#!/usr/bin/env python3
"""
Neurova AI — Real-time Email Notification Verification CLI
Tests real-time email dispatch to candidates (e.g. rohithdeva29@gmail.com)
Usage:
    python send_test_email.py --to rohithdeva29@gmail.com
    python send_test_email.py --to rohithdeva29@gmail.com --user myemail@gmail.com --password "xxxx xxxx xxxx xxxx"
"""

import os
import sys
import argparse

# Add backend to path
BACKEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_DIR, ".env"))
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
load_dotenv()

from app.services.email_service import email_service

def main():
    parser = argparse.ArgumentParser(description="Test Neurova AI Email Notification Dispatch")
    parser.add_argument("--to", default="rohithdeva29@gmail.com", help="Recipient email address")
    parser.add_argument("--name", default="Rohith", help="Candidate full name")
    parser.add_argument("--host", default=None, help="SMTP Host (e.g. smtp.gmail.com)")
    parser.add_argument("--port", default=None, help="SMTP Port (e.g. 587)")
    parser.add_argument("--user", default=None, help="SMTP Username / Email")
    parser.add_argument("--password", default=None, help="SMTP App Password")
    args = parser.parse_args()

    # Override environment variables if supplied
    if args.host:
        os.environ["SMTP_HOST"] = args.host
    if args.port:
        os.environ["SMTP_PORT"] = args.port
    if args.user:
        os.environ["SMTP_USER"] = args.user
        os.environ["SENDER_EMAIL"] = args.user
    if args.password:
        os.environ["SMTP_PASSWORD"] = args.password

    print("=" * 65)
    print("  Neurova AI — Real-Time Email Dispatch Diagnostic")
    print("=" * 65)
    print(f"Target Recipient : {args.to}")
    print(f"Candidate Name   : {args.name}")
    
    cfg = email_service._get_config()
    smtp_configured = bool(cfg.get("smtp_host") and cfg.get("smtp_user") and cfg.get("smtp_password"))
    
    print(f"SMTP Host        : {cfg.get('smtp_host') or '(Not set - using local dispatcher)'}")
    print(f"SMTP User        : {cfg.get('smtp_user') or '(Not set)'}")
    print(f"SMTP Active      : {'YES (Live Internet SMTP)' if smtp_configured else 'NO (Local Simulation Logger)'}")
    print("-" * 65)

    result = email_service.send_test_email(to_email=args.to, candidate_name=args.name, email_type="offer")

    print("\nDispatch Result Summary:")
    print(f"  Delivered       : {result.get('delivered')}")
    print(f"  Delivery Mode   : {result.get('mode')}")
    print(f"  Message         : {result.get('message')}")
    if result.get("error"):
        print(f"  Error Details   : {result.get('error')}")

    print("\n" + "=" * 65)
    if not smtp_configured:
        print("NOTE: To send live emails over the internet directly to your")
        print(f"Gmail inbox ({args.to}), provide Gmail SMTP credentials:")
        print("  1. In backend/.env:")
        print("     SMTP_HOST=smtp.gmail.com")
        print("     SMTP_PORT=587")
        print("     SMTP_USER=your-email@gmail.com")
        print("     SMTP_PASSWORD=your-16-char-app-password")
        print("     SENDER_EMAIL=your-email@gmail.com")
        print("  2. Or run CLI with arguments:")
        print("     python send_test_email.py --user your-email@gmail.com --password 'xxxx xxxx xxxx xxxx'")
    else:
        print("SUCCESS: Email sent through live SMTP server.")
    print("=" * 65)

if __name__ == "__main__":
    main()
