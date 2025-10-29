title Azure Entra ID Setup & Access Workflow (Pre-Integration Phase)

actor Requester
participant "SailPoint (Access Portal)" as SailPoint
participant "Manager / Identity Team" as Manager
participant "Entra Admin Center" as Entra
participant "Security / Identity Governance" as SecurityTeam

== Access Request & Approval ==
Requester->SailPoint: Step 1: Raise new access request\n(Request creation of Azure AD Group per app)
SailPoint->Manager: Step 2: Route request for Manager/Identity approval
Manager->SailPoint: Step 3: Approve AD group creation request
SailPoint->Requester: Step 4: Approval complete — proceed to Entra setup

== Entra Group Creation ==
Requester->Entra: Step 5: Create AD Group (if not auto-provisioned)\nExample: ACC_<APP>_USERS
Requester->Entra: Step 6: Add members (users) to the AD Group
Entra->Requester: Step 7: Group created, Object ID available

== App Registration ==
Requester->Entra: Step 8: Register Application (per app)
Entra->Requester: Step 9: Return Client ID & Tenant ID
Requester->Entra: Step 10: Generate Client Secret\n(Store securely in Secrets Manager later)
Requester->Entra: Step 11: Assign AD Group to Enterprise App\n(Define which users can sign in)

== OIDC Endpoint Preparation ==
Requester->Entra: Step 12: Collect OIDC endpoints\n(Issuer, Authorization, Token, JWKS)
note right of Entra: These values are needed later for ALB OIDC integration

== Security & Validation ==
Entra->SecurityTeam: Step 13: Apply Conditional Access / MFA policies (if required)
SecurityTeam->Entra: Step 14: Validate Entra configuration complete
Requester->Requester: Step 15: Entra side setup ready for integration