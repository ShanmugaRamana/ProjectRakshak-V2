const twilio = require('twilio');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

// Initialize the Twilio client with your credentials from the .env file
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);

const sendResolutionSMS = async (reporterNumber, person) => {
    // 1. Check if all required credentials are present
    if (!accountSid || !authToken || !process.env.TWILIO_PHONE_NUMBER) {
        console.error('[SMS_ERROR] Twilio credentials are missing from the .env file.');
        return;
    }
    if (!reporterNumber || !person) {
        console.error('[SMS_ERROR] Missing reporter number or person details for SMS.');
        return;
    }

    // 2. Construct the message body
    const messageBody = `Dear Sir/Madam, the person you reported, ${person.fullName}, has been found. Identification: ${person.identificationDetails}. You can contact the help booth at ${person.boothOfficerContact}. Thank you, Project Rakshak Team.`;

    // 3. Format the recipient's phone number to E.164 format (e.g., +919789456070)
    // We assume the numbers are Indian, so we add the +91 prefix.
    const toPhoneNumber = `+91${reporterNumber.slice(-10)}`;
    const fromPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    console.log(`[SMS_INFO] Preparing to send SMS via Twilio from ${fromPhoneNumber} to ${toPhoneNumber}`);

    // 4. Send the SMS using an async/await try-catch block
    try {
        const message = await twilioClient.messages.create({
            body: messageBody,
            from: fromPhoneNumber,
            to: toPhoneNumber
        });
        console.log('[SMS_SUCCESS] SMS sent successfully via Twilio. Message SID:', message.sid);
    } catch (error) {
        // Log the detailed error message from the Twilio server
        console.error('[SMS_ERROR] Failed to send SMS via Twilio. Error:', error.message);
    }
};

module.exports = { sendResolutionSMS };