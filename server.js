require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const twilio = require("twilio");

const app = express();
app.use(bodyParser.json());
app.use(cors());

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const serviceSid = process.env.TWILIO_SERVICE_SID;

const client = twilio(accountSid, authToken);

// Send OTP
app.post("/send-otp", async (req, res) => {
  const { phone } = req.body;

  try {
    await client.verify.v2.services(serviceSid)
      .verifications
      .create({ to: phone, channel: "sms" });

    res.json({ success: true, message: "OTP Sent" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify OTP
app.post("/verify-otp", async (req, res) => {
  const { phone, code } = req.body;

  try {
    const verification = await client.verify.v2.services(serviceSid)
      .verificationChecks
      .create({ to: phone, code: code });

    if (verification.status === "approved") {
      res.json({ success: true, message: "OTP Verified" });
    } else {
      res.json({ success: false, message: "Invalid OTP" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(3000, '0.0.0.0', () => {
  console.log("Server running ");
});

console.log(accountSid, authToken, serviceSid);