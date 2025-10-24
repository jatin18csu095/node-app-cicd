title Minimal App Flow (Entra + ALB)

actor User
participant Browser
participant ALB
participant Entra
participant App

note over Entra: Pre-setup (once)\n• Create Entra group & add users\n• Register App (OIDC)\n• Redirect URI: https://<APP_DNS>/oauth2/idpresponse\n• Copy: Client ID, Secret, Tenant, Auth/Token endpoints

note over ALB: Pre-setup (once)\n• HTTPS listener (443) with ACM cert\n• OIDC action -> Entra (Client ID/Secret, Issuer)\n• Forward to ECS/Fargate Target Group\n• Optional identity headers to app

User->Browser: Open <APP_DNS> (HTTPS)
Browser->ALB: GET /
ALB->Browser: Redirect to Entra login (no session)

Browser->Entra: Show login page
User->Entra: Enter corporate credentials (MFA if required)
Entra->Browser: Auth code sent via redirect to ALB
Browser->ALB: Return with auth code
ALB->Entra: Exchange code for tokens
Entra->ALB: OK (tokens valid)

ALB->App: Forward request\n(optional x-amzn-oidc-* headers)
App->ALB: Protected content
ALB->Browser: 200 OK (app page)
Browser->User: Render application

== Optional ==
User->Browser: Click Logout
Browser->ALB: /logout
ALB->Browser: Redirect to Entra logout\nthen back to app home