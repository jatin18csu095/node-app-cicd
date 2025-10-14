title Azure Entra ID (OIDC) Authentication Flow via AWS ALB

actor User as 👤 User
participant ALB as 🌐 AWS Application Load Balancer
participant Entra as ☁️ Azure Entra ID (OIDC)
participant Backend as 💻 Backend App (EC2/ECS)

note over User,Backend: Runtime flow (high level)

User->ALB: 1) Open application URL (HTTPS)
ALB-->User: 2) Redirect to Entra authorize URL\n(unauthenticated request)
User->Entra: 3) Sign in with corporate credentials\n(MFA/Conditional Access if required)
Entra-->ALB: 4) Redirect back with Authorization Code\n(to https://<ALB-DNS>/oauth2/idpresponse)
ALB->Entra: 5) Exchange code for tokens\n(Token endpoint)
Entra-->ALB: 6) Return ID token (JWT) [+ access token]
ALB->ALB: 7) Validate token (issuer, audience, signature)
ALB->Backend: 8) Forward request with identity headers\nx-amzn-oidc-identity, x-amzn-oidc-data
Backend-->User: 9) Return protected content

note over User,ALB: Optional logout
User->ALB: /logout
ALB-->User: Redirect to Entra end-session\nand clear ALB session cookie