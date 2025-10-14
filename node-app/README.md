In our setup, authentication starts through Azure Entra ID, but Ping Identity acts as a federated provider to extend Entra’s security.
When a user tries to log in through the ALB, they are redirected to Entra ID, which in turn passes the authentication to PingFederate.
Ping handles extra validations like MFA or on-prem AD check. Once successful, Ping sends a trust token back to Entra, which confirms the user identity and issues an access token to the ALB.
The ALB then forwards that verified identity to our backend app, which finally displays the secure content.
Essentially, Ping adds multi-factor and role-based enforcement, while Entra ID stays as the central identity provider trusted by AWS.”
