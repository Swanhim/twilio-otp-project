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

// Health check route (optional but good for Render)
app.get("/", (req, res) => {
  res.send("OTP Server Running 🚀");
});

// Send OTP
app.post("/send-otp", async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ success: false, message: "Phone number required" });
  }

  try {
    await client.verify.v2.services(serviceSid)
      .verifications
      .create({ to: phone, channel: "sms" });

    res.json({ success: true, message: "OTP Sent" });
  } catch (error) {
    console.error("Send OTP Error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify OTP
app.post("/verify-otp", async (req, res) => {
  const { phone, code } = req.body;

  if (!phone || !code) {
    return res.status(400).json({ success: false, message: "Phone and OTP required" });
  }

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
    console.error("Verify OTP Error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🔥 Render Compatible PORT
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});