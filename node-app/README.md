title Azure Entra ID Authentication Flow via AWS ALB

actor User as 👤 End User
participant ALB as 🌐 AWS Application Load Balancer
participant Entra as ☁️ Azure Entra ID (OIDC)
participant ADGroup as 👥 AD Group (GIFT_ARCHIVE_USERS)
participant AppReg as 🧾 Entra App Registration
participant TG as 🎯 Target Group
participant EC2 as 💻 Backend App (EC2)
participant ACM as 📜 AWS Certificate Manager
participant AWSAdmin as 🛠️ AWS Admin
participant AzureAdmin as 🔐 Azure Admin
participant Secrets as 🔑 Secrets Manager

note over AWSAdmin,AzureAdmin: 🔧 Provisioning & Setup Phase

AWSAdmin->ACM: Request/Import HTTPS Certificate
ACM-->AWSAdmin: Certificate Issued
AWSAdmin->EC2: Launch Backend Instance (port 80/8080)
AWSAdmin->TG: Create Target Group & Register EC2
AWSAdmin->ALB: Create ALB (internet-facing)
AWSAdmin->ALB: Attach HTTPS Listener & Certificate

AzureAdmin->AppReg: Register Application in Entra ID
AzureAdmin->AppReg: Add Redirect URI (https://<ALB-DNS>/oauth2/idpresponse)
AppReg-->AzureAdmin: Provides Client ID & Tenant ID
AzureAdmin->AppReg: Generate Client Secret
AzureAdmin->ADGroup: Create AD Group & Add Users
AzureAdmin-->AWSAdmin: Share Tenant ID, Client ID, Secret
AWSAdmin->Secrets: Store Client Secret in AWS Secrets Manager
AWSAdmin->ALB: Configure OIDC Authentication with Entra ID
ALB->ALB: Add Rule — Authenticate OIDC → Forward to TG

note over User,EC2: 🚀 Runtime Authentication Flow

User->ALB: Access Application URL (HTTPS)
ALB-->User: Redirect to Azure Entra ID Login Page
User->Entra: Submit Credentials (User/Password + MFA)
Entra->ADGroup: Validate Group Membership
Entra-->ALB: Return Authorization Code
ALB->Entra: Exchange Code for Tokens (Token Endpoint)
Entra-->ALB: Return ID Token (JWT)
ALB->ALB: Validate Token (Issuer, Signature, Audience)
ALB->EC2: Forward Request with OIDC Headers (x-amzn-oidc-data)
EC2-->User: Send Application Response

note over User,ALB: 🔁 Optional Logout Flow
User->ALB: /logout
ALB-->User: Redirect to Entra End-Session Endpoint
ALB->ALB: Clear ALB Auth Session Cookie