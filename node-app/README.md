title App Flow (Entra + ALB — Simplified)

actor User
participant ALB
participant Entra
participant App

User->ALB: 1) Access HTTPS URL
ALB->User: 2) Redirect to Entra (login)
User->Entra: 3) Enter corporate credentials
Entra->ALB: 4) Confirm authentication\n(and check group membership)
ALB->ALB: 5) Verify sign-in with Entra\n(create/refresh session)
ALB->App: 6) Forward request (only if authenticated)
App->User: 7) Show protected page

note over Entra: Users are managed in Entra ID.\nAdd members to the AD group to allow access.
note over ALB: ALB enforces HTTPS and redirects to Entra.
note over App: Backend service (EC2/ECS) receives traffic only after auth.