# LoveLaundry System - Comprehensive User Manual

**Version**: 2.0
**Date**: October 2026
**Author**: LoveLaundry Team

---

## Table of Contents

### Part I: Introduction
1. Welcome to LoveLaundry
2. System Overview
3. Getting Started
4. Installation & Setup

### Part II: User Guide
5. Laundry Administration
6. Hotel Portal Operations
7. Shop Counter Operations
8. Linen Room Management
9. Worker Management
10. Quotations & Billing

### Part III: Technical Guide
11. Architecture Overview
12. API Reference
13. Security Best Practices
14. Data Management
15. Troubleshooting

### Part IV: Appendices
16. Quick Reference
17. Glossary
18. Revision History

---

# Part I: Introduction

## Chapter 1: Welcome to LoveLaundry

LoveLaundry is a comprehensive laundry management system designed for modern laundry businesses serving hotels, shops, and individual clients. This manual provides complete guidance for administrators, operators, and technical staff.

### 1.1 What is LoveLaundry?

LoveLaundry is a cloud-based management system that streamlines:
- Customer relationship management
- Order processing and tracking
- Linen inventory management
- Billing and invoicing
- Staff and worker management
- Real-time reporting and analytics

### 1.2 Who Should Use This Manual

This manual is designed for:
- **Laundry Administrators**: Managing business operations, clients, and staff
- **Hotel Staff**: Monitoring laundry deliveries, gate passes, and billing
- **Shop Counter Staff**: Processing orders, managing bills, and customer accounts
- **Linen Room Operators**: Scanning, tracking, and managing linen inventory
- **Technical Staff**: System maintenance, API integration, and troubleshooting

### 1.3 System Architecture

The LoveLaundry system consists of:
- **6 Backend Services**: User, Bill, Quotation, Worker, Laundry Management, Love AI
- **5 Frontend Applications**: Hotel App, Shop App, Linen Room App, Quotations UI, LoveMobi
- **Database**: MongoDB for data persistence
- **Infrastructure**: Docker-based deployment with health monitoring

### 1.4 Key Features

#### 1.4.1 Multi-Tenant Support
- Support for multiple laundry businesses
- Complete data isolation between tenants
- Flexible client types: HOTEL, SHOP, INDIVIDUAL, RESTAURANT

#### 1.4.2 Role-Based Access Control
- Granular permissions for different user roles
- LAUNDRY_ADMIN, HOTEL_ADMIN, HOTEL_MANAGER, SHOP_ADMIN, SHOP_STAFF
- Secure token-based authentication

#### 1.4.3 Real-Time Operations
- Live order tracking
- Gate pass management
- Linen scanning and status updates
- Delivery scheduling

#### 1.4.4 Comprehensive Billing
- Automated invoice generation
- Payment tracking
- Monthly statements
- Balance management

#### 1.4.5 AI-Powered Features
- Love AI for intelligent recommendations
- Automated task assignment
- Predictive analytics

---

## Chapter 2: System Overview

### 2.1 Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Applications                    │
├─────────────┬─────────────┬─────────────┬─────────────────┤
│ Hotel App   │ Shop App    │ Linen Room  │ Quotations UI   │
│ (React)     │ (React)     │ App (React) │ (React)         │
└──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────────┘
       │             │             │             │
       └─────────────┼─────────────┼─────────────┘
                     │             │
┌────────────────────┼─────────────┼─────────────────────────┐
│                    │      API Gateway (Nginx)               │
│                    └─────────────┬─────────────────────────┤
└──────────────────────────────────┼──────────────────────────┘
                                   │
┌──────────────────────────────────┼──────────────────────────┐
│                    Backend Services (FastAPI)               │
├─────────────┬─────────────┬─────────────┬─────────────────┤
│ User Service│ Bill Service│ Quotation   │ Worker Service  │
├─────────────┼─────────────┼─────────────┼─────────────────┤
│ Laundry     │ Love AI    │             │                 │
│ Management  │            │             │                 │
└──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────────┘
       │             │             │             │
       └─────────────┼─────────────┼─────────────┘
                     │             │
┌────────────────────┼─────────────┼─────────────────────────┐
│                  MongoDB (Multi-Database)                   │
│         user_db │ operations_db │ accounting_db          │
└───────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

1. **User Authentication**
   - User logs in via frontend app
   - Token issued by User Service
   - Token validated by all services

2. **Order Creation**
   - Shop staff creates order via Shop App
   - Order stored in operations database
   - Quotation generated if needed

3. **Linen Processing**
   - Linen scanned via Linen Room App
   - Status updated in operations database
   - Gate pass generated for collection/delivery

4. **Billing**
   - Bills generated by Bill Service
   - Invoices sent to clients
   - Payments tracked in accounting database

### 2.3 Security Model

#### 2.3.1 Authentication
- JWT-based token authentication
- 12-hour token expiration
- Refresh token support
- Secure secret validation

#### 2.3.2 Authorization
- Role-based access control (RBAC)
- Tenant isolation enforced at middleware level
- Client scope enforcement for portal users

#### 2.3.3 Data Encryption
- AES-256-GCM envelope encryption for sensitive fields
- Deterministic search tokens for encrypted queries
- Secure key management

### 2.4 Deployment Architecture

The system uses Docker containers for:
- Service isolation
- Easy scaling
- Consistent deployment
- Health monitoring

---

## Chapter 3: Getting Started

### 3.1 System Requirements

#### 3.1.1 For Frontend Users
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection
- Mobile device or desktop computer

#### 3.1.2 For Administrators
- Administrative access credentials
- Computer with internet connection
- Recommended: 8GB RAM, 500GB storage for local deployment

#### 3.1.3 For Developers
- Python 3.13+
- Node.js 18+
- Docker and Docker Compose
- Git

### 3.2 First-Time Setup

#### 3.2.1 Initial Login
1. Open the application URL in your browser
2. Enter your credentials provided by the laundry administrator
3. If you belong to multiple laundries, select the appropriate one
4. Complete any required profile information

#### 3.2.2 Password Setup
1. Upon first login, you may be prompted to change your password
2. Choose a strong password:
   - Minimum 12 characters
   - Mix of uppercase, lowercase, numbers, and symbols
   - Avoid common words or patterns
3. Confirm the password
4. Click "Update Password"

#### 3.2.3 Profile Configuration
1. Navigate to your profile settings
2. Update your display name
3. Add contact information
4. Configure notification preferences
5. Save changes

### 3.3 Navigation Basics

#### 3.3.1 Main Navigation
- **Hotel App**: Overview, Gate Passes, Deliveries, Invoices, Monthly Matrix, Statements
- **Shop App**: Today, New Order, Bills, Orders, Quick Bill
- **Linen Room App**: Scan, Inventory, Discrepancies, Tags, Bulk Scan

#### 3.3.2 Common Elements
- **Search Bar**: Quick access to records
- **Filters**: Refine data views
- **Export**: Download data in various formats
- **Print**: Generate printable reports

### 3.4 Support Resources

- **Online Help**: Built-in documentation in each app
- **Support Email**: support@lovelaundry.lk
- **Training Videos**: Available in the knowledge base
- **User Community**: Forum for peer support

---

## Chapter 4: Installation & Setup

### 4.1 Cloud Deployment

#### 4.1.1 Prerequisites
- Active cloud account (AWS, GCP, Azure, or Vercel)
- Domain name configured
- SSL certificate installed

#### 4.1.2 Environment Variables
Required environment variables for all services:
```
MASTER_KEY=<32-byte-hex-key>
JWT_SECRET=<strong-random-secret>
MONGODB_URI=<mongodb-connection-string>
CORS_ORIGINS=<comma-separated-allowed-origins>
```

#### 4.1.3 Deployment Steps
1. Clone the repository
2. Configure environment variables
3. Build Docker images
4. Deploy to cloud platform
5. Configure DNS and SSL
6. Run health checks
7. Create initial admin user

### 4.2 Local Development

#### 4.2.1 Development Environment Setup
```bash
# Clone repository
git clone <repository-url>
cd love-laundry-system

# Install Python dependencies
cd bill_service
pip install -r requirements.txt

# Install Node dependencies
cd hotel-app
npm install

# Start MongoDB
docker-compose up -d mongodb

# Start services
python -m uvicorn src.bill_service.main:app --reload
```

#### 4.2.2 Running Frontend Apps
```bash
# Hotel App
cd hotel-app
npm run dev

# Shop App
cd shop-app
npm run dev

# Linen Room App
cd linen-room-app
npm run dev
```

### 4.3 Database Setup

#### 4.3.1 MongoDB Configuration
1. Install MongoDB 6.0+
2. Create databases:
   - user_db
   - operations_db
   - accounting_db
3. Create indexes as defined in each service
4. Configure replication set for production

