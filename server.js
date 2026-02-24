require("dotenv").config();
const express = require("express");
const cors = require("cors");
const twilio = require("twilio");

const app = express();
app.use(express.json());
app.use(cors());

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const serviceSid = process.env.TWILIO_SERVICE_SID;

if (!accountSid || !authToken || !serviceSid) {
  console.error("❌ Missing Twilio ENV variables");
  process.exit(1);
}

const client = twilio(accountSid, authToken);

// In-memory cooldown protection
const cooldownMap = new Map();
const COOLDOWN_TIME = 30000; // 30 seconds

// Health check
app.get("/", (req, res) => {
  res.send("OTP Server Running 🚀");
});

// Send OTP
app.post("/send-otp", async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({
      success: false,
      message: "Phone number required"
    });
  }

  // Basic phone validation
  if (!phone.startsWith("+") || phone.length < 12) {
    return res.status(400).json({
      success: false,
      message: "Invalid phone format"
    });
  }

  // Cooldown check
  const lastRequest = cooldownMap.get(phone);
  if (lastRequest && Date.now() - lastRequest < COOLDOWN_TIME) {
    return res.status(429).json({
      success: false,
      message: "Please wait before requesting OTP again"
    });
  }

  try {
    console.log("📲 Sending OTP to:", phone);

    const verification = await client.verify.v2
      .services(serviceSid)
      .verifications
      .create({ to: phone, channel: "sms" });

    cooldownMap.set(phone, Date.now());

    res.json({
      success: true,
      message: "OTP Sent",
      sid: verification.sid
    });

  } catch (error) {
    console.error("❌ Twilio Error:", error.code, error.message);

    // Handle common Twilio errors
    if (error.code === 20429) {
      return res.status(429).json({
        success: false,
        message: "Too many requests. Try again later."
      });
    }

    if (error.code === 60203) {
      return res.status(429).json({
        success: false,
        message: "Max OTP attempts reached. Please wait."
      });
    }

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Verify OTP
app.post("/verify-otp", async (req, res) => {
  const { phone, code } = req.body;

  if (!phone || !code) {
    return res.status(400).json({
      success: false,
      message: "Phone and OTP required"
    });
  }

  try {
    console.log("🔐 Verifying OTP for:", phone);

    const verification = await client.verify.v2
      .services(serviceSid)
      .verificationChecks
      .create({ to: phone, code });

    if (verification.status === "approved") {
      return res.json({
        success: true,
        message: "OTP Verified"
      });
    } else {
      return res.json({
        success: false,
        message: "Invalid OTP"
      });
    }

  } catch (error) {
    console.error("❌ Verify Error:", error.code, error.message);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});