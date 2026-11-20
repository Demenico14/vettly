# Candidate Experience in Online Psychometric Testing and Item-Pool Licensing (2025-2026)

Scope note: research was capped at about 15 tool calls. Primary sources were fetched for IPIP, ICAR and HEXACO licensing, plus ThriveMap and HireVue completion data. Several candidate-experience parameters (deadline length, reminder cadence, practice-item counts) had no primary benchmark in what I found. They are given as design assumptions under Inferences, not as cited facts. No proprietary items are reproduced here.

## A1. Invitations, channels, deadlines, reminders and extensions

### Takeaway
I found no published benchmark for deadline length or reminder cadence. Vendor evidence says to state a realistic time estimate in the invitation and to keep it accurate, because overstating length drives drop-off. A 3-7 day window with reminders at roughly 48h and 24h before the deadline is a reasonable design default, but it is not research-backed.

### Cited Findings
- HireVue shows an estimated test length up front. It reports dropout caused by overestimating length, for example quoting "30 minutes" when the median completion time is in the low 20s. It advises being forthright and realistic so candidates can plan their time. — [HireVue whitepaper, Applicant Dropout: Completion Rate Drivers and Consequences (2025)](https://www.hirevue.com/wp-content/uploads/2025/10/2025_10_Applicant-Dropout-Completion-Rates_Whitepaper.pdf)
- Extending the deadline to complete a test is listed as a standard reasonable adjustment for disabled and neurodivergent applicants, alongside extra time. — [Imperial College Careers guide (via search snippet; the PDF returned 403)](https://www.imperial.ac.uk/media/imperial-college/administration-and-support-services/careers-service/public/about/Psychometric-tests---a-guide-for-disabled-and-neurodivergent-applicants.pdf)
- Metaview notes that the invitation-to-start rate is a separate metric from completion after starting, and that it does not publish one. — [Metaview blog](https://www.metaview.ai/resources/blog/screening-completion-rate-candidate-experience)

### Inferences
- Suggested mock-data defaults. These are design assumptions, not benchmarks:

| Parameter | Suggested default | Range to sample in mock data |
|---|---|---|
| Channel | Email (primary), SMS link (secondary), WhatsApp (where opted in; common in South Africa and other emerging markets) | email 100%, SMS 40-70%, WhatsApp 0-50% |
| Deadline | 5 days | 3, 5, 7, 10 days (graduate campaigns are often 7-14) |
| Reminders | at 48h and 24h before expiry; optional 2h "last chance" | 0-3 reminders |
| Extension | HR can grant one extension of +48h to +7d; accommodation requests can extend automatically | 5-10% of invites extended |
| Invitation content | role and company, test types and number of tests, realistic duration, deadline (with time zone), device/browser requirements, quiet-space advice, practice link, accommodation-request link, privacy/data-use notice, support contact | — |

- The invitation should state the median completion time rather than the time limit, because HireVue shows overestimation hurts completion.

### Gaps
- No primary source found for typical deadline length, reminder timing, or the effect of SMS/WhatsApp on completion.
- Talent Board and CIPD candidate-experience data were not retrieved.

## A2. Completion rates, drop-off points, time-to-complete, expiry and abandonment reasons

### Takeaway
Among candidates who start, completion is typically 80-95%. The larger loss is between invitation and start: start rates run from about 50% to 97% by industry. Most in-test dropout happens in the first 5-10 minutes. Cutting test length helps only marginally. Accepting another offer is the biggest reason for post-application dropout.

### Cited Findings
- ThriveMap benchmarks from 200,000+ assessment journeys:

| Industry | Start rate | Completion (of starters) | Avg time to complete |
|---|---|---|---|
| Utilities & Energy | 97.4% | 99.3% | 28.5 min |
| Facilities Mgmt & Public Services | 89.4% | 93.1% | 26.6 min |
| Engineering, Rail & Industrial Tech | 82.9% | 96.1% | 21.3 min |
| Telecoms & Tech Services | 79.7% | 88.8% | 28.8 min |
| Transport & Public Transit | 78.7% | 91.8% | 19.2 min |
| Real Estate | 78.1% | 94.8% | 34.9 min |
| Logistics & Supply Chain | 76.3% | 91.1% | 21.4 min |
| Financial Services & Lending | 66.2% | 84.2% | 24.3 min |
| Environmental Services | 63.5% | 76.5% | 31.9 min |
| Veterinary & Animal Care | 50.0% | 65.2% | n/r |

  — [ThriveMap](https://thrivemap.com/pre-hire-assessment-completion-rates-candidate-drop-off-by-industry/)
- ThriveMap by role type:

| Role | Start | Completion |
|---|---|---|
| Technical & Engineering | 86.4% | 96.7% |
| Public Sector Operational | 89.4% | 91.9% |
| Early Careers / Graduate | 78.7% | 90.9% |
| Warehouse & Distribution | 76.9% | 93.3% |
| Sales & Commercial | 67.4% | 83.5% |
| Administrative & Clerical | 72.4% | 72.8% |
| Customer Service | 50.6% | 62.4% |

  — [ThriveMap](https://thrivemap.com/pre-hire-assessment-completion-rates-candidate-drop-off-by-industry/)
- HireVue findings:
  - Most candidates who quit do so in the first few minutes. A 51-minute assessment had almost 92% completion, and shortening it to 39 minutes would raise completion by less than 1%.
  - Cutting a 45-minute test to 30 minutes is expected to gain only 1-2%.
  - Passive candidates drop out early.
  - Higher performers are more likely to complete.

  — [HireVue whitepaper](https://www.hirevue.com/wp-content/uploads/2025/10/2025_10_Applicant-Dropout-Completion-Rates_Whitepaper.pdf)
- In HireVue case studies, about one-third of mobile applicants dropped out when the assessment was not available on their device, and two-thirds switched devices. Mobile matters most for entry-level roles and less for managerial roles. — [HireVue whitepaper](https://www.hirevue.com/wp-content/uploads/2025/10/2025_10_Applicant-Dropout-Completion-Rates_Whitepaper.pdf)
- In a HireVue study of post-application dropout, about two-thirds of applicants who left did so because they accepted another offer. — [HireVue whitepaper](https://www.hirevue.com/wp-content/uploads/2025/10/2025_10_Applicant-Dropout-Completion-Rates_Whitepaper.pdf)
- Criteria Corp says to expect about 80% completion for assessments up to about 40 minutes. The source is older. — [Criteria Corp blog](https://www.criteriacorp.com/blog/how-much-testing-is-ok)
- Other vendor figures:
  - Equalture reports a 90% average pre-screening completion rate, with EY cited at 94%. — [Equalture](https://www.equalture.com/blog/assessment-fatigue-why-candidates-drop-off-and-how-to-fix-it/)
  - Testlify reports that 53% of applicants never open the link between application and assessment start. This is vendor data. — [Testlify](https://testlify.com/candidate-drop-off/)
- A "Gartner: over 70% of candidates drop out of redundant testing loops" figure circulates on a proctoring vendor's blog, but I could not verify it against Gartner. — [MonitorExam](https://monitorexam.com/blog/how-to-reduce-candidate-drop-off-rate-in-assessmentsgartner-data-shows-over-70-of-candidates-drop-out-of-redundant-complex-testing-loops/)

### Inferences
- Suggested mock funnel per 100 invitations (professional/graduate role):

| Stage | Count |
|---|---|
| Opened | 85-90 |
| Started | 70-80 |
| Completed | 62-74 |
| Expired never-started | 15-25 |
| Started but abandoned or expired | 4-8 |
| Withdrawn | 1-3 |

  For customer-service or high-volume roles, lower start rates to 50-65%.
- Abandonment-reason distribution for mock data: accepted other offer (largest share, per HireVue), didn't see the email or it went to spam, time constraints, device incompatibility, connectivity, technical error, test anxiety, lost interest. Only the "other offer" share and the device effect are sourced. The rest is plausible weighting.
- Time from invitation to completion is likely right-skewed: many candidates complete within 24h, with a second spike after reminders and just before the deadline. This is unsourced.

### Gaps
- No source found for median time from invitation to completion, the share of invitations that expire, or reminder uplift.
- No source found for the overall mobile vs desktop completion share in 2025-2026.

## A3. Practice materials, instructions, pause/resume, feedback reports and applicant reactions

### Takeaway
Applicant reactions research shows that perceived face validity and job-relatedness drive fairness perceptions. Fairness in turn relates to organisational attractiveness and recommendation intentions. This supports transparent instructions, practice items and feedback reports. I found no source for typical practice-item counts or pause/resume norms.

### Cited Findings
- Hausknecht, Day and Thomas (2004), Personnel Psychology 57(3), 639-683: face validity and perceived predictive validity were strong predictors of procedural justice, distributive justice, test attitudes and selection attitudes. — [Hausknecht et al. 2004 (outline)](https://web.pdx.edu/~mccunee/quant_621/Outlines/Hausknecht%202004%20Applicant%20Reactions.doc)
- Meta-analytic correlations reported from that study:

| Relationship | r |
|---|---|
| Face validity with reactions | ~.50 |
| Perceived predictive validity with reactions | ~.54 |
| Fairness with organisational attractiveness | .44 |
| Fairness with recommendation intentions | .46 |
| Fairness with test performance | .12 |

  Secondary sources label these differently, so verify against the original. — [Science for Work summary](https://scienceforwork.com/blog/what-candidates-think-selection-procedure/); [later review on SAGE](https://journals.sagepub.com/doi/10.1177/0149206316681846)

### Inferences
- Suggested flow defaults:
  - 3-5 untimed practice items per ability test type, with worked answers.
  - Instructions screen with an example.
  - Pause/resume allowed between tests but not inside a timed section.
  - Personality questionnaires untimed and resumable.
  - An automated candidate feedback report for every completer, which helps perceived fairness.
- A well-known industry pattern, which I did not verify here: practice tests reduce anxiety-related differences.

### Gaps
- No source found for vendor practice-item counts, pause/resume policies, or measured effects of feedback reports on candidate NPS.

## A4. Accessibility accommodations

### Takeaway
The common default adjustment is +25% extra time. Disability guidance warns that 25% may be insufficient, and offers screen readers or text-to-speech, readers, scribes, BSL interpreters, deadline extensions, and untimed or alternative tests. Requests typically go through the employer or recruiter, who liaises with the publisher.

### Cited Findings
- The standard extra-time adjustment employers suggest is 25%, which may not be enough for psychometric tests. Other options are text-to-speech, screen readers, a reader or scribe, a BSL interpreter, and a longer deadline. — [Imperial College guide (search snippet)](https://www.imperial.ac.uk/media/imperial-college/administration-and-support-services/careers-service/public/about/Psychometric-tests---a-guide-for-disabled-and-neurodivergent-applicants.pdf)
- SHL and Talogy say the recruiter may be able to make adjustments, so requests are routed via the employer. This is a single secondary source. — [The Aussie Corporate](https://theaussiecorporate.com/blogs/students-and-grads/psychometric-tests-australia)
- Screen readers and extended time are standard options in high-stakes digital testing. This is an educational testing analogue. — [College Board](https://satsuite.collegeboard.org/sat/accommodations/using-accommodations)

### Inferences
- Mock accommodation catalogue:

| Accommodation | Notes |
|---|---|
| Extra time +25% / +50% / +100% | |
| Untimed version | Note: scores are not comparable to timed norms |
| Screen-reader-compatible mode | WCAG 2.2 AA: text alternatives, keyboard operability, no colour-only cues, sufficient contrast |
| Colour-blind-safe palette | Never rely on hue alone in matrix or diagram items |
| Larger font / zoom | |
| Rest breaks | |
| Deadline extension | |
| Alternative assessment or interview in lieu | |

- Suggested request rate in mock data: about 2-5% of invitations. This is unsourced.

### Gaps
- BPS and ITC accessibility text, and WCAG 2.2 success-criteria specifics, were not fetched.
- No vendor-published accommodation policy was retrieved.

## A5. Test security: retesting, cheating detection, verification, item banks

### Takeaway
The ITC Guidelines on Computer-Based and Internet-Delivered Testing recommend a supervised verification or confirmation test after unproctored testing in moderate- and high-stakes settings. Adaptive confirmation tests using statistical tests (LR, Z-test) are an established method. I found no source for a specific 6- or 12-month retest window.

### Cited Findings
- ITC Guideline 45.3 recommends verification testing for unproctored assessments in moderate- and high-stakes settings. — [UTC presentation citing ITC](https://utc.edu/document/37431)
- Unproctored testing is more open to cheating, which can harm validity. A fixed-length or variable-length adaptive confirmation test can offset this. A simulation found the Z-test more efficient than the likelihood-ratio test. — [Unproctored Internet test verification: adaptive confirmation testing](https://test01.ku.dk/:obvius/pureproxy/3974268/en/publications/unproctored-internet-test-verification-using-adaptive-confirmatio)
- Criteria Corp reports that the share of candidates cheating offsite is very small, and suggests clear retest-policy messaging deters it. This is vendor opinion. — [Criteria Corp blog](https://blog.criteriacorp.com/how-can-i-trust-test-scores-from-remote-tests)
- The Australian Psychological Society publishes online psychological testing guidance. It was not fetched in detail. — [APS](https://psychology.org.au/APS/media/Resource-Finder/Testing/Online-psychological-testing.pdf)

### Inferences
- Mock policy defaults:
  - Retest lockout of 6 months per test family. Mock data could vary this between 6 and 12 months.
  - Randomised item selection from a bank, so each candidate gets a different form.
  - Flags for tab-switching, implausibly fast responses and response-pattern anomalies.
  - A supervised verification test at shortlist stage for ability tests, with large discrepancies flagged.
  - An integrity pledge or honesty contract at the start.

### Gaps
- No primary source found for a retest-interval norm. Check the ITC guideline text and vendor FAQs.

## B1. IPIP (International Personality Item Pool)

### Takeaway
IPIP is in the public domain. Its items, scales and inventories may be used for any purpose, commercial or non-commercial, without asking permission. The licence page states no formal attribution requirement, though citing the IPIP and the source paper is normal scholarly practice.

### Cited Findings
- "Because the IPIP has been placed in the public domain, permission has already been automatically granted for any person to use IPIP items, scales, and inventories for any purpose, commercial or non-commercial." It is not necessary to contact Lew Goldberg or John A. Johnson. Permission requests are answered with a link to the page. — [IPIP Permission page](https://ipip.ori.org/newPermission.htm)
- The permission page states no attribution requirement and no restrictions. — [IPIP Permission page](https://ipip.ori.org/newPermission.htm)

### Inferences
- The permission covers all IPIP-hosted scales, which includes:
  - IPIP-NEO-300 and IPIP-NEO-120 (Johnson 2014)
  - Big Five Aspect Scales (BFAS, DeYoung et al. 2007)
  - 50- and 100-item Big Five factor markers
  - Mini-IPIP (20 items, Donnellan et al. 2006)
  - IPIP-HEXACO scales (IPIP proxies for the HEXACO-PI domains and facets)

  Scale membership comes from my knowledge and should be verified on ipip.ori.org.
- Caveat: IPIP scales built as proxies for proprietary inventories (for example IPIP versions of NEO, 16PF or HPI constructs) are public domain as items. A product should still not market them under the proprietary inventory's names (NEO-PI-R, 16PF, HPI).
- Example public-domain IPIP items, which the licence allows for any use. Verify the wording on ipip.ori.org before shipping:
  - "Am the life of the party." (Extraversion +)
  - "Get stressed out easily." (Neuroticism +)
  - "Am always prepared." (Conscientiousness +)
  - "Sympathize with others' feelings." (Agreeableness +)
  - "Have a vivid imagination." (Intellect/Openness +)
- Recommendation: credit the source anyway ("Items from the International Personality Item Pool, ipip.ori.org"), and use original scale and product names.

### Gaps
- I did not fetch the individual scale pages, so the exact item lists and keying above are from memory.

## B2. ICAR (International Cognitive Ability Resource)

### Takeaway
Despite being described as "public-domain" in the 2014 validation paper, ICAR is now distributed via PsychArchives under a Scientific Use License for academic use only. Commercial websites and routine commercial assessment are not permitted, and no licence can be bought. Do NOT use ICAR items in a commercial recruitment platform or its mock dataset. Create original item types inspired by the general formats instead.

### Cited Findings
- ICAR is distributed via PsychArchives (doi.org/10.23668/psycharchives.22167) under "Scientific Use License 1". It is "intended for academic use exclusively", and access requires an academic user, usually registered by a senior researcher. — [TU Dortmund ICAR page](https://sms.statistik.tu-dortmund.de/en/research/projects/completed-research-projects/international-cognitive-ability-resource-icar/); [PsychArchives item](https://psycharchives.org/en/item/be35b8b4-2bc7-4691-964d-52cfc1cf17a9)
- ICAR may not be used to build a commercial website or for routine commercial testing. A commercial test may be validated with ICAR with an academic partner, but only for the scope of that validation. — [TU Dortmund ICAR page](https://sms.statistik.tu-dortmund.de/en/research/projects/completed-research-projects/international-cognitive-ability-resource-icar/)
- The FAQ says there is no licence model available for purchase, and materials may not be posted on commercial or non-commercial homepages. — [search summary of the ICAR FAQ](https://sms.statistik.tu-dortmund.de/en/research/projects/completed-research-projects/international-cognitive-ability-resource-icar/)
- ICAR has no norms and should not be used to determine an individual's IQ. — [TU Dortmund ICAR page](https://sms.statistik.tu-dortmund.de/en/research/projects/completed-research-projects/international-cognitive-ability-resource-icar/)
- Item types:
  - ICAR60: 3D rotation, letter and number series, matrix reasoning, verbal reasoning, plus a 12-item sample test.
  - Further types: Figural Analogies (with an IMak item generator), Number Series, Perceptual Maze, Propositional Reasoning.
  - Contributed types: Face Detection, Melodic Discrimination, Children's ICAR.

  — [TU Dortmund ICAR page](https://sms.statistik.tu-dortmund.de/en/research/projects/completed-research-projects/international-cognitive-ability-resource-icar/)
- Original paper framing as public domain: Condon and Revelle (2014). — [Condon & Revelle 2014](https://personality-project.org/revelle/publications/condon.icar.14.pdf). This conflicts with the current Scientific Use License; the current repository terms govern.
- icar-project.com now redirects (301) to the TU Dortmund page. — observed redirect, 2026-11

### Inferences
- Generic item formats such as matrices, number series, verbal analogies and mental rotation are not ownable. The specific ICAR items, images and generators are restricted. Write original items.

### Gaps
- The full Scientific Use License text was not read.

## B3. HEXACO-PI-R

### Takeaway
The HEXACO-PI-R forms may be downloaded free only for non-profit academic research. Research data may not be collected through publicly accessible online sites. Any non-academic use, including commercial use, requires contacting the authors (Ashton and Lee).

### Cited Findings
- Forms may be downloaded "only for the purpose of non-profit academic research". Online administration must be password-protected or not searchable. For non-academic purposes, contact the authors via HEXACO.org/contact. — [hexaco.org inventory page](https://hexaco.org/hexaco-inventory)

### Inferences
- Do not use HEXACO-PI-R items or the "HEXACO-PI-R" product name. The six-factor HEXACO model itself is a scientific framework, and IPIP-HEXACO proxy items are public domain under IPIP (see B1). Use a different brand name and say "six-factor model" in marketing.

### Gaps
- No published commercial licence fee or terms were found.

## B4. Other open resources (Open Psychometrics, SJTs)

### Takeaway
Open Psychometrics releases some measures under Creative Commons, decided per measure, and offers anonymised raw data. Its interactive tests are for one-time personal use only, and the site states no blanket commercial-use permission. Check each measure's licence. I found no sourced open SJT item bank, so SJTs should be authored originally.

### Cited Findings
- Some measures are "made available under a creative commons license" (the list is at /development/). Interactive tests are for "one time personal use" only. Anonymised data is downloadable, but no licence is stated on the About page. — [Open Psychometrics About](https://openpsychometrics.org/about/)

### Inferences
- Many Open Psychometrics instruments are themselves IPIP-based, so source those items from IPIP directly to rely on its clear public-domain grant.
- SJTs: write original, job-specific scenarios from job analysis or critical incidents. Do not paraphrase vendor SJTs.

### Gaps
- Per-measure CC licence types (for example BY-NC-SA vs BY) and the data licence were not verified.
- No open-source SJT guidance was retrieved.

## B5. Proprietary vendors: content and names to avoid

### Takeaway
All major vendors' items, scale names, report formats and product names are proprietary and usually trademarked. Do not copy items, and do not mimic scale names or product names in the mock dataset. The table below is a naming-collision blocklist. Most entries come from my knowledge and need verification on the vendors' sites. Only the JvR entries were confirmed by search this session.

### Cited Findings
- JvR Psychometrics (JVR Africa Group) catalogue includes:
  - Talent Basics Report
  - Prospect Screener
  - Psychometrics 360 Assessment
  - Individual Work Performance Review (IWPR)
  - Safety Profile Report
  - Boss Better (JVR Academy)

  It also distributes the Myers-Briggs (MBTI) and Raven's SPM. — [JvR catalogue](https://jvrpsychometrics.co.za/catalogue/talent-basics-report); [JvR catalogue p.2](https://jvrpsychometrics.co.za/catalogue?page=2)
- JvR brings Deeper Signals' Core Drivers to Africa. — [Deeper Signals](https://www.deepersignals.com/blog/deeper-signals-jvr-psychometrics-bring-the-core-drivers-to-africa)
- TTS (Top Talent Solutions) is headquartered in the USA and South Africa (Pretoria) and runs the tts-assess platform. A UCT dissertation on ADEPT-15 in South Africa used TTS data, but the link between ADEPT-15 and TTS is unconfirmed. ADEPT-15 is an Aon product. — [SAGEA](https://sagea.org.za/top-talent-solutions-tts/); [tts-assess](https://impalabafokeng.tts-assess.com/en_ZA/core/about); [UCT dissertation](https://open.uct.ac.za/bitstreams/5e3c79b6-05b4-4b53-ba08-b039e8d5077b/download)

### Inferences
- Naming-collision blocklist. Entries other than JvR are from my knowledge and should be verified on vendor sites:

| Vendor | Notable product / scale names to avoid |
|---|---|
| SHL | OPQ32 (OPQ, OPQ32r), Verify (Verify Interactive, Verify G+), MQ (Motivation Questionnaire), Universal Competency Framework (UCF), "Great Eight", SHL Smart Interview |
| Saville Assessment (WTW) | Wave (Professional Styles, Focus Styles), Swift (Swift Analysis, Swift Comprehension, Swift Executive, Swift Global), Workstyles |
| Hogan Assessments | HPI (Hogan Personality Inventory), HDS (Hogan Development Survey, "dark side"), MVPI (Motives, Values, Preferences Inventory), HBRI, Hogan Judgment, "bright side / dark side / inside" |
| Korn Ferry (incl. Talent Q) | Elements (verbal, numerical, logical), Dimensions, Aspects, KF4D, Korn Ferry Assessment of Leadership Potential (KFALP), Leadership Architect |
| Aon (incl. cut-e) | ADEPT-15, scales (scales numerical, scales verbal, scales eql, scales lst, scales ix and others), Aon's Gamified assessments, vidAssess, smartPredict, chatAssess |
| Criteria Corp | CCAT (Criteria Cognitive Aptitude Test), UCAT (Universal Cognitive Aptitude Test), EPP (Employee Personality Profile), CBST, CEST, Wonscore, Criteria Emotional Intelligence (CEIQ) |
| Cubiks / PSI (now Talogy) | PAPI (PAPI 3), Logiks, Factors, Talogy brand |
| Wonderlic | Wonderlic Personnel Test, WonScore |
| TTS (South Africa) | Verify on tts-talent.com; tts-assess platform name |
| JvR Psychometrics (SA distributor) | Talent Basics, Prospect Screener, IWPR, Safety Profile, Boss Better; distributes 16PF, MBTI, Raven's SPM, Hogan, Core Drivers |
| Other notable trademarks | 16PF, MBTI / Myers-Briggs, NEO-PI-R / NEO-PI-3 / NEO-FFI, DISC (generic, but Everything DiSC is trademarked), Raven's Progressive Matrices, Watson-Glaser, Caliper Profile, Predictive Index |

- Guidance for the mock dataset:
  - Use original brand names, for example "Vettly Work Styles" rather than "Work Styles Wave".
  - Avoid alphanumeric patterns like OPQ32 or ADEPT-15.
  - Avoid the words "Verify", "Swift", "Elements", "Dimensions", "Wave" and "scales" as product names.
  - Use descriptive construct labels such as "Numerical reasoning" and "Conscientiousness", which are generic.

### Gaps
- Vendor product pages were not fetched this session, so product names other than JvR need verification.
- The TTS product catalogue was not found.
- This is not legal advice. A trademark search (for example USPTO, EUIPO, CIPC South Africa) is recommended before naming products.
