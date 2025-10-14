title Minimal Flow (Ping + Entra + ALB)

actor User
participant ALB
participant Entra
participant Ping
participant App

User->ALB: Access HTTPS URL
ALB->User: Redirect to Entra
User->Entra: Start sign-in
Entra->Ping: Federated auth / MFA
Ping->Entra: Auth OK
Entra->ALB: Sign-in confirmed
ALB->App: Forward request (authenticated)
App->User: Protected content