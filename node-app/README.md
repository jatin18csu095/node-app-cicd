title Minimal App Flow (Entra + ALB)

actor User
participant ALB
participant Entra
participant App

User->ALB: Access HTTPS URL
ALB-->User: Redirect to Entra (login)
User->Entra: Enter credentials
Entra-->ALB: Auth code
ALB->Entra: Code -> Tokens
Entra-->ALB: ID token (JWT)
ALB->App: Forward with identity headers
App-->User: Protected response