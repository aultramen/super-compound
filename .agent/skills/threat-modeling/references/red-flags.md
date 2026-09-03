## Red Flags

| Thought | Reality |
|---------|---------|
| "This feature doesn't need threat modeling" | Every feature that handles data or interacts with users has threats. |
| "We'll do threat modeling after launch" | A threat found in production is already a vulnerability with users behind it. |
| "Our framework handles security" | Frameworks provide tools, not guarantees. Misconfiguration = vulnerability. |
| "It's an internal API, nobody will attack it" | Internal APIs are reached through compromised services and lateral movement; validate and authorize there too. |

---