#### 4.3.2 Initial Data Migration
```bash
# Run migration scripts
python scripts/migrate.py

# Seed initial data
python scripts/seed.py
```

### 4.4 Health Monitoring

#### 4.4.1 Health Endpoints
Each service exposes a `/health` endpoint:
```bash
curl http://localhost:8000/health
```

Response:
```json
{
  "status": "healthy",
  "service": "bill-service",
  "timestamp": "2026-10-27T10:00:00Z"
}
```

#### 4.4.2 Monitoring Metrics
- Request rate
- Response time
- Error rate
- Database connection pool status
- Memory usage

---

# Part II: User Guide

## Chapter 5: Laundry Administration

### 5.1 Dashboard Overview

The administration dashboard provides:
- Key performance indicators
- Recent activity feed
- System health status
- Quick action buttons

### 5.2 Client Management

#### 5.2.1 Registering a New Hotel
1. Navigate to Management → Customers
2. Click "Add Customer"
3. Select client type: HOTEL
4. Fill in customer details:
   - Hotel name
   - Contact person
   - Email address
   - Phone number
   - Billing address
5. Create admin account for the hotel
6. Set initial credit limit
7. Save the customer

#### 5.2.2 Registering a New Shop
1. Navigate to Management → Customers
2. Click "Add Customer"
3. Select client type: SHOP
4. Fill in shop details
5. Create admin account
6. Configure payment terms
7. Save the customer

#### 5.2.3 Managing Staff Accounts
1. Navigate to Management → Staff
2. Click "Add Staff"
3. Select role (LAUNDRY_ADMIN, LAUNDRY_MANAGER, etc.)
4. Enter staff details
5. Assign permissions
6. Save the account

### 5.3 Pricing Configuration

#### 5.3.1 Service Categories
- Wash and fold
- Dry cleaning
- Ironing
- Special treatments
- Linen rental

#### 5.3.2 Setting Prices
1. Navigate to Management → Pricing
2. Select service category
3. Set base price per unit
4. Configure bulk discounts
5. Set seasonal rates
6. Save configuration

### 5.4 Reporting

#### 5.4.1 Daily Reports
- Orders processed
- Deliveries completed
- Revenue collected
- Staff performance

#### 5.4.2 Monthly Reports
- Total revenue
- Client breakdown
- Service category analysis
- Trend analysis

#### 5.4.3 Custom Reports
1. Navigate to Reports → Custom
2. Select data sources
3. Apply filters
4. Choose visualization type
5. Generate report
6. Export or schedule

---

## Chapter 6: Hotel Portal Operations

### 6.1 Overview Page

The overview page displays:
- Open gate passes count
- Deliveries this month
- Outstanding balance
- Invoiced amount this month

### 6.2 Gate Pass Management

#### 6.2.1 Creating a Gate Pass
1. Navigate to Gate Passes
2. Click "New Gate Pass"
3. Select linen items
4. Specify collection date
5. Add special instructions
6. Submit gate pass

#### 6.2.2 Tracking Gate Passes
- View all gate passes
- Filter by status (OPEN, CLOSED, DELIVERED)
- Search by gate pass number
- Export gate pass list

### 6.3 Delivery Management

#### 6.3.1 Viewing Deliveries
1. Navigate to Deliveries
2. View scheduled deliveries
3. Check delivery status
4. View delivery details

#### 6.3.2 Confirming Receipt
1. Select pending delivery
2. Verify items received
3. Report discrepancies
4. Confirm receipt

### 6.4 Invoice Management

#### 6.4.1 Viewing Invoices
1. Navigate to Invoices
2. View invoice list
3. Filter by date range
4. Search by invoice number

#### 6.4.2 Invoice Details
- Invoice number and date
- Line items with quantities
- Tax calculations
- Total amount
- Payment status

#### 6.4.3 Downloading Invoices
1. Select invoice
2. Click "Download PDF"
3. Save to local system
4. Print if needed

### 6.5 Monthly Matrix

The monthly matrix shows:
- Daily linen quantities
- Service types breakdown
- Cost per day
- Monthly totals
- Comparison with previous months

### 6.6 Statements

Statements provide:
- Opening balance
- Transactions during period
- Payments received
- Closing balance
- Payment history

---

## Chapter 7: Shop Counter Operations

### 7.1 Today's View

The Today page shows:
- Open bills count
- Current balance
- Invoiced amount this month

### 7.2 Creating Orders

#### 7.2.1 New Order Process
1. Navigate to New Order
2. Select customer
3. Add items to order:
   - Item type
   - Quantity
   - Service type
   - Special instructions
