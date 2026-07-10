## Red Flags

| Thought | Reality |
|---------|---------|
| "Client-side validation is enough" | Client-side is for UX. Server-side is for security. Always do both. |
| "I'll sanitize the input to make it safe" | Prefer rejection over sanitization. You can't think of every bypass. |
| "MD5 is fine for non-security hashing" | MD5 has collision attacks. Use SHA-256 for all hashing. |
| "I'll encrypt the password" | Passwords should be HASHED (one-way), not encrypted (two-way). |
| "Our API is internal, no need for input validation" | Internal APIs are attacked via compromised services. Validate everywhere. |
| "I'll implement my own encryption for simplicity" | Rolling your own crypto is the #1 way to create vulnerable systems. |

---
