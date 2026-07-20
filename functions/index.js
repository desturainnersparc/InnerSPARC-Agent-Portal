const { onUserCreated } = require("firebase-functions/v2/identity");
const { defineSecret } = require("firebase-functions/params");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");

admin.initializeApp();

const sendgridApiKey = defineSecret("SENDGRID_API_KEY");

exports.sendWelcomeEmail = onUserCreated({
  secrets: [sendgridApiKey],
}, async (event) => {
  const user = event.data;

  if (!user || !user.email) {
    logger.info("Skipped: no email on user", { uid: user?.uid || null });
    return;
  }

  sgMail.setApiKey(sendgridApiKey.value());

  const msg = {
    to: user.email,
    from: {
      email: "gerodsantos05@gmail.com",
      name: "Inner SPARC Portal",
    },
    subject: "Welcome to Inner SPARC Portal!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;">
        <h2>Hi ${user.displayName || "there"}!</h2>
        <p>Welcome to <strong>Inner SPARC Portal</strong>. We're glad you're here!</p>
        <p>You signed in using: <strong>${user.email}</strong></p>
        <br/>
        <p>If you have any questions, feel free to reach out.</p>
        <p>- The Inner SPARC Team</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    logger.info("Welcome email sent", { uid: user.uid, email: user.email });

    await admin.firestore().collection("emailLogs").add({
      uid: user.uid,
      email: user.email,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "sent",
    });
  } catch (error) {
    logger.error("Failed to send welcome email", {
      uid: user.uid,
      email: user.email,
      message: error?.message || "Unknown error",
    });

    await admin.firestore().collection("emailLogs").add({
      uid: user.uid,
      email: user.email,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "failed",
      error: error?.message || "Unknown error",
    });
  }
});