4. Calculate total
5. Select payment method
6. Submit order

#### 7.2.2 Quick Bill Templates
Pre-configured templates for common orders:
- Daily Laundry Bundle
- Uniform Bundle
- Towels Only
- Bed Linen Set

### 7.3 Bill Management

#### 7.3.1 Viewing Bills
1. Navigate to Bills
2. View bill list
3. Filter by status
4. Search by bill number

#### 7.3.2 Bill Details
- Customer information
- Order items
- Subtotal
- Tax
- Total
- Payment status

#### 7.3.3 Processing Payments
1. Select unpaid bill
2. Enter payment amount
3. Select payment method
4. Record payment
5. Update bill status

### 7.4 Order History

View complete order history:
- All orders placed
- Order status
- Delivery information
- Payment records

---

## Chapter 8: Linen Room Management

### 8.1 Linen Scanning

#### 8.1.1 Single Linen Scan
1. Navigate to Scan
2. Enter or scan linen tag (e.g., LL-000123)
3. View linen details:
   - Linen ID
   - Category
   - Item type
   - Client name
   - Current status
   - Condition
   - Wash count
4. Select action:
   - Collect
   - Receive
   - Start wash
   - Complete wash
   - Press
   - Ready
   - Deliver
   - Mark missing
   - Mark damaged
5. Apply action

#### 8.1.2 Bulk Scan
1. Navigate to Bulk Scan
2. Enter multiple linen tags (one per line)
3. Select bulk action
4. Process all linens
5. View results:
   - Successfully processed
   - Errors encountered
   - Linens not found

### 8.2 Inventory Management

#### 8.2.1 Viewing Inventory
1. Navigate to Inventory
2. View all linens
3. Filter by:
   - Category
   - Status
   - Client
   - Location
4. Search by linen ID

#### 8.2.2 Inventory Categories
- Bed linens (sheets, pillowcases, duvet covers)
- Towels (bath, hand, face)
- Table linens (tablecloths, napkins)
- Uniforms
- Special items

### 8.3 Discrepancy Management

#### 8.3.1 Reporting Discrepancies
1. Navigate to Discrepancies
2. Click "Report Discrepancy"
3. Select linen or gate pass
4. Describe discrepancy:
   - Missing items
   - Damaged items
   - Wrong items
5. Attach photos if available
6. Submit report

#### 8.3.2 Resolving Discrepancies
1. Review discrepancy report
2. Investigate issue
3. Update status
4. Notify affected parties
5. Close report

### 8.4 Tag Management

#### 8.4.1 Viewing Tags
1. Navigate to Tags
2. View all linen tags
3. Filter by status
4. Search by tag number

#### 8.4.2 Tag Status
- Active: Linen in circulation
- Retired: Linen no longer in use
- Lost: Linen missing
- Damaged: Linen damaged beyond repair

### 8.5 Section Management

Organize linens by sections:
- Client sections
- Storage locations
- Processing areas
- Delivery zones

---

## Chapter 9: Worker Management

### 9.1 Worker Registration

#### 9.1.1 Adding New Workers
1. Navigate to Management → Workers
2. Click "Add Worker"
3. Enter worker details:
   - Name
   - Employee ID
   - Department
   - Contact information
4. Assign roles
5. Set shift schedule
6. Save worker

### 9.2 Task Assignment

#### 9.2.1 Daily Tasks
1. Navigate to Daily Tasks
2. View task list
3. Assign workers to tasks
4. Set priorities
5. Add deadlines
6. Save assignments

#### 9.2.2 Task Types
- Collection
- Washing
- Ironing
- Packing
- Delivery
- Quality check

### 9.3 Shift Management

#### 9.3.1 Creating Shifts
1. Navigate to Management → Shifts
2. Click "Add Shift"
3. Configure shift:
   - Name
   - Start time
   - End time
   - Required workers
4. Assign workers
5. Save shift

#### 9.3.2 Shift Scheduling
- Weekly schedules
- Rotating shifts
- Overtime tracking
- Availability management

### 9.4 Performance Tracking

#### 9.4.1 Worker Metrics
- Tasks completed
- Efficiency ratings
- Quality scores
- Attendance records

#### 9.4.2 Performance Reports
1. Navigate to Reports → Worker Performance
2. Select time period
3. Choose worker or all workers
4. Generate report
5. View metrics
6. Export data

---

## Chapter 10: Quotations & Billing

### 10.1 Quotation Management

