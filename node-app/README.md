



Action Items (New Column)
Output / Deliverable
Comments / Notes
Raise new Azure AD access request in SailPoint
Prudential
Completed
Group Name, Approver
No action pending — already approved by Manager and Identity Team.
AD Group created, Object ID
Submitted via SailPoint workflow.
Manager approval for AD group creation
Prudential
Completed
Manager / Identity Team
No action pending.
Approval confirmation
Approval received, proceed to Entra setup.
Create AD Group in Entra
Prudential
Completed
Group Name, Description
No action pending.
AD Group available in Entra
Used for app registration and access management.
Add members (users) to AD Group
Prudential
Completed
User XID, Usernames
No action pending.
Members added to AD group
Defines users with access permissions.
Retrieve Object ID of created AD Group
Prudential
Completed
AD Group Name
No action pending.
Group Object ID
Used for app registration mapping.
Submit SSO Intake Request via MyPruIT
Prudential
Completed
Application Name, Environment, Contact
No action pending.
Ticket created in MyPruIT
Initiates Entra app registration process.
Engineer assigned to onboard Entra App
Prudential
Completed
MyPruIT Ticket ID
No action pending.
Assigned engineer details
Engineer handles Entra registration.
App registered in Entra ID
Prudential
Completed
App Name, Redirect URI
No action pending.
Client ID, Tenant ID generated
Required for OIDC integration with AWS ALB.
Generate Client Secret
Prudential
Completed
App Name
No action pending.
Client Secret created
Stored securely in Secrets Manager / Key Vault.
Share OIDC credentials with DevOps team
Prudential
Completed
Client ID, Tenant ID, Secret Reference
No action pending — credentials already shared via email (QTS-DEV/UAT/PROD).
OIDC credentials shared
Used to configure manifest.yaml for deployment.
Update manifest.yaml in infra repo
Deloitte
Pending
OIDC: Enabled, Client ID, Tenant ID, Secret Reference
Action pending from Deloitte DevOps — need to update infra manifest.yaml with OIDC parameters.
Updated manifest.yaml
Redeploy infra repo with OIDC enabled.
Deploy infrastructure sequentially (IaC first)
Deloitte
Pending
Terraform / CloudFormation scripts
Action pending from Deloitte DevOps — redeploy ALB, Secrets, Route53 after OIDC config added.
Infrastructure deployed
Ensures infra readiness for OIDC onboarding.
Reconfigure microservice repo for OIDC parameters
Deloitte
Pending
Client ID, Tenant ID, Secret Reference
Action pending from Deloitte Developer — update app-service manifest with OIDC parameters.
Updated microservice config
Allows ECS app to read OIDC parameters.
Validate ALB OIDC configuration
Deloitte
Pending
ALB Listener Rules
Action pending from Deloitte DevOps — verify ALB OIDC authentication working with Entra.
Rule showing “Authenticate using OIDC”
Ensures ALB-tenant link validated.
Submit OIDC onboarding request per environment (QA/DR/Prod)
Prudential
Pending
Environment details
Action pending from Prudential Identity / Security Team — create environment-level onboarding tickets.
Environment OIDC tickets
Each environment requires separate setup.
Cross-check endpoints and OIDC URLs
Deloitte + Prudential
Pending
Issuer, Authorization, JWKS URLs
Joint action: Prudential to share OIDC endpoints, Deloitte to validate Issuer/Token match.


