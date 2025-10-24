title DevOps Build Flow (Entra ID + AWS ALB + ECS Fargate)

actor DevOps
participant SailPoint as SailPoint (AD Group Request)
participant Entra as Entra Admin Center
participant Secrets as AWS Secrets Manager
participant ACM as AWS ACM (TLS)
participant SG as AWS Security Groups
participant TG as Target Group (IP, Fargate)
participant ECS as ECS Fargate Service
participant ALB as AWS Application Load Balancer
participant DNS as Route 53

note over DevOps: Repeat ALB + ECS steps per app (8 apps => 8 ALBs)

== Azure Entra prep ==
DevOps->SailPoint: Request new Azure AD Group (project-specific)
SailPoint-->DevOps: Group created & approved
DevOps->Entra: Add project users to Group
DevOps->Entra: Register "Gift <AppName>" (OIDC) application
DevOps->Entra: Add Redirect URI:\nhttps://<APP_DNS>/oauth2/idpresponse
DevOps->Entra: Grant Group access to the App
Entra-->DevOps: Provide Tenant ID, Client ID, Issuer/Auth/Token endpoints
DevOps->Entra: Create Client Secret (expiry noted)
Entra-->DevOps: Client Secret value
DevOps->Secrets: Store ClientID/Secret/Tenant/Issuer as secret\n(e.g., gift/<app>/entra-oidc)

== AWS networking & security ==
DevOps->ACM: Request/Import TLS cert for <APP_DNS>
ACM-->DevOps: Certificate Issued
DevOps->SG: Create SG-ALB-<app> (HTTPS 443 in; app-specific egress)
DevOps->SG: Create SG-ECS-<app> (Allow ALB->AppPort; least privilege)

== Target group & ECS ==
DevOps->TG: Create TG-<app> (IP target type, AppPort, health check)
DevOps->ECS: Create Task Definition (container, port, env, log)
DevOps->ECS: Create Fargate Service (in private subnets)\nattach TG-<app>

== ALB ==
DevOps->ALB: Create ALB-<app> (internet-facing, public subnets)\nattach SG-ALB-<app>
DevOps->ALB: Add HTTPS :443 listener with ACM cert
DevOps->ALB: Listener rule: Authenticate via OIDC -> Entra\n(Issuer, ClientID, Secret from Secrets Manager)
DevOps->ALB: On success -> Forward to TG-<app>\n(Optional) Add identity headers to target

== DNS ==
DevOps->DNS: Create A/AAAA record <APP_DNS> -> ALB-<app> DNS name
DNS-->DevOps: Public URL active

== Validation (per app) ==
DevOps->ALB: Access https://<APP_DNS>
ALB-->DevOps: Redirects to Entra login (policy-driven)
DevOps->ALB: After login, verify app loads & health checks pass
DevOps->ALB: Confirm logout URL (optional)

note over DevOps,ALB: Outputs per app:\n• Entra App (Client ID, Secret, Issuer)\n• Secret ARN (stored)\n• ACM cert ARN\n• ALB/TG/SG names\n• Route53 record