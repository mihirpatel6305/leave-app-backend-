const nodemailer = require("nodemailer");

const sendEmail = async ({ from,to, subject, text, html }) => {
  const transporter = nodemailer.createTransport({
    service: "Gmail", // or "Yahoo", or use host/port for SMTP
    auth: {
      user: process.env.EMAIL_USER, // your email
      pass: process.env.EMAIL_PASS, // your app password (not actual password)
    },
  });

  const mailOptions = {
    from: `"Leave App" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html, // optional
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
