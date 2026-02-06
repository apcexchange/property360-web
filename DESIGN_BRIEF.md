# Property360 - Design Brief

**Version:** 1.0
**Status:** Ready for Design Kickoff

---

## Project Overview

| Field | Value |
|-------|-------|
| **App Name** | Property360 |
| **Platform** | Mobile (iOS & Android) |
| **Technology** | React Native (Expo) |
| **Target Market** | Nigeria |
| **User Roles** | Landlords, Tenants, Agents |

**Purpose:** A comprehensive property management mobile application that streamlines relationships between landlords, tenants, and property agents.

---

## Design Principles

1. **Mobile-First** - Optimized for mobile devices
2. **Nigerian Localization** - Use ₦ (Naira), Nigerian phone formats, and addresses
3. **Dark Mode** - Full support for light and dark themes
4. **Accessibility** - WCAG 2.1 AA compliance
5. **Simplicity** - Clean, intuitive interface with minimal learning curve
6. **Professional** - Mature, trustworthy design aesthetic

---

## User Roles & Needs

### Landlord (Primary User)

**Core Tasks:**
- Manage multiple properties and units
- Track tenants and leases
- Monitor financial performance
- Handle maintenance requests
- Manage agents and permissions

**Pain Points:**
- Tracking payments across properties
- Managing multiple tenants
- Coordinating with agents
- Generating reports

### Tenant

**Core Tasks:**
- Pay rent
- Submit maintenance requests
- View lease information
- Access payment history

### Agent

**Core Tasks:**
- Manage assigned properties
- Handle tenant relationships
- Collect payments
- Report to landlords

---

## Critical User Flows

### 1. First-Time User Onboarding
```
Walkthrough (3 slides) → Login/Sign Up → Role Selection →
Basic KYC → Address Verification (Optional) →
NIN Verification (Optional) → Dashboard
```

### 2. Landlord - Add Property
```
Dashboard → Properties → Add Property →
Fill Form (Basic Info, Details, Financial, Media, Amenities) →
Review → Publish → Property Detail Screen
```

### 3. Landlord - Create Lease
```
Dashboard → Tenants → Create Lease →
Select Property → Select/Add Tenant →
Lease Details → Payment Terms → Review → Create
```

### 4. Tenant - Pay Rent
```
Dashboard → Pay Rent → View Details →
Select Payment Method → Confirm → Receipt
```

### 5. Landlord - Manage Agent
```
Dashboard → Agents → Add Agent →
Search Agent → Select → Set Permissions →
Assign Properties → Confirm
```

---

## Screen Inventory

### Phase 1 - MVP (Priority)

#### Onboarding & Auth (7 screens)
1. Walkthrough (3 slides)
2. Login
3. Sign Up
4. Role Selection
5. Basic KYC
6. Address Verification
7. NIN Verification

#### Landlord Core (14 screens)
8. Landlord Dashboard
9. Properties List
10. Property Detail
11. Add/Edit Property
12. Tenants List
13. Tenant Detail
14. Add Tenant
15. Create Lease
16. Maintenance List
17. Maintenance Detail
18. Add Maintenance Request
19. Financial Dashboard
20. Transactions List
21. Transaction Detail

#### Shared (6 screens)
22. Side Drawer Navigation
23. Notifications List
24. Notification Detail
25. Settings Menu
26. My Profile
27. Change Password

#### Tenant Core (4 screens)
28. Tenant Dashboard
29. My Lease
30. Payment History
31. Submit Maintenance Request

### Phase 2 - Advanced Features
- Advanced Financial Charts
- Invoices & Receipts
- Payment Methods
- Agents Management
- Property Portfolio
- Property Advertisement
- Arrange Viewings
- E-Signed Leases
- Damage Reports
- Inventory Management

---

## Design Direction

### Visual Style
- **Professional & Trustworthy** - This is a financial and property management tool
- **Clean & Modern** - Avoid clutter, embrace whitespace
- **Nigerian Context** - Consider local aesthetics and preferences
- **Accessibility First** - Ensure inclusive design for all users

### Color System Considerations
- Support both light and dark modes seamlessly
- Include semantic colors for success, warning, error, and informational states
- Use color to communicate status (paid, pending, overdue, inactive)
- Ensure WCAG 2.1 AA compliance for all color combinations

### Typography & Spacing
- Use system fonts for optimal performance and familiarity
- Establish a clear visual hierarchy
- Ensure readability on various screen sizes
- Design for scalability (users may increase text size)

### Component Categories
Design a comprehensive component library including:
- **Buttons** - Various types and states
- **Cards** - For displaying properties, tenants, transactions, etc.
- **Form Inputs** - Text, numbers, dates, dropdowns, file uploads, etc.
- **Navigation** - Headers, tabs, drawers, breadcrumbs
- **Feedback Elements** - Toasts, alerts, loading states, empty states
- **Data Display** - Lists, tables, badges, avatars, charts

---

## Key Screen Requirements

### Walkthrough Screens
- 3 slides introducing the app's value proposition
- Welcome users and explain core benefits
- Easy navigation to sign up/login

### Landlord Dashboard
**Must Include:**
- Personalized greeting
- Key metrics overview (properties, tenants, revenue, maintenance)
- Quick access to common actions
- Recent activity feed
- Easy navigation to main sections

### Property Detail Screen
**Must Include:**
- Image gallery
- Property information and overview
- List of units with occupancy status
- Tenant information for occupied units
- Financial summary
- Maintenance history
- Actions menu for property management

### Financial Dashboard
**Must Include:**
- Summary of key financial metrics
- Visual representations of financial data (charts/graphs)
- Time period filtering options
- Recent transactions list
- Export/share functionality

---

## Interaction Patterns

### General Principles
- **Lists:** Enable easy navigation to details, support refresh and bulk actions
- **Forms:** Provide real-time validation, clear error messages, and required field indicators
- **Navigation:** Ensure intuitive back navigation, clear section organization, and accessible global menu
- **Feedback:** Use appropriate feedback for loading, success, errors, and empty states
- **Touch Targets:** Follow platform guidelines for minimum touch target sizes
- **Gestures:** Support common mobile gestures where appropriate

---

## Localization Requirements

### Currency
- Use Nigerian Naira (₦) symbol throughout the app
- Follow local currency formatting conventions

### Phone Numbers
- Support Nigerian phone number format with +234 country code

### Addresses
- Use Nigerian states, postal codes, and city names
- Design input fields appropriate for Nigerian address structure

### Date & Time
- Follow local date and time formatting preferences

---

## Accessibility Requirements

- [x] Ensure sufficient color contrast for all text and interactive elements
- [x] Design touch targets following platform guidelines
- [x] Provide screen reader labels for all interactive elements
- [x] Include alternative text for images
- [x] Support keyboard navigation
- [x] Design visible focus indicators
- [x] Avoid relying solely on color to convey information
- [x] Support text scaling for users with visual impairments
- [x] Target WCAG 2.1 AA compliance

---

## Deliverables

### Design Files
- Figma/Sketch file with all screens
- Component library
- Design system documentation
- Interactive prototypes

### Assets
- App icon (all sizes)
- Splash screen
- Custom icons (SVG)
- Illustrations
- Placeholder images

### Documentation
- Design specifications
- Component usage guidelines
- Animation specifications
- Responsive behavior notes
- Accessibility annotations

### Handoff
- Developer access to design files
- Asset export settings
- Design review sessions scheduled
- Ongoing support plan
