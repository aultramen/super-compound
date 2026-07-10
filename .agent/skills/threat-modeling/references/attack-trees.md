## Attack Tree Analysis

Use attack trees to model complex multi-step attacks:

### Template

```
ROOT: [Attacker Goal]
├─ AND/OR: [Sub-goal 1]
│  ├─ [Attack Vector A] [Mitigated: control] / [OPEN: needs mitigation]
│  └─ [Attack Vector B] [Mitigated: control] / [OPEN: needs mitigation]
└─ AND/OR: [Sub-goal 2]
   ├─ [Attack Vector C] [Mitigated: control]
   └─ [Attack Vector D] [OPEN: needs mitigation]
```

### Legend
- **AND:** All child nodes must succeed for parent to succeed
- **OR:** Any child node success achieves parent goal
- **[Mitigated]:** Control in place, residual risk accepted
- **[OPEN]:** No control — needs mitigation

### Example

```
ROOT: Steal User Credentials
├─ OR: Obtain Password
│  ├─ Brute force login [Mitigated: rate limiting + lockout]
│  ├─ Credential stuffing [Mitigated: MFA + breach detection]
│  ├─ Phishing [OPEN: needs user training]
│  └─ SQL injection on login [Mitigated: parameterized queries]
└─ OR: Steal Session
   ├─ XSS to steal cookies [Mitigated: httpOnly + CSP]
   ├─ Session fixation [Mitigated: regeneration on login]
   └─ Network sniffing [Mitigated: TLS 1.2+]
```

---
