## Attack Tree Analysis

Use attack trees for high-risk components where the attacker goal takes several steps.

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

---