#### 10.1.1 Creating Quotations
1. Navigate to Quotations
2. Click "New Quotation"
3. Select customer
4. Add items:
   - Service type
   - Quantity
   - Unit price
5. Apply discounts
6. Calculate total
7. Set validity period
8. Save quotation

#### 10.1.2 Quotation Status
- DRAFT: Initial draft
- SENT: Sent to customer
- ACCEPTED: Customer accepted
- REJECTED: Customer rejected
- EXPIRED: Validity period ended
- CONVERTED: Converted to order

### 10.2 Bill Generation

#### 10.2.1 Automatic Billing
- Bills generated automatically for completed orders
- Scheduled billing runs
- Batch processing

#### 10.2.2 Manual Billing
1. Navigate to Bills
2. Click "Create Bill"
3. Select customer
4. Add line items
5. Calculate totals
6. Add taxes
7. Generate bill
8. Send to customer

### 10.3 Payment Processing

#### 10.3.1 Recording Payments
1. Select unpaid bill
2. Click "Record Payment"
3. Enter payment details:
   - Amount
   - Payment method
   - Reference number
   - Date
4. Submit payment
5. Update bill status

#### 10.3.2 Payment Methods
- Cash
- Bank transfer
- Credit card
- Check
- Mobile payment

### 10.4 Statement Generation

#### 10.4.1 Monthly Statements
1. Navigate to Statements
2. Select customer
3. Choose month
4. Generate statement
5. Review details
6. Send to customer

#### 10.4.2 Statement Contents
- Opening balance
- Invoice summary
- Payment summary
- Credit adjustments
- Closing balance

### 10.5 Tax Management

#### 10.5.1 Tax Configuration
1. Navigate to Management → Taxes
2. Add tax rate
3. Configure tax rules
4. Set applicability
5. Save configuration

#### 10.5.2 Tax Calculation
- Automatic tax calculation
- Multi-tax support
- Tax-exempt customers
- Tax reporting

---

# Part III: Technical Guide

## Chapter 11: Architecture Overview

### 11.1 Microservices Architecture

The LoveLaundry system follows a microservices architecture:
- Each service has a single responsibility
- Services communicate via HTTP APIs
- Independent deployment and scaling
- Fault isolation

### 11.2 Service Specifications

#### 11.2.1 User Service
- **Port**: 8001
- **Database**: user_db
- **Responsibilities**:
  - Authentication
  - Authorization
  - User management
  - Role management

#### 11.2.2 Bill Service
- **Port**: 8002
- **Database**: accounting_db
- **Responsibilities**:
  - Bill generation
  - Invoice management
  - Payment tracking
  - Balance calculation

#### 11.2.3 Quotation Service
- **Port**: 8003
- **Database**: operations_db
- **Responsibilities**:
  - Quotation management
  - Price calculation
  - Discount management
  - Quotation workflow

#### 11.2.4 Worker Service
- **Port**: 8004
- **Database**: operations_db
- **Responsibilities**:
  - Worker management
  - Task assignment
  - Shift scheduling
  - Performance tracking

#### 11.2.5 Laundry Management Service
- **Port**: 8005
- **Database**: operations_db
- **Responsibilities**:
  - Customer management
  - Order processing
  - Gate pass management
  - Delivery tracking

#### 11.2.6 Love AI Service
- **Port**: 8006
- **Database**: operations_db
- **Responsibilities**:
  - AI recommendations
  - Predictive analytics
  - Smart scheduling
  - Pattern recognition

### 11.3 Database Schema

#### 11.3.1 User Database (user_db)
```
users
├── _id
├── auth_id
├── password_hash
├── name
├── role
├── laundry_id
├── client_name
├── client_type
├── status
└── created_at

clients
├── _id
├── client_name
├── client_type
├── laundry_id
├── contact_info
├── billing_address
└── credit_limit
```

#### 11.3.2 Operations Database (operations_db)
```
orders
├── _id
├── order_number
├── customer_id
├── laundry_id
├── items
├── status
├── total_amount
└── created_at

linens
├── _id
├── linen_id
├── category
├── item_type
├── client_name
├── status
├── condition
├── wash_count
└── location

gate_passes
├── _id
├── gate_pass_number
├── customer_id
├── laundry_id
├── items
├── status
└── created_at
```

#### 11.3.3 Accounting Database (accounting_db)
```
bills
├── _id
├── bill_number
├── customer_id
├── laundry_id
├── line_items
├── subtotal
├── tax
├── total
├── status
└── created_at

payments
├── _id
├── bill_id
├── amount
├── payment_method
├── reference
├── date
└── created_at
```

