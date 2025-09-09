// First install Twilio SDK: npm install twilio
// Also install dotenv for environment variables: npm install dotenv
require('dotenv').config();
const twilio = require('twilio');

// Fetch Twilio credentials from environment variables
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Validate that all required environment variables are present
if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.error('❌ Missing required environment variables!');
    console.log('Please set the following in your .env file:');
    console.log('TWILIO_ACCOUNT_SID=your_account_sid');
    console.log('TWILIO_AUTH_TOKEN=your_auth_token');
    console.log('TWILIO_PHONE_NUMBER=your_twilio_phone_number');
    process.exit(1);
}

// Initialize Twilio client
const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

const sendResolutionSMS = async (reporterNumber, person) => {
    try {
        // Format the mobile number with country code
        const mobileNumber = reporterNumber.startsWith('+91') ? reporterNumber : `+91${reporterNumber.slice(-10)}`;
        
        // Create the message
        const message = `Dear Reporter,

Good news! The missing person case has been resolved.

Name: ${person.fullName}
ID: ${person.identificationDetails}
Contact: ${person.boothOfficerContact}

Thank you for your cooperation.`;

        console.log(`[SMS_INFO] Sending SMS via Twilio to ${mobileNumber}`);
        console.log(`[SMS_DEBUG] From: ${TWILIO_PHONE_NUMBER}`);
        console.log(`[SMS_DEBUG] Message length: ${message.length} characters`);

        // Send SMS using Twilio
        const twilioMessage = await client.messages.create({
            body: message,
            from: TWILIO_PHONE_NUMBER,
            to: mobileNumber
        });

        console.log('[SMS_SUCCESS] ✅ Twilio SMS sent successfully!');
        console.log(`[SMS_SUCCESS] Message SID: ${twilioMessage.sid}`);
        console.log(`[SMS_SUCCESS] Status: ${twilioMessage.status}`);
        
        return {
            success: true,
            messageSid: twilioMessage.sid,
            status: twilioMessage.status,
            to: twilioMessage.to,
            from: twilioMessage.from
        };

    } catch (error) {
        console.error('[SMS_ERROR] ❌ Twilio SMS failed:', error.message);
        
        // Handle specific Twilio errors
        if (error.code) {
            console.error(`[SMS_ERROR] Twilio Error Code: ${error.code}`);
            console.error(`[SMS_ERROR] Twilio Error Details: ${error.moreInfo}`);
        }
        
        throw new Error(`Twilio SMS Error: ${error.message}`);
    }
};

// Test function
const testTwilio = async () => {
    console.log('🧪 Testing Twilio SMS API...\n');
    console.log('📋 Using Twilio credentials from environment:');
    console.log(`   Account SID: ${TWILIO_ACCOUNT_SID.substring(0, 8)}...`);
    console.log(`   Auth Token: ${TWILIO_AUTH_TOKEN.substring(0, 8)}...`);
    console.log(`   From Number: ${TWILIO_PHONE_NUMBER}`);
    console.log('');
    
    // Mock person data for testing
    const mockPerson = {
        fullName: 'John Doe',
        identificationDetails: 'Aadhaar: 1234-5678-9012',
        boothOfficerContact: 'Officer Smith - 9876543210'
    };

    // Get test number from environment or use default
    const testNumber = process.env.TEST_PHONE_NUMBER || '9342905537';

    try {
        console.log('📱 Sending test SMS...');
        const result = await sendResolutionSMS(testNumber, mockPerson);
        
        console.log('\n🎉 SUCCESS! SMS sent successfully');
        console.log('📄 Response Details:');
        console.log(`   Message SID: ${result.messageSid}`);
        console.log(`   Status: ${result.status}`);
        console.log(`   To: ${result.to}`);
        console.log(`   From: ${result.from}`);
        
        console.log('\n📱 Check your phone for the SMS!');
        
    } catch (error) {
        console.log('\n❌ ERROR! SMS failed');
        console.error('🚫 Error Details:', error.message);
        
        console.log('\n💡 Troubleshooting tips:');
        console.log('1. Make sure you have installed required packages:');
        console.log('   npm install twilio dotenv');
        console.log('2. Create a .env file with your Twilio credentials');
        console.log('3. Check if your Twilio account is active and verified');
        console.log('4. Verify you have sufficient Twilio credit balance');
        console.log('5. Make sure the Indian phone number is in correct format');
        console.log('6. Check if your Twilio trial account allows sending to this number');
        console.log('7. For trial accounts, you may need to verify the recipient number first');
    }

    console.log('\n🏁 Test completed!');
};

// Check if required modules are available
try {
    require('twilio');
    require('dotenv');
    console.log('✅ Required modules found, running test...\n');
    testTwilio();
} catch (moduleError) {
    console.error('❌ Required modules not found!');
    console.log('Please install them first:');
    console.log('npm install twilio dotenv');
    console.log('Then run the test again.');
}

module.exports = { sendResolutionSMS };