# Property360 - Product Overview & POC Document

**Version:** 1.0
**Last Updated:** April 2026
**Status:** Active Development

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [User Roles & Capabilities](#2-user-roles--capabilities)
3. [Key User Flows](#3-key-user-flows)
4. [Data Models Overview](#4-data-models-overview)
5. [Feature Implementation Status](#5-feature-implementation-status)
6. [Technical Architecture](#6-technical-architecture)
7. [Screen Inventory](#7-screen-inventory)
8. [Nigerian Localization](#8-nigerian-localization)
9. [Security & Compliance](#9-security--compliance)
10. [Future Roadmap](#10-future-roadmap)

---

## 1. Executive Summary

### What is Property360?

Property360 is a comprehensive **mobile-first property management application** designed specifically for the Nigerian real estate market. It creates a digital ecosystem connecting landlords, tenants, and property agents through a unified platform.

### Target Market

| Attribute | Value |
|-----------|-------|
| Primary Market | Nigeria |
| Currency | Nigerian Naira (NGN / ₦) |
| Language | English |
| Platform | iOS & Android (React Native) |

### Core Value Proposition

| User | Value Delivered |
|------|-----------------|
| **Landlords** | Centralized property portfolio management, automated rent tracking, digital lease agreements, wallet system with bank payouts, and marketplace listings |
| **Tenants** | Easy rent payments via Paystack, maintenance request submission, digital lease management, property browsing marketplace, and direct communication with landlords |
| **Agents** | Property management delegation with granular permissions, tenant management capabilities, and payment recording |

### Technology Stack

| Layer | Technology |
|-------|------------|
| Mobile App | React Native (Expo 54) |
| State Management | Redux Toolkit + React Query |
| Backend API | Node.js / Express 5 |
| Database | MongoDB (Mongoose 9) |
| Real-time Communication | Socket.IO |
| Payment Processing | Paystack (Nigerian payment gateway) |
| File Storage | Cloudinary |
| Document Processing | Google Document AI (OCR) |
| E-Signatures | DocuSeal |
| Email | SendGrid / Resend |
| SMS | Twilio |

---

## 2. User Roles & Capabilities

### 2.1 Landlord (Primary User)

| Capability | Status | Description |
|------------|--------|-------------|
| Register & Authenticate | IMPLEMENTED | Email/phone registration with OTP verification |
| Biometric Login | IMPLEMENTED | Face ID / Fingerprint support |
| KYC Verification | IMPLEMENTED | Selfie + ID document upload |
| Add/Edit Properties | IMPLEMENTED | Multi-step property creation wizard |
| Manage Units | IMPLEMENTED | Define units with rent, fees, amenities |
| Add/Remove Tenants | IMPLEMENTED | Invitation-based tenant onboarding |
| Create Leases | IMPLEMENTED | Configurable payment frequency & fees |
| Upload Tenancy Agreements | IMPLEMENTED | PDF/DOCX with OCR extraction |
| Send E-Signature Requests | IMPLEMENTED | DocuSeal integration |
| Create Invoices | IMPLEMENTED | Line items, taxes, partial payments |
| Record Payments | IMPLEMENTED | Cash, bank transfer, cheque, mobile money |
| View Payment History | IMPLEMENTED | Filterable transaction log |
| Manage Wallet | IMPLEMENTED | Balance tracking, auto-settlement |
| Withdraw to Bank | IMPLEMENTED | Paystack transfer integration |
| Invite Agents | IMPLEMENTED | Email-based invitation system |
| Set Agent Permissions | IMPLEMENTED | Granular permission controls |
| Create Marketplace Listings | IMPLEMENTED | List vacant units for rent |
| Review Reservations | IMPLEMENTED | Approve/decline tenant requests |
| Real-time Chat | IMPLEMENTED | Socket.IO messaging with tenants |
| View Dashboard | IMPLEMENTED | Revenue metrics, occupancy stats, activities |

### 2.2 Tenant

| Capability | Status | Description |
|------------|--------|-------------|
| Register & Authenticate | IMPLEMENTED | Role-based registration flow |
| View Lease Details | IMPLEMENTED | Current lease, rent amount, due dates |
| Accept Lease Invitation | IMPLEMENTED | Email notification + in-app acceptance |
| View Payment Summary | IMPLEMENTED | Outstanding balance, payment history |
| Pay Rent Online | IMPLEMENTED | Paystack (card, bank transfer, USSD) |
| Submit Maintenance Requests | IMPLEMENTED | With images and priority levels |
| Browse Marketplace | IMPLEMENTED | Search available units |
| Reserve Units | IMPLEMENTED | Send reservation request to landlord |
| Track Reservations | IMPLEMENTED | View request status |
| Chat with Landlord | IMPLEMENTED | Real-time messaging |
| View Notifications | IMPLEMENTED | Lease updates, payment reminders |

### 2.3 Agent

| Capability | Status | Permission Required |
|------------|--------|---------------------|
| Accept Landlord Invitation | IMPLEMENTED | — |
| View Assigned Properties | IMPLEMENTED | Automatic |
| Add Tenants | IMPLEMENTED | `canAddTenant` |
| Record Payments | IMPLEMENTED | `canRecordPayment` |
| View Payments | IMPLEMENTED | `canViewPayments` |
| Renew Leases | IMPLEMENTED | `canRenewLease` |
| Upload Agreements | IMPLEMENTED | `canUploadAgreements` |
| Manage Maintenance | IMPLEMENTED | `canManageMaintenance` |

---

## 3. Key User Flows

### 3.1 Landlord Onboarding Journey

```
┌─────────────────┐
│   App Launch    │
└────────┬────────┘
         ▼
┌─────────────────┐
│  Splash Screen  │
└────────┬────────┘
         ▼
┌─────────────────┐
│   Walkthrough   │ (3 intro slides)
│    Screens      │
└────────┬────────┘
         ▼
┌─────────────────┐
│  Auth Entry     │ ──► [Login] (existing users)
│    Screen       │
└────────┬────────┘
         ▼
┌─────────────────────────────────────────────────────┐
│              REGISTRATION FLOW (7 steps)            │
├─────────────────────────────────────────────────────┤
│  1. Name Entry (First/Last Name)                    │
│  2. Phone Entry (+234 format)                       │
│  3. Phone OTP Verification (SMS)                    │
│  4. Email Entry                                     │
│  5. Email OTP Verification                          │
│  6. Password Creation                               │
│  7. Role Selection (Landlord / Tenant / Agent)      │
└────────┬────────────────────────────────────────────┘
         ▼
┌─────────────────┐
│   Biometric     │ (Optional Face ID / Fingerprint)
│     Setup       │
└────────┬────────┘
         ▼
┌─────────────────┐
│ KYC Verification│ (Optional but recommended)
│  - Selfie       │
│  - ID Document  │
└────────┬────────┘
         ▼
┌─────────────────┐
│   Dashboard     │ (Empty state → prompts to add property)
└─────────────────┘
```

### 3.2 Add Property Flow

```
┌─────────────────┐
│    Dashboard    │ ──► Quick Action: "Add Property"
└────────┬────────┘
         ▼
┌─────────────────────────────────────────────────────┐
│           STEP 1: Basic Details                     │
├─────────────────────────────────────────────────────┤
│  • Property Name                                    │
│  • Property Type (Apartment/House/Commercial/Land)  │
│  • Address (Street, City, State, Postal Code)       │
│  • Description                                      │
│  • Number of Floors                                 │
│  • Total Units                                      │
└────────┬────────────────────────────────────────────┘
         ▼
┌─────────────────────────────────────────────────────┐
│           STEP 2: Define Units                      │
├─────────────────────────────────────────────────────┤
│  For each unit:                                     │
│  • Unit Number                                      │
│  • Bedrooms / Bathrooms                             │
│  • Size (sqm)                                       │
│  • Rent Amount (₦)                                  │
│  • Default Fees:                                    │
│    - Security Deposit                               │
│    - Caution Fee                                    │
│    - Agent Fee                                      │
│    - Agreement Fee                                  │
│    - Legal Fee                                      │
│    - Service Charge                                 │
└────────┬────────────────────────────────────────────┘
         ▼
┌─────────────────────────────────────────────────────┐
│           STEP 3: Amenities                         │
├─────────────────────────────────────────────────────┤
│  Select from: Swimming Pool, Gym, Parking,         │
│  Security, Generator, Water Supply, etc.           │
└────────┬────────────────────────────────────────────┘
         ▼
┌─────────────────────────────────────────────────────┐
│           STEP 4: Images                            │
├─────────────────────────────────────────────────────┤
│  • Upload multiple photos                           │
│  • Mark primary image                               │
│  • Stored in Cloudinary                             │
└────────┬────────────────────────────────────────────┘
         ▼
┌─────────────────────────────────────────────────────┐
│           STEP 5: Review & Publish                  │
├─────────────────────────────────────────────────────┤
│  • Review all entered information                   │
│  • Confirm & create property                        │
└────────┬────────────────────────────────────────────┘
         ▼
┌─────────────────┐
│ Property Detail │ (Newly created property)
│     Screen      │
└─────────────────┘
```

### 3.3 Add Tenant Flow

```
┌─────────────────┐
│ Tenants Screen  │ ──► "Add Tenant" button
└────────┬────────┘
         ▼
┌─────────────────────────────────────────────────────┐
│           STEP 1: Select Property                   │
├─────────────────────────────────────────────────────┤
│  Choose from landlord's property list               │
└────────┬────────────────────────────────────────────┘
         ▼
┌─────────────────────────────────────────────────────┐
│           STEP 2: Select Unit                       │
├─────────────────────────────────────────────────────┤
│  Choose from vacant units in selected property      │
└────────┬────────────────────────────────────────────┘
         ▼
┌─────────────────────────────────────────────────────┐
│           STEP 3: Tenant Details                    │
├─────────────────────────────────────────────────────┤
│  • Search existing user OR enter new details        │
│  • First Name / Last Name                           │
│  • Email Address                                    │
│  • Phone Number                                     │
└────────┬────────────────────────────────────────────┘
         ▼
┌─────────────────────────────────────────────────────┐
│           STEP 4: Lease Information                 │
├─────────────────────────────────────────────────────┤
│  • Start Date / End Date                            │
│  • Rent Amount                                      │
│  • Payment Frequency (Monthly/Quarterly/Annually)   │
│  • One-time Fees:                                   │
│    - Security Deposit                               │
│    - Caution Fee                                    │
│    - Agent Fee                                      │
│    - Agreement Fee                                  │
│    - Legal Fee                                      │
│    - Service Charge                                 │
│  • Late Fee Configuration (grace period, amount)    │
│  • Auto-generate Invoice option                     │
└────────┬────────────────────────────────────────────┘
         ▼
┌─────────────────────────────────────────────────────┐
│           STEP 5: Review & Send Invitation          │
├─────────────────────────────────────────────────────┤
│  • Review all details                               │
│  • Send invitation to tenant                        │
└────────┬────────────────────────────────────────────┘
         ▼
┌─────────────────────────────────────────────────────┐
│           TENANT RECEIVES INVITATION                │
├─────────────────────────────────────────────────────┤
│  • Email notification                               │
│  • In-app notification                              │
│  • Accept or Decline lease                          │
└─────────────────────────────────────────────────────┘
```

### 3.4 Tenant Payment Flow

```
┌─────────────────┐
│  Tenant Home    │
└────────┬────────┘
         ▼
┌─────────────────┐
│ Payment Summary │ Shows amount due & due date
└────────┬────────┘
         ▼
┌─────────────────┐
│   "Pay Now"     │
└────────┬────────┘
         ▼
┌─────────────────────────────────────────────────────┐
│           SELECT PAYMENT METHOD                     │
├─────────────────────────────────────────────────────┤
│  • Card Payment (Visa, Mastercard, Verve)           │
│  • Bank Transfer                                    │
│  • USSD                                             │
└────────┬────────────────────────────────────────────┘
         ▼
┌─────────────────┐
│ Paystack WebView│ (Secure payment processing)
└────────┬────────┘
         ▼
┌─────────────────┐
│   Payment       │
│  Confirmation   │
└────────┬────────┘
         ▼
┌─────────────────────────────────────────────────────┐
│           AUTOMATIC ACTIONS                         │
├─────────────────────────────────────────────────────┤
│  • Transaction recorded                             │
│  • Invoice marked as paid                           │
│  • Landlord wallet credited                         │
│  • Receipt generated                                │
│  • Notification sent to landlord                    │
└─────────────────────────────────────────────────────┘
```

### 3.5 Marketplace & Reservation Flow

```
┌─────────────────────────────────────────────────────┐
│           LANDLORD: CREATE LISTING                  │
└─────────────────────────────────────────────────────┘
         │
┌────────┴────────┐
│    Dashboard    │ ──► Quick Action: "List Unit"
└────────┬────────┘
         ▼
┌─────────────────────────────────────────────────────┐
│           LISTING CREATION                          │
├─────────────────────────────────────────────────────┤
│  • Select vacant unit                               │
│  • Listing Title                                    │
│  • Description                                      │
│  • Photos                                           │
│  • Virtual Tour URL (optional)                      │
│  • Inspection Fee (optional)                        │
│  • Availability Date                                │
│  • Preferred Tenant Type (Any/Single/Family/etc.)   │
│  • Mark rent as Negotiable (toggle)                 │
└────────┬────────────────────────────────────────────┘
         ▼
┌─────────────────┐
│  Unit Listed    │ (Visible in Marketplace)
└─────────────────┘


┌─────────────────────────────────────────────────────┐
│           TENANT: BROWSE & RESERVE                  │
└─────────────────────────────────────────────────────┘
         │
┌────────┴────────┐
│   Marketplace   │
│      Tab        │
└────────┬────────┘
         ▼
┌─────────────────┐
│ Browse Listings │ (Filter by location, price, type)
└────────┬────────┘
         ▼
┌─────────────────┐
│ Listing Detail  │ (View photos, features, rent)
└────────┬────────┘
         ▼
┌─────────────────┐
│"Reserve" Button │
└────────┬────────┘
         ▼
┌─────────────────────────────────────────────────────┐
│  Send reservation request with optional message     │
└────────┬────────────────────────────────────────────┘
         ▼
┌─────────────────────────────────────────────────────┐
│  Landlord receives notification                     │
│  Reviews request → Approve or Decline               │
└────────┬────────────────────────────────────────────┘
         ▼
┌─────────────────────────────────────────────────────┐
│  If Approved:                                       │
│  • Tenant pays inspection/reservation fee           │
│  • Unit marked as reserved                          │
│  • Landlord proceeds with tenant onboarding         │
└─────────────────────────────────────────────────────┘
```

### 3.6 Document & E-Signature Flow

```
┌─────────────────┐
│ Tenant Details  │ ──► "Upload Agreement"
└────────┬────────┘
         ▼
┌─────────────────────────────────────────────────────┐
│           UPLOAD AGREEMENT                          │
├─────────────────────────────────────────────────────┤
│  • Select file (PDF / DOCX / Image)                 │
│  • Upload to Cloudinary                             │
└────────┬────────────────────────────────────────────┘
         ▼
┌─────────────────────────────────────────────────────┐
│           AUTOMATIC PROCESSING                      │
├─────────────────────────────────────────────────────┤
│  • Google Document AI OCR runs                      │
│  • Extracts: lease dates, rent amount, deposit,     │
│    property address                                 │
│  • Data stored with agreement                       │
└────────┬────────────────────────────────────────────┘
         ▼
┌─────────────────┐
│ "Send for       │
│  Signature"     │
└────────┬────────┘
         ▼
┌─────────────────────────────────────────────────────┐
│           DOCUSEAL E-SIGNATURE                      │
├─────────────────────────────────────────────────────┤
│  • Creates signing submission                       │
│  • Tenant receives email with signing link          │
│  • Status tracked: sent → opened → signed           │
└────────┬────────────────────────────────────────────┘
         ▼
┌─────────────────┐
│ Signed document │ (Stored and linked to lease)
│    available    │
└─────────────────┘
```

---

## 4. Data Models Overview

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                              USER                                   │
│  (Landlord / Tenant / Agent)                                        │
│  - email, phone, firstName, lastName                                │
│  - role, kycStatus, isVerified                                      │
└───────────┬─────────────────────────────────────┬───────────────────┘
            │ owns                                │ has
            ▼                                     ▼
┌───────────────────────┐               ┌─────────────────────┐
│       PROPERTY        │               │       WALLET        │
│  - name, address      │               │  - balance          │
│  - propertyType       │               │  - totalEarnings    │
│  - amenities, images  │               │  - totalWithdrawn   │
└───────────┬───────────┘               └──────────┬──────────┘
            │ contains                             │ linked to
            ▼                                      ▼
┌───────────────────────┐               ┌─────────────────────┐
│         UNIT          │               │    BANK ACCOUNT     │
│  - unitNumber         │               │  - bankName         │
│  - bedrooms, size     │               │  - accountNumber    │
│  - rentAmount         │               │  - isPrimary        │
│  - isOccupied         │               └─────────────────────┘
│  - isListed           │
└───────────┬───────────┘
            │ assigned via
            ▼
┌───────────────────────────────────────────────────────────────────┐
│                             LEASE                                 │
│  - tenant, landlord, property, unit                               │
│  - startDate, endDate, rentAmount, paymentFrequency               │
│  - fees (security, caution, agent, legal, service)                │
│  - status (pending/active/expired/terminated)                     │
│  - guarantor info, emergency contacts                             │
└───────────┬────────────────────────────┬──────────────────────────┘
            │                            │
            ▼                            ▼
┌───────────────────────┐      ┌────────────────────────┐
│       INVOICE         │      │   TENANCY AGREEMENT    │
│  - invoiceNumber      │      │  - documentUrl         │
│  - lineItems, total   │      │  - extractedData (OCR) │
│  - amountPaid, due    │      │  - signingStatus       │
│  - status             │      │  - signedDocumentUrl   │
└───────────┬───────────┘      └────────────────────────┘
            │ paid via
            ▼
┌───────────────────────┐
│     TRANSACTION       │
│  - amount, type       │
│  - paymentMethod      │
│  - status             │
└───────────────────────┘
```

### Key Model Fields

| Model | Key Fields |
|-------|------------|
| **User** | email, firstName, lastName, phone, role (landlord/tenant/agent), kycStatus, isVerified |
| **Property** | name, address, propertyType (apartment/house/commercial/land), owner, amenities[], images[] |
| **Unit** | unitNumber, bedrooms, bathrooms, size, rentAmount, isOccupied, tenant, isListed, listingStatus |
| **Lease** | property, unit, tenant, landlord, startDate, endDate, rentAmount, paymentFrequency, fees{}, status |
| **Invoice** | invoiceNumber, lineItems[], subtotal, taxRate, total, amountPaid, amountDue, status, dueDate |
| **Transaction** | lease, tenant, landlord, amount, type (rent/deposit/maintenance), paymentMethod, status |
| **Wallet** | landlord, balance, totalEarnings, totalWithdrawn, pendingBalance, autoPayoutEnabled |
| **BankAccount** | landlord, bankCode, bankName, accountNumber, accountName, isPrimary, isVerified |
| **TenancyAgreement** | lease, documentUrl, extractedData{}, processingStatus, signingStatus, signedDocumentUrl |
| **ReservationRequest** | tenant, unit, property, landlord, status, paymentType, message, expiresAt |
| **Conversation** | tenant, landlord, listing, lastMessage, unreadCount |
| **MaintenanceRequest** | tenant, unit, title, description, priority, status, images[] |

---

## 5. Feature Implementation Status

### Phase 1: MVP - COMPLETED

| Feature | Status | Notes |
|---------|--------|-------|
| Multi-role Authentication | DONE | Landlord, Tenant, Agent roles |
| Phone/Email OTP Verification | DONE | Twilio SMS, SendGrid/Resend email |
| Biometric Login | DONE | Face ID / Fingerprint support |
| Property Management | DONE | Full CRUD operations |
| Unit Management | DONE | Nested within properties |
| Tenant Management | DONE | Invitation-based system |
| Lease Creation | DONE | Nigerian fee structure support |
| KYC Verification | DONE | Selfie + ID document upload |
| Dashboard (Landlord) | DONE | Metrics, activities, quick actions |
| Dashboard (Tenant) | DONE | Lease info, payment summary |

### Phase 2: Financial System - COMPLETED

| Feature | Status | Notes |
|---------|--------|-------|
| Invoice Creation | DONE | Line items, taxes, partial payments |
| Manual Payment Recording | DONE | Cash, transfer, cheque, mobile money |
| Paystack Integration | DONE | Online card/bank/USSD payments |
| Wallet System | DONE | Balance tracking per landlord |
| Bank Account Management | DONE | Paystack recipient verification |
| Withdrawals/Payouts | DONE | Paystack transfer API |
| Auto-invoice Generation | DONE | Cron-based recurring invoices |
| Late Fee Calculation | DONE | Fixed amount or percentage |
| Receipt Generation | DONE | PDF receipts via PDFKit |

### Phase 3: Advanced Features - COMPLETED

| Feature | Status | Notes |
|---------|--------|-------|
| Agent Management | DONE | Invitation + granular permissions |
| Tenancy Agreement Upload | DONE | PDF/DOCX/Image support |
| Document OCR | DONE | Google Document AI extraction |
| E-Signatures | DONE | DocuSeal integration |
| Real-time Chat | DONE | Socket.IO implementation |
| Marketplace Listings | DONE | Unit listing system |
| Reservation Requests | DONE | Request/approve/pay flow |
| In-app Notifications | DONE | Notification center |
| Maintenance Requests | DONE | With images and priority |
| Lease Renewal | DONE | Extend existing leases |

### Phase 4: Planned / In Progress

| Feature | Status | Notes |
|---------|--------|-------|
| Push Notifications | PLANNED | FCM/APNS integration |
| Advanced Analytics | PLANNED | Charts, graphs, reports |
| Web Dashboard | EARLY | Next.js skeleton exists |
| Bulk Tenant Import | PLANNED | CSV/Excel import |
| Property Valuation | PLANNED | Market rate suggestions |

---

## 6. Technical Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MOBILE APP (React Native / Expo)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐ │
│  │    Redux     │  │  React Query │  │   Socket.IO Client         │ │
│  │    (Auth)    │  │  (API Cache) │  │   (Real-time Chat)         │ │
│  └──────────────┘  └──────────────┘  └────────────────────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐ │
│  │   Secure     │  │   Expo       │  │   React Navigation         │ │
│  │   Storage    │  │   Biometrics │  │   (Stack + Tabs)           │ │
│  └──────────────┘  └──────────────┘  └────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS / WSS
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKEND API (Node.js / Express)                  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Routes: /auth, /property, /tenant, /invoice, /wallet, /chat   │ │
│  │         /listings, /reservations, /bank-accounts, /payouts    │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Services: AuthService, PropertyService, TenantService,        │ │
│  │           InvoiceService, WalletService, ChatService,         │ │
│  │           ListingService, PayoutService, DocuSealService      │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Middleware: JWT Auth, Validation, Role-based Access Control   │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Socket.IO: Real-time messaging, live notifications            │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Cron Jobs: Lease expiration checks, auto-invoice generation   │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
          │              │              │              │
          ▼              ▼              ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐
    │ MongoDB  │  │Cloudinary│  │ Paystack │  │ Google Cloud │
    │  Atlas   │  │ (Files)  │  │(Payments)│  │ Document AI  │
    └──────────┘  └──────────┘  └──────────┘  └──────────────┘
                                     │
                     ┌───────────────┼───────────────┐
                     ▼               ▼               ▼
               ┌──────────┐   ┌──────────┐   ┌──────────┐
               │ DocuSeal │   │ SendGrid │   │  Twilio  │
               │(E-Signs) │   │ (Email)  │   │  (SMS)   │
               └──────────┘   └──────────┘   └──────────┘
```

### API Endpoints Summary

| Domain | Base Path | Key Endpoints |
|--------|-----------|---------------|
| Authentication | `/api/v1/auth` | register, login, otp/send, otp/verify, profile, change-password |
| Properties | `/api/v1/property` | CRUD, upload-image, units, assign-agent |
| Tenants | `/api/v1/tenant` | list, search, assign, guarantor, emergency-contacts, payments |
| Invoices | `/api/v1/invoice` | CRUD, send, mark-paid, cancel, email |
| Tenant App | `/api/v1/tenantApp` | dashboard, invitations, payments, receipts, requests |
| Wallet | `/api/v1/wallet` | get, stats, transactions, settings |
| Bank Accounts | `/api/v1/bank-accounts` | CRUD, set-primary |
| Payouts | `/api/v1/payouts` | request, history |
| Listings | `/api/v1/listings` | browse, my-listings, list, unlist, reserve |
| Reservations | `/api/v1/reservations` | request, approve, decline, pay |
| Chat | `/api/v1/chat` | conversations, messages, read, unread-count |
| Agreements | `/api/v1/tenancy-agreements` | upload, list, send-signing, signing-status |
| KYC | `/api/v1/kyc` | selfie, document, status |
| Webhooks | `/api/v1/webhooks` | paystack, docuseal (no auth) |

### External Service Integrations

| Service | Purpose | Integration Type |
|---------|---------|------------------|
| **Paystack** | Payment processing (Nigeria) | REST API + Webhooks |
| **Cloudinary** | Image & document storage | REST API |
| **Google Document AI** | OCR for tenancy agreements | REST API |
| **DocuSeal** | E-signature collection | REST API + Webhooks |
| **SendGrid** | Transactional emails | REST API |
| **Resend** | Alternative email provider | REST API |
| **Twilio** | SMS OTP delivery | REST API |

---

## 7. Screen Inventory

### Authentication Screens

| Screen | Purpose |
|--------|---------|
| SplashScreen | App loading with logo animation |
| WalkthroughScreen | 3-slide intro for new users |
| AuthEntryScreen | Choose Login or Register |
| LoginScreen | Email/password + biometric login |
| RegisterNameScreen | Step 1: First/Last name |
| RegisterPhoneScreen | Step 2: Phone number entry |
| RegisterPhoneOTPScreen | Step 3: SMS verification |
| RegisterEmailScreen | Step 4: Email entry |
| RegisterEmailOTPScreen | Step 5: Email verification |
| RegisterPasswordScreen | Step 6: Password creation |
| RegisterRoleScreen | Step 7: Role selection |
| BiometricSetupScreen | Enable Face ID / Fingerprint |
| SelfieCaptureScreen | KYC selfie capture |
| IDUploadScreen | KYC ID document upload |
| ForgotPasswordScreen | Password reset request |
| ResetPasswordScreen | Set new password |

### Landlord / Agent Screens

| Screen | Purpose |
|--------|---------|
| DashboardScreen | Main dashboard with metrics & quick actions |
| PropertiesScreen | List of all properties |
| PropertyDetailsScreen | Single property view |
| AddPropertyBasicDetailsScreen | Property creation step 1 |
| AddPropertyUnitsScreen | Property creation step 2 |
| AddPropertyAmenitiesScreen | Property creation step 3 |
| AddPropertyImagesScreen | Property creation step 4 |
| AddPropertyReviewScreen | Property creation step 5 |
| TenantsScreen | List of all tenants |
| TenantDetailsScreen | Single tenant profile |
| AddTenantSelectPropertyScreen | Tenant creation step 1 |
| AddTenantSelectUnitScreen | Tenant creation step 2 |
| AddTenantFormScreen | Tenant creation step 3 |
| AddTenantLeaseScreen | Tenant creation step 4 |
| AddTenantReviewScreen | Tenant creation step 5 |
| RecordPaymentScreen | Log tenant payment |
| PaymentHistoryScreen | View all payments |
| PendingPaymentsScreen | Payments awaiting confirmation |
| RenewLeaseScreen | Extend lease agreement |
| AgentsScreen | List of agents |
| InviteAgentScreen | Invite new agent |
| AgentDetailsScreen | Agent permissions management |
| AllActivitiesScreen | Full activity log |

### Finance Screens

| Screen | Purpose |
|--------|---------|
| FinanceMenuScreen | Finance section entry |
| WalletScreen | Wallet balance & summary |
| WalletTransactionsScreen | Transaction history |
| WalletSettingsScreen | Auto-payout settings |
| WithdrawScreen | Request withdrawal |
| BankAccountsScreen | Manage bank accounts |
| AddBankAccountScreen | Add new bank account |
| PayoutHistoryScreen | Track payouts |
| InvoiceListScreen | List all invoices |
| InvoiceCreationScreen | Create new invoice |
| InvoicePreviewScreen | Preview before sending |
| InvoiceDetailScreen | View single invoice |

### Marketplace Screens

| Screen | Purpose |
|--------|---------|
| MarketplaceScreen | Browse available listings |
| ListingDetailScreen | View listing details |
| CreateListingScreen | Create new listing |
| MyListingsScreen | Manage own listings |
| ReservationRequestsScreen | Review incoming requests |
| MyReservationsScreen | Track sent requests |

### Tenant Screens

| Screen | Purpose |
|--------|---------|
| TenantHomeScreen | Tenant dashboard |
| TenantPaymentsScreen | Payment history |
| PaymentDetailsScreen | Single payment view |
| TenantRequestsScreen | Maintenance requests |
| CreateRequestScreen | Submit new request |
| LeaseInvitationScreen | Accept/decline lease |

### Shared Screens

| Screen | Purpose |
|--------|---------|
| ChatListScreen | All conversations |
| ChatScreen | Single conversation |
| NotificationsScreen | Notification center |
| TenancyAgreementListScreen | View agreements |
| TenancyAgreementUploadScreen | Upload agreement |
| TenancyAgreementViewScreen | View/download agreement |
| ProfileScreen | User profile |
| EditProfileScreen | Edit profile info |
| ChangePasswordScreen | Update password |
| NotificationSettingsScreen | Notification preferences |
| HelpCenterScreen | Help & support |
| ContactUsScreen | Contact form |
| LegalScreen | Terms & Privacy |

---

## 8. Nigerian Localization

| Feature | Implementation |
|---------|----------------|
| **Currency** | Nigerian Naira (₦ / NGN) |
| **Phone Format** | +234 country code |
| **States** | All 36 Nigerian states + FCT |
| **ID Documents** | NIN, Driver's License, Passport, Voter's Card |
| **Payment Gateway** | Paystack (Nigerian payment processor) |
| **Date Format** | DD/MM/YYYY (en-NG locale) |
| **Fee Structure** | Security Deposit, Caution Fee, Agent Fee, Agreement Fee, Legal Fee, Service Charge |
| **Payment Frequency** | Monthly, Quarterly, Annually (common in Nigeria) |
| **Bank Integration** | Nigerian banks via Paystack |

---

## 9. Security & Compliance

### Implemented Security Measures

| Measure | Implementation |
|---------|----------------|
| Authentication | JWT tokens with expiration |
| Password Security | bcrypt hashing (10 rounds) |
| API Security | Helmet.js HTTP headers |
| CORS | Configured allowed origins |
| Input Validation | express-validator on all inputs |
| Rate Limiting | Configured on auth endpoints |
| Role-based Access | Middleware enforces permissions |
| Soft Delete | User data anonymized, not deleted |
| Secure Storage | Expo SecureStore for tokens |
| Biometrics | Optional Face ID / Fingerprint |

### Data Privacy

| Aspect | Implementation |
|--------|----------------|
| File Storage | Cloudinary (secure URLs) |
| Sensitive Data | Environment variables |
| Account Deletion | Data anonymization |
| KYC Documents | Stored securely in Cloudinary |

---

## 10. Future Roadmap

### Short-term (1-3 months)

| Feature | Priority | Description |
|---------|----------|-------------|
| Push Notifications | HIGH | FCM/APNS for real-time alerts |
| Payment Reminders | HIGH | Automated SMS/email before due date |
| Enhanced Analytics | MEDIUM | Charts for revenue, occupancy trends |
| Bulk Operations | MEDIUM | Bulk tenant import, bulk invoicing |
| Offline Mode | MEDIUM | Queue actions when offline |

### Medium-term (3-6 months)

| Feature | Priority | Description |
|---------|----------|-------------|
| Web Dashboard | HIGH | Full-featured Next.js dashboard for landlords |
| Multi-language | MEDIUM | Yoruba, Igbo, Hausa support |
| Property Valuation | MEDIUM | Market rate comparison |
| Lease Templates | MEDIUM | Pre-built agreement templates |
| Integration APIs | LOW | Third-party property management integrations |

### Long-term (6-12 months)

| Feature | Priority | Description |
|---------|----------|-------------|
| AI Rent Pricing | MEDIUM | ML-based rent recommendations |
| Tenant Credit Scoring | MEDIUM | Payment history-based scoring |
| Insurance Integration | LOW | Partner with insurance providers |
| Utility Bill Tracking | LOW | Track electricity, water, etc. |
| West Africa Expansion | LOW | Ghana, Kenya market adaptation |

---

## Appendix: Quick Reference

### User Registration Codes

| Role | Code |
|------|------|
| Landlord | `landlord` |
| Tenant | `tenant` |
| Agent | `agent` |

### Payment Status Codes

| Status | Description |
|--------|-------------|
| `pending` | Payment initiated |
| `completed` | Payment successful |
| `failed` | Payment failed |
| `voided` | Payment cancelled |

### Lease Status Codes

| Status | Description |
|--------|-------------|
| `pending` | Awaiting tenant acceptance |
| `active` | Currently active lease |
| `expired` | Lease term ended |
| `terminated` | Lease cancelled early |
| `declined` | Tenant rejected invitation |

### Invoice Status Codes

| Status | Description |
|--------|-------------|
| `draft` | Not yet sent |
| `sent` | Sent to tenant |
| `paid` | Fully paid |
| `partially_paid` | Partial payment received |
| `overdue` | Past due date |
| `cancelled` | Invoice cancelled |

---

*Document generated from Property360 codebase analysis*
