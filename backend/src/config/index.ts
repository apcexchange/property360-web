import dotenv from 'dotenv';
import path from 'path';

// Load .env.dev for development, .env.prod for production
const envFile = process.env.NODE_ENV === 'production' ? '.env.prod' : '.env.dev';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),

  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/property360',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  api: {
    version: process.env.API_VERSION || 'v1',
    prefix: process.env.API_PREFIX || '/api',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  },

  resend: {
    apiKey: process.env.RESEND_API_KEY || '',
    fromEmail: process.env.RESEND_FROM_EMAIL || 'Property360 <onboarding@resend.dev>',
  },

  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || '',
    fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@property360.com',
    fromName: process.env.SENDGRID_FROM_NAME || 'Property360',
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },

  googleDocumentAI: {
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
    processorId: process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID || '',
    location: process.env.GOOGLE_DOCUMENT_AI_LOCATION || 'us',
  },

  docuseal: {
    apiKey: process.env.DOCUSEAL_API_KEY || '',
    apiUrl: process.env.DOCUSEAL_API_URL || 'https://api.docuseal.co',
    webhookSecret: process.env.DOCUSEAL_WEBHOOK_SECRET || '',
  },

  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY || '',
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
    callbackUrl: process.env.PAYSTACK_CALLBACK_URL || 'https://yourapp.com/payment/callback',
    webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET || '',
  },
};

export default config;
