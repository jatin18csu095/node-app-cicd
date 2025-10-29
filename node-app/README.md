flowchart TD
  %% High-level AD Integration overview (client-friendly)
  A[Start] --> B[Access Requests & Prerequisites]
  subgraph B1[Access Requests & Prerequisites]
    B1a[SailPoint: Request new AD Group per app]
    B1b[Entra Admin: Create AD Group (if needed)]
    B1c[Add Users: Add app members to AD Group]
    B1d[Entra Admin: App Registration per app]
    B1e[Generate Client Secret & note Client/Tenant IDs]
    B1f[Assign AD Group to Enterprise App]
    B1g[Collect OIDC endpoints (Issuer, Auth, Token, JWKS)]
    B1h[Manager Approval (SailPoint workflow)]
  end

  B --> C[Azure Entra Setup]
  subgraph C1[Azure Entra Setup]
    C1a[Confirm Redirect URI (temp placeholder)]
    C1b[Record Object IDs (App/Group)]
  end

  C --> D[AWS Networking & Security]
  subgraph D1[AWS Networking & Security]
    D1a[VPC (use existing/shared)]
    D1b[Subnets: Public (ALB), Private (ECS)]
    D1c[Security Groups: ALB-SG & ECS-SG]
    D1d[Route53: Public DNS CNAME → ALB]
    D1e[Secrets Manager: store Entra Client Secret]
    D1f[CloudWatch/S3: ALB logs & metrics]
  end

  D --> E[Application Load Balancer (ALB)]
  subgraph E1[Application Load Balancer (per app)]
    E1a[Create ALB (1 per app)]
    E1b[Attach ACM cert; enable HTTPS:443]
    E1c[Listener Rule #1: OIDC authenticate with Entra]
    E1d[Listener Rule #2: Forward to ECS target group (on auth OK)]
  end

  E --> F[ECS Fargate]
  subgraph F1[ECS Fargate]
    F1a[ECR: repo per app, push image]
    F1b[ECS Task Definition: port/CPU/mem]
    F1c[Target Group (IP)]
    F1d[ECS Service in private subnets]
  end

  F --> G[OIDC Integration Touchpoints]
  subgraph G1[OIDC Integration (ALB + Entra)]
    G1a[ALB OIDC config: Client ID, Issuer, Auth/Token/JWKS URLs]
    G1b[ALB uses Secret from Secrets Manager]
    G1c[Update Entra Redirect URI with ALB DNS]
  end

  G --> H[Session Management]
  subgraph H1[Session Management (ALB-managed)]
    H1a[Session cookie created on login]
    H1b[Timeout policy (security standard)]
    H1c[Re-auth redirect to Entra on expiry]
  end

  H --> I[End-to-End User Flow]
  subgraph I1[End-to-End Flow]
    I1a[User hits https://<APP_DNS>]
    I1b[ALB checks session → if none, redirect to Entra]
    I1c[User signs in (member of ACC_<APP>_USERS)]
    I1d[ALB forwards authenticated request to ECS]
    I1e[App responds securely]
  end

  I --> J[Done]






title AD Integration: High-Level DevOps Flow (Access → Entra → AWS → OIDC → App)

actor Requester
participant SailPoint
participant "Entra Admin Center" as Entra
participant "AWS (VPC/ACM/Route53/Secrets)" as AWS
participant "ALB (per app)" as ALB
participant "ECS Fargate" as ECS
participant App

Requester->SailPoint: Submit request to create AD Group per app
SailPoint->Requester: Manager/Identity approval workflow
Requester->Entra: Create AD Group (if not auto-provisioned)
Requester->Entra: Add users to AD Group (ACC_<APP>_USERS)

Requester->Entra: Register App (per app)
Entra->Requester: Client ID & Tenant ID
Requester->Entra: Create Client Secret
Entra->Requester: Secret value (to store in AWS)

Requester->AWS: Store Client Secret in Secrets Manager
Requester->AWS: Validate VPC, subnets (Public for ALB, Private for ECS)
Requester->AWS: Create SGs (ALB-SG, ECS-SG)
Requester->AWS: (Optional) Create Route53 DNS CNAME → ALB
Requester->AWS: Ensure ACM certificate (HTTPS)

Requester->ALB: Create ALB (per app), enable HTTPS:443
Requester->ALB: Add OIDC auth rule (Issuer, Auth/Token/JWKS, Client ID, Secret ref)
ALB->Entra: Redirect users to Entra login as needed
Entra->ALB: Auth OK (user in AD Group)

Requester->ECS: Create ECR repo, push image
Requester->ECS: Create Task Definition & Target Group
Requester->ECS: Create Service (private subnets)
ALB->ECS: Forward authenticated traffic to target group
ECS->App: Serve request
App->User: Secure response via ALB






title AD Integration Steps (Access Request → Entra → AWS → ALB/ECS)

actor Requester
participant "SailPoint (Access Portal)" as SailPoint
participant "Manager / Identity Team" as Manager
participant "Entra Admin Center" as Entra
participant "AWS (Networking/Secrets/ACM/Route53)" as AWS
participant "ALB (per app)" as ALB
participant "ECS Fargate (per app)" as ECS
participant "Application" as App
actor User

== Access Requests & Approvals ==
Requester->SailPoint: Step 1: Raise access request for new AD Group (per app)
SailPoint->Manager: Step 2: Send for manager/identity approval
Manager->SailPoint: Step 3: Approve request
SailPoint->Requester: Step 4: Approval complete (proceed to Entra)

== Entra (Azure AD) Setup ==
Requester->Entra: Step 5: Create AD Group (if not already provisioned)
Requester->Entra: Step 6: Add members to AD Group (ACC_<APP>_USERS)
Requester->Entra: Step 7: Register Application (per app)
Entra->Requester: Step 8: Return Client ID & Tenant ID
Requester->Entra: Step 9: Create Client Secret (copy value)
Requester->Entra: Step 10: Assign AD Group to Enterprise App (who can sign in)
Requester->Entra: Step 11: Collect OIDC endpoints (Issuer/Auth/Token/JWKS)
note right of Entra: Keep Redirect URI as placeholder until ALB DNS is known

== AWS Foundation ==
Requester->AWS: Step 12: Confirm/prepare VPC + subnets (Public for ALB, Private for ECS)
Requester->AWS: Step 13: Create Security Groups (ALB-SG, ECS-SG)
Requester->AWS: Step 14: Import/attach ACM certificate for app domain (HTTPS)
Requester->AWS: Step 15: Store Entra Client Secret in Secrets Manager
Requester->AWS: Step 16: (If needed) Create Route53 record <APP_DNS> → ALB

== ALB & ECS per Application ==
Requester->ALB: Step 17: Create dedicated ALB (per app) in public subnets
Requester->ALB: Step 18: Add HTTPS :443 listener with certificate
Requester->ALB: Step 19: Configure OIDC auth rule (Issuer, Client ID, Secret ref, endpoints)
Requester->ECS: Step 20: Create ECR repo & push image
Requester->ECS: Step 21: Create Task Definition (port/CPU/Memory)
Requester->ECS: Step 22: Create IP Target Group & ECS Service (private subnets)
ALB->ECS: Step 23: Listener rule forwards authenticated traffic to Target Group

== Finalize Entra Redirect ==
Requester->Entra: Step 24: Update Redirect URI to ALB DNS (exact https URL)

== End-to-End User Flow ==
User->ALB: Step 25: Hit https://<APP_DNS>
ALB->User: Step 26: If no session → Redirect to Entra login
User->Entra: Step 27: Sign in (must be member of AD Group)
Entra->ALB: Step 28: Auth OK → return to ALB
ALB->ECS: Step 29: Forward request (authenticated) to ECS target
ECS->App: Step 30: Serve app response
App->User: Step 31: Protected content displayed (session managed by ALB)




flowchart TD
A[SailPoint: Raise AD Group request] --> B[Manager/Identity: Approve]
B --> C[Entra: Create AD Group & add members]
C --> D[Entra: App Registration\nClient ID/Tenant ID + Client Secret]
D --> E[Entra: Assign AD Group to Enterprise App]
E --> F[Entra: Collect OIDC endpoints (Issuer/Auth/Token/JWKS)]
F --> G[AWS: VPC/Subnets (Public ALB, Private ECS)]
G --> H[AWS: SGs (ALB-SG, ECS-SG)]
H --> I[AWS: ACM cert + Secrets Manager (store client secret)]
I --> J[ALB (per app): HTTPS:443 + OIDC rule]
J --> K[ECS Fargate: ECR, TaskDef, Target Group, Service]
K --> L[Entra: Update Redirect URI = ALB DNS]
L --> M[User Flow: https://<APP_DNS> → Entra login → Auth OK → ALB → ECS → App]
