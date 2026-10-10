"""Check Gmail SMTP authentication without sending any email."""
import getpass
import os
import smtplib
import ssl

email = os.environ.get("CAMPUS_SMTP_USER", "emmanuelcash.x@gmail.com")
password = os.environ.get("CAMPUS_SMTP_PASSWORD") or getpass.getpass("Gmail App Password: ")
try:
    with smtplib.SMTP("smtp.gmail.com", 587, timeout=20) as connection:
        connection.ehlo()
        connection.starttls(context=ssl.create_default_context())
        connection.ehlo()
        connection.login(email, password.replace(" ", ""))
        print("Gmail SMTP authentication succeeded. No email was sent.")
except (smtplib.SMTPException, OSError):
    print("Gmail SMTP authentication failed. Check the App Password and connection.")
    raise SystemExit(1)
finally:
    password = None