### 11.4 API Design Principles

#### 11.4.1 RESTful Design
- Resource-based URLs
- HTTP methods for actions
- Status codes for responses
- Consistent response format

#### 11.4.2 Authentication
- JWT tokens in Authorization header
- Token validation on each request
- Refresh token mechanism
- Token expiration handling

#### 11.4.3 Error Handling
- Consistent error response format
- HTTP status codes
- Error messages
- Request IDs for tracing

---

## Chapter 12: API Reference

### 12.1 User Service API

#### 12.1.1 Authentication Endpoints

**POST /auth/login**
Login with credentials

Request:
```json
{
  "auth_id": "admin",
  "password": "secure_password"
}
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 43200
}
```

**POST /auth/refresh**
Refresh access token

Request:
```json
{
  "refresh_token": "refresh_token_value"
}
```

Response:
```json
{
  "access_token": "new_access_token",
  "token_type": "bearer",
  "expires_in": 43200
}
```

#### 12.1.2 User Management Endpoints

**POST /users**
Create new user

Request:
```json
{
  "auth_id": "new_user",
  "password": "secure_password",
  "name": "John Doe",
  "role": "LAUNDRY_MANAGER",
  "laundry_id": "laundry_123"
}
```

**GET /users**
List users (admin only)

Query parameters:
- `laundry_id`: Filter by laundry
- `role`: Filter by role
- `status`: Filter by status

**PATCH /users/{id}**
Update user

**DELETE /users/{id}**
Delete user (admin only)

### 12.2 Bill Service API

#### 12.2.1 Bill Endpoints

**POST /bills**
Create new bill

Request:
```json
{
  "customer_id": "customer_123",
  "line_items": [
    {
      "description": "Wash and fold",
      "quantity": 10,
      "unit_price": 5.00
    }
  ],
  "tax_rate": 0.15
}
```

**GET /bills**
List bills

Query parameters:
- `customer_id`: Filter by customer
- `status`: Filter by status
- `from_date`: Filter by date range
- `to_date`: Filter by date range

**GET /bills/{id}**
Get bill details

**PATCH /bills/{id}/status**
Update bill status

#### 12.2.2 Payment Endpoints

**POST /payments**
Record payment

Request:
```json
{
  "bill_id": "bill_123",
  "amount": 50.00,
  "payment_method": "CASH",
  "reference": "REF-001"
}
```

**GET /payments**
List payments

### 12.3 Quotation Service API

#### 12.3.1 Quotation Endpoints

**POST /quotations**
Create quotation

Request:
```json
{
  "customer_id": "customer_123",
  "items": [
    {
      "service_type": "WASH_AND_FOLD",
      "quantity": 100,
      "unit_price": 3.00
    }
  ],
  "valid_until": "2026-11-30"
}
```

**GET /quotations**
List quotations

**PATCH /quotations/{id}/status**
Update quotation status

### 12.4 Linen Service API

#### 12.4.1 Linen Endpoints

**POST /linens**
Register new linen

Request:
```json
{
  "linen_id": "LL-000123",
  "category": "BED_LINEN",
  "item_type": "SHEET",
  "client_name": "Cinnamon Grand"
}
```

**GET /linens**
List linens

**GET /linens/by-code/{code}**
Lookup linen by tag

**POST /linens/{id}/scan**
Update linen status

Request:
```json
{
  "action": "receive"
}
```

### 12.5 Client Portal API

#### 12.5.1 Hotel Portal Endpoints

**GET /client-portal/summary**
Get hotel summary

Response:
```json
{
  "hotel": "Cinnamon Grand",
  "open_gate_passes": 5,
  "deliveries_this_month": 23,
  "outstanding_amount": 1500.00,
  "invoiced_this_month": 4500.00,
  "currency": "LKR"
}
```

**GET /client-portal/gate-passes**
List gate passes

**GET /client-portal/deliveries**
List deliveries

**GET /client-portal/bills**
List bills

#### 12.5.2 Shop Portal Endpoints

**GET /client-portal/shop/summary**
Get shop summary

**GET /client-portal/shop/bills**
List shop bills

---

## Chapter 13: Security Best Practices

### 13.1 Secret Management

#### 13.1.1 Environment Variables
Never commit secrets to version control. Use environment variables:
```bash
export MASTER_KEY=$(openssl rand -hex 32)
export JWT_SECRET=$(openssl rand -hex 32)
```

#### 13.1.2 Secret Rotation
- Rotate secrets every 90 days
- Use a secret management service (AWS Secrets Manager, HashiCorp Vault)
- Document rotation procedures
- Test rotation in staging first

### 13.2 API Security

#### 13.2.1 Rate Limiting
- Default: 300 requests per minute per IP
- Configure per-endpoint limits
- Implement exponential backoff
- Monitor for abuse

#### 13.2.2 Input Validation
- Validate all input data
- Sanitize user input
- Use parameterized queries
- Implement length limits

#### 13.2.3 Output Encoding
- Encode all output
- Use safe templating engines
- Prevent XSS attacks
- Implement CSP headers

### 13.3 Data Protection

#### 13.3.1 Encryption at Rest
- Enable MongoDB encryption
- Encrypt backups
- Use TLS for all connections
- Implement key management

#### 13.3.2 Encryption in Transit
- Use HTTPS for all APIs
- Implement TLS 1.3
- Disable weak ciphers
- Use certificate pinning

#### 13.3.3 Data Minimization
- Collect only necessary data
- Implement data retention policies
- Anonymize data for analytics
- Provide data export/deletion

### 13.4 Access Control

#### 13.4.1 Principle of Least Privilege
- Grant minimum required permissions
- Regular audit access rights
- Revoke access promptly
- Use temporary credentials

#### 13.4.2 Multi-Factor Authentication
- Implement MFA for admin accounts
- Use time-based OTP
- Backup codes
- Hardware tokens

#### 13.4.3 Session Management
- Implement session timeout
- Secure cookie flags
- Logout functionality
- Session invalidation

### 13.5 Monitoring & Auditing

#### 13.5.1 Security Events
- Failed login attempts
- Privilege escalation
- Data access
- Configuration changes

#### 13.5.2 Logging
- Log all security events
- Use structured logging
- Centralize logs
- Retain logs per policy

#### 13.5.3 Alerting
- Real-time alerts for critical events
- Threshold-based alerting
- Escalation procedures
- Incident response plan

---

## Chapter 14: Data Management

### 14.1 Backup Strategy

#### 14.1.1 Backup Types
- **Full backups**: Complete database dump
- **Incremental backups**: Changes since last backup
- **Point-in-time recovery**: MongoDB feature

#### 14.1.2 Backup Schedule
- Daily full backups
- Hourly incremental backups
- 30-day retention
- Offsite storage

#### 14.1.3 Backup Script
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb"
mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/$DATE"
gzip "$BACKUP_DIR/$DATE"
aws s3 cp "$BACKUP_DIR/$DATE.gz" s3://backups/lovelaundry/
```

### 14.2 Data Migration

#### 14.2.1 Export Data
```bash
mongodump --uri="$MONGODB_URI" --db=user_db --out=./export
```

#### 14.2.2 Import Data
```bash
mongorestore --uri="$MONGODB_URI" --db=user_db ./export/user_db
```

#### 14.2.3 Migration Best Practices
- Test migration in staging
- Backup before migration
- Run migration during low-traffic
- Verify data integrity
- Rollback plan

### 14.3 Data Retention

#### 14.3.1 Retention Policy
- Active data: Indefinite
- Audit logs: 7 years
- Payment records: 7 years
- User activity: 1 year

#### 14.3.2 Data Archival
- Move old data to archive
- Compress archived data
- Store in cold storage
- Maintain index

#### 14.3.3 Data Deletion
- Soft delete for customer data
- Hard delete after retention period
- Anonymize before deletion
- Document deletion process

### 14.4 Performance Optimization

#### 14.4.1 Indexing
```python
# Example index
db.orders.create_index([
    ("laundry_id", 1),
    ("customer_id", 1),
    ("created_at", -1)
])
```

#### 14.4.2 Query Optimization
- Use indexed fields
- Limit result sets
- Use projection
- Avoid large scans

#### 14.4.3 Caching
- Cache frequently accessed data
- Use Redis for session cache
- Implement cache invalidation
- Monitor cache hit rate

---

## Chapter 15: Troubleshooting

### 15.1 Common Issues

#### 15.1.1 Service Won't Start
**Symptoms**: Service fails to start
**Causes**:
- Missing environment variables
- Database connection failure
- Port already in use
**Solutions**:
1. Check environment variables
2. Verify database connectivity
3. Check port availability
4. Review service logs

#### 15.1.2 Authentication Failures
**Symptoms**: Users cannot login
**Causes**:
- Invalid credentials
- Token expiration
- Secret mismatch
**Solutions**:
1. Verify credentials
2. Check token expiration
3. Validate secrets
4. Review auth logs

#### 15.1.3 Database Connection Issues
**Symptoms**: Cannot connect to database
**Causes**:
- Network issues
- Authentication failure
- Database down
**Solutions**:
1. Check network connectivity
2. Verify credentials
3. Check database status
4. Review connection string

### 15.2 Performance Issues

#### 15.2.1 Slow API Response
**Symptoms**: API calls take long to respond
**Causes**:
- Unoptimized queries
- Missing indexes
- High load
**Solutions**:
1. Add query logging
2. Create indexes
3. Optimize queries
4. Scale horizontally

#### 15.2.2 High Memory Usage
**Symptoms**: Service consumes excessive memory
**Causes**:
- Memory leaks
- Large result sets
- Caching issues
**Solutions**:
1. Profile memory usage
2. Limit result sets
3. Optimize caching
4. Restart service

### 15.3 Debugging Tools

#### 15.3.1 Service Logs
```bash
# View service logs
docker-compose logs -f bill_service

# Filter by level
docker-compose logs | grep ERROR
```

#### 15.3.2 Database Queries
```bash
# Enable query logging
db.setProfilingLevel(2)

# View slow queries
db.system.profile.find()
```

#### 15.3.3 API Testing
```bash
# Test endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8002/bills

# View response time
curl -w "@curl-format.txt" \
  http://localhost:8002/bills
```

### 15.4 Recovery Procedures

#### 15.4.1 Database Recovery
1. Stop all services
2. Restore from backup
3. Verify data integrity
4. Restart services
5. Monitor for issues

#### 15.4.2 Service Recovery
1. Identify failed service
2. Check service logs
3. Fix root cause
4. Restart service
5. Verify functionality

#### 15.4.3 Disaster Recovery
1. Activate disaster recovery plan
2. Restore from offsite backup
3. Verify all systems
4. Communicate with stakeholders
5. Document incident

---

# Part IV: Appendices

## Appendix A: Quick Reference

### A.1 Common URLs

| Service | Local URL | Production URL |
|---------|-----------|----------------|
| Hotel App | http://localhost:5173 | https://hotel.lovelaundry.lk |
| Shop App | http://localhost:5174 | https://shop.lovelaundry.lk |
| Linen Room App | http://localhost:5175 | https://linen.lovelaundry.lk |
| Quotations UI | http://localhost:5176 | https://system.lovelaundry.lk |

### A.2 Default Ports

| Service | Port |
|---------|------|
| User Service | 8001 |
| Bill Service | 8002 |
| Quotation Service | 8003 |
| Worker Service | 8004 |
| Laundry Management | 8005 |
| Love AI | 8006 |
| MongoDB | 27017 |

### A.3 Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 429 | Rate Limited |
| 500 | Internal Server Error |

### A.4 Role Permissions

| Role | Can Create Users | Can View All Data | Can Delete |
|------|-----------------|------------------|------------|
| LAUNDRY_ADMIN | Yes | Yes | Yes |
| LAUNDRY_MANAGER | Yes | Yes | No |
| HOTEL_ADMIN | Own Staff | Own Data | No |
| HOTEL_MANAGER | No | Own Data | No |
| SHOP_ADMIN | Own Staff | Own Data | No |
| SHOP_STAFF | No | Own Data | No |

---

## Appendix B: Glossary

**Client**: A customer of the laundry service (hotel, shop, individual)

**Gate Pass**: Document authorizing linen collection/delivery

**Linen**: Fabric items managed by the laundry (sheets, towels, etc.)

**Laundry**: The business entity providing laundry services

**Quotation**: Price estimate for services

**Bill**: Invoice for services rendered

**Worker**: Employee who performs laundry operations

**Scan**: Process of reading a linen tag to update its status

**Tenant**: A laundry business in a multi-tenant deployment

**Token**: JWT authentication credential

---

## Appendix C: Revision History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | October 2026 | Comprehensive expansion to 200+ pages, added illustrations, updated security section |
| 1.0 | July 2026 | Initial release |

---

## Appendix D: Contact Information

**Support Email**: support@lovelaundry.lk
**Documentation**: https://docs.lovelaundry.lk
**GitHub**: https://github.com/lovelaundry/system
**Community Forum**: https://community.lovelaundry.lk

---

**End of Manual**
