title Azure Entra ID Authentication Flow via AWS ALB (Simplified)

actor User as 👤 User
participant ALB as 🌐 AWS Application Load Balancer
participant Entra as ☁️ Azure Entra ID (Authentication)
participant App as 💻 Application (Backend on EC2)

note over User,App: Simple practical authentication flow

User->ALB: 1) Open application URL (HTTPS)
ALB-->User: 2) Redirect user to Azure Entra ID login page
User->Entra: 3) Enter corporate credentials\n(User ID + Password / MFA)
Entra->Entra: 4) Validate user against AD Group membership
Entra-->ALB: 5) Confirm successful authentication
ALB->App: 6) Forward user request to backend\nwith verified identity info
App-->User: 7) Display application dashboard / protected content

note over Entra: • Users must be added in Entra ID group\n• Group is created by IT/Admin team\n• Only group members can access the app
note over ALB: • ALB is configured with HTTPS + OIDC provider\n• Redirects to Entra for authentication
note over App: • Application hosted on EC2\n• Receives traffic only after user is authenticated