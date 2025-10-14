%% Color-coded Azure Entra ID Integration Flow & Sequence Diagram

%% FLOW DIAGRAM
flowchart TD
    style A fill:#e0f7fa,stroke:#006064,stroke-width:2px
    style B fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    style C fill:#bbdefb,stroke:#0d47a1,stroke-width:2px
    style D fill:#bbdefb,stroke:#0d47a1,stroke-width:2px
    style E fill:#bbdefb,stroke:#0d47a1,stroke-width:2px
    style F fill:#c8e6c9,stroke:#1b5e20,stroke-width:2px
    style G fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    style H fill:#c8e6c9,stroke:#1b5e20,stroke-width:2px

    A[👤 User] -->|1️⃣ Access App URL| B[🌐 AWS Application Load Balancer (ALB)]
    B -->|2️⃣ Unauthenticated - Redirect| C[🔐 Azure Entra ID Login Page]
    C -->|3️⃣ User Enters Credentials| D[🧩 Entra ID Validates User]
    D -->|4️⃣ Check Group Membership| E[👥 Verify AD Group (e.g., GIFT_ARCHIVE_USERS)]
    E -->|5️⃣ If Valid| F[📜 Issue ID Token (OIDC)]
    F -->|6️⃣ Return Token| G[🧾 ALB Validates Token]
    G -->|7️⃣ Authenticated| H[💻 Forward Request to Backend Application (EC2/ECS)]
    H -->|8️⃣ Response| A

    subgraph Azure_Entra_ID[☁️ Azure Entra ID / Active Directory]
        C --> D --> E --> F
    end

    subgraph AWS_Environment[☁️ AWS Environment]
        B --> G --> H
    end


%% SEQUENCE DIAGRAM
sequenceDiagram
    autonumber
    participant User as 👤 User
    participant ALB as 🌐 Application Load Balancer (AWS)
    participant Entra as 🔐 Azure Entra ID (IdP)
    participant Backend as 💻 Backend Application (EC2/ECS)

    User->>ALB: 1️⃣ Access application URL (HTTPS)
    ALB->>Entra: 2️⃣ Redirect to Microsoft Login (OIDC Request)
    Entra->>User: 3️⃣ Display login page
    User->>Entra: 4️⃣ Submit credentials
    Entra->>Entra: 5️⃣ Validate credentials & check AD group membership
    Entra-->>ALB: 6️⃣ Return ID token (OIDC Response)
    ALB->>ALB: 7️⃣ Validate ID token using Azure public keys
    ALB->>Backend: 8️⃣ Forward request with user identity headers
    Backend-->>ALB: 9️⃣ Send response to ALB
    ALB-->>User: 🔟 Return authenticated content
