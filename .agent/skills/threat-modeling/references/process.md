## The Process

### Phase 1: Scope & Assets

1. **Define what you're modeling** — Single feature? Component? Whole system?
2. **List assets** — What data/resources need protection?
3. **Identify actors** — Who interacts with the system? (users, admins, external APIs, attackers)

### Phase 2: Map Data Flows & Trust Boundaries

1. **Draw data flow** — How does data move through the system?
2. **Mark trust boundaries** — Where does trust level change?
3. **Identify entry points** — Where can external input reach the system?

### Phase 3: STRIDE Analysis

For each component/data flow:
1. Walk through all 6 STRIDE categories
2. Rate likelihood and impact (High/Medium/Low)
3. Calculate risk = likelihood × impact
4. Document existing mitigations
5. Flag open risks

### Phase 4: Attack Trees (Optional)

For high-risk components:
1. Define attacker goal
2. Decompose into sub-goals (AND/OR)
3. Map attack vectors to each sub-goal
4. Mark mitigated vs open vectors

### Phase 5: Document & Handoff

1. Save threat model document
2. Create security requirements from open risks
3. Feed into the PRD or FSD, depending on whether the risk changes product behavior or implementation controls

---
