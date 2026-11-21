# Data-protection obligations in Zimbabwe and South Africa relevant to access control and tenant isolation in a recruitment SaaS

*Research notes as of November 2026. These are findings with sources, not legal advice. Zimbabwe sources: the official gazetted texts of the Act and SI 155 of 2024 (Veritas copies), extracted and read in full for the sections cited. South Africa sources: POPIA text (popia.co.za mirror) and Information Regulator primary documents where available. Items marked "(not re-fetched)" are well-established statutory text cited to the canonical URL, but that page was not opened in this session. Verify them before relying on them.*

Abbreviations used throughout: **CDPA** = Zimbabwe Cyber and Data Protection Act [Chapter 12:07], No. 5 of 2021. **SI 155** = Cyber and Data Protection (Licensing of Data Controllers and Appointment of Data Protection Officers) Regulations, 2024. **POPIA** = South Africa's Protection of Personal Information Act 4 of 2013. **IR** = Information Regulator (South Africa). **RP** = responsible party (POPIA's controller). **DPO** = data protection officer.

Source URLs:
- CDPA (official gazetted copy): https://www.veritaszim.net/sites/veritas_d/files/Cyber%20%26%20Data%20Protection%20Act%20Cap1207%20No%205%20of%202021%20gaz%202022-03-11.pdf
- SI 155 (official gazetted copy): https://www.veritaszim.net/sites/veritas_d/files/SI%202024-155%20Cyber%20and%20Data%20Protection%20(Licensing%20of%20Data%20Controllers%20and%20Appointment%20of%20Data%20Protection%20Officers)%20Regulations,%202024.pdf

## Zimbabwe: CDPA [Chapter 12:07] and SI 155 of 2024

### Takeaway
The CDPA requires controllers and processors to have "appropriate technical and organisational measures" against unauthorised access. It requires a written contract between controller and processor, makes processors act only on the controller's instructions, and requires notice to the regulator within 24 hours of a breach. SI 155 (gazetted 13 September 2024) adds the following:
- mandatory annual licensing of data controllers in four tiers;
- mandatory DPO appointment;
- prior notice to the regulator of any intended transfer outside Zimbabwe and of any biometric processing;
- notice to data subjects within 72 hours for high-risk breaches, and a breach investigation report within 21 days;
- a breach register.

Almost every breach of these duties is a criminal offence: a fine up to level 11, up to 7 years' imprisonment, or both. POTRAZ began risk-based compliance inspections on 1 September 2026.

### Cited Findings

**Regulator and commencement**
- The CDPA's data protection provisions commenced on 11 March 2022. POTRAZ is the designated Data Protection Authority. — [Veritas copy of Act](https://www.veritaszim.net/sites/veritas_d/files/Cyber%20%26%20Data%20Protection%20Act%20Cap1207%20No%205%20of%202021%20gaz%202022-03-11.pdf); [ICNL/Veritas search summaries](https://africanlii.org/akn/zw/act/2021/5)
- SI 155 was published as a supplement to the Government Gazette dated 13 September 2024. The Minister of ICT made it under CDPA s32. — [SI 155 text](https://www.veritaszim.net/sites/veritas_d/files/SI%202024-155%20Cyber%20and%20Data%20Protection%20(Licensing%20of%20Data%20Controllers%20and%20Appointment%20of%20Data%20Protection%20Officers)%20Regulations,%202024.pdf)

**Security safeguards**
- **CDPA s18(1)–(2).** The controller, its representative, or the processor must take appropriate technical and organisational measures to protect data from negligent or unauthorised destruction, negligent loss, unauthorised alteration or access, and any other unauthorised processing. The required level of security weighs the state of the art and the cost against the nature of the data and the risks to data subjects. — [CDPA](https://www.veritaszim.net/sites/veritas_d/files/Cyber%20%26%20Data%20Protection%20Act%20Cap1207%20No%205%20of%202021%20gaz%202022-03-11.pdf)
- **CDPA s18(3).** The Authority may issue information-security standards. I found no POTRAZ standard issued under s18(3). — [CDPA](https://www.veritaszim.net/sites/veritas_d/files/Cyber%20%26%20Data%20Protection%20Act%20Cap1207%20No%205%20of%202021%20gaz%202022-03-11.pdf)
- **SI 155 s16.** Measures include risk assessments, organisational policies, and physical and technical measures across "all data phases". They must ensure the confidentiality, integrity and availability of systems, and must allow timely restoration of access after an incident. Controllers and processors must test the effectiveness of their measures and improve them. zw-CIRT may give technical advice. A breach of s16 is an offence (level 11 fine, up to 7 years, or both). — [SI 155](https://www.veritaszim.net/sites/veritas_d/files/SI%202024-155%20Cyber%20and%20Data%20Protection%20(Licensing%20of%20Data%20Controllers%20and%20Appointment%20of%20Data%20Protection%20Officers)%20Regulations,%202024.pdf)
- **SI 155 s10(4)(b).** The controller must take all appropriate technical and organisational measures to safeguard security, integrity and confidentiality. — [SI 155](https://www.veritaszim.net/sites/veritas_d/files/SI%202024-155%20Cyber%20and%20Data%20Protection%20(Licensing%20of%20Data%20Controllers%20and%20Appointment%20of%20Data%20Protection%20Officers)%20Regulations,%202024.pdf)

**Processor duties**
- **CDPA s17.** Anyone with access to data who acts under the authority of the controller or processor, and the processor itself, may process data "only as instructed by the controller". — [CDPA](https://www.veritaszim.net/sites/veritas_d/files/Cyber%20%26%20Data%20Protection%20Act%20Cap1207%20No%205%20of%202021%20gaz%202022-03-11.pdf)
- **CDPA s18(4)–(5).** The processor must provide sufficient guarantees about its security measures and ensure strict adherence to them. The controller must have a written contract or other legal instrument requiring the processor to maintain security measures. — [CDPA](https://www.veritaszim.net/sites/veritas_d/files/Cyber%20%26%20Data%20Protection%20Act%20Cap1207%20No%205%20of%202021%20gaz%202022-03-11.pdf)
- **SI 155 s10(4)(a) and (f).** The controller is accountable for its data processor, agents and recipients. It must have a written data processing agreement that ensures the processor maintains all necessary security measures. — [SI 155](https://www.veritaszim.net/sites/veritas_d/files/SI%202024-155%20Cyber%20and%20Data%20Protection%20(Licensing%20of%20Data%20Controllers%20and%20Appointment%20of%20Data%20Protection%20Officers)%20Regulations,%202024.pdf)
- **CDPA s13 and s14.** Duties in s13 (purpose limitation, minimisation, accuracy, and retention no longer than necessary) are expressed to bind "every data controller or data processor". Data subjects have rights of access to their data "in custody of data controller or data processor", and rights to object, to correction, and to deletion of false or misleading data. — [CDPA](https://www.veritaszim.net/sites/veritas_d/files/Cyber%20%26%20Data%20Protection%20Act%20Cap1207%20No%205%20of%202021%20gaz%202022-03-11.pdf)

**Breach notification**
- **CDPA s19.** The controller must notify the Authority within 24 hours of any security breach affecting data it processes. — [CDPA](https://www.veritaszim.net/sites/veritas_d/files/Cyber%20%26%20Data%20Protection%20Act%20Cap1207%20No%205%20of%202021%20gaz%202022-03-11.pdf)
- **SI 155 s17.** The details are as follows:
  - The 24-hour report runs from awareness of a breach "affecting the data being processed by the concerned data controller or data processor".
  - The report is made on Form DP3. DP3 asks for the breach date, the identification date, the systems breached, the categories and approximate number of records, the likely impact, and the remediation measures.
  - Data subjects must be informed within 72 hours where the breach is likely to be high-risk.
  - The controller must have "robust breach detection, investigation, and internal reporting procedures" and must keep a record of all breaches.
  - The controller must answer the Authority's information requests within 14 days and submit an investigation report within 21 days of notification.
  - Breach of s17 is an offence (level 11, up to 7 years).
  
  — [SI 155](https://www.veritaszim.net/sites/veritas_d/files/SI%202024-155%20Cyber%20and%20Data%20Protection%20(Licensing%20of%20Data%20Controllers%20and%20Appointment%20of%20Data%20Protection%20Officers)%20Regulations,%202024.pdf)
- Neither the CDPA nor SI 155 sets an explicit processor-to-controller notification deadline. — absence observed in the full texts of the [CDPA](https://www.veritaszim.net/sites/veritas_d/files/Cyber%20%26%20Data%20Protection%20Act%20Cap1207%20No%205%20of%202021%20gaz%202022-03-11.pdf) and [SI 155](https://www.veritaszim.net/sites/veritas_d/files/SI%202024-155%20Cyber%20and%20Data%20Protection%20(Licensing%20of%20Data%20Controllers%20and%20Appointment%20of%20Data%20Protection%20Officers)%20Regulations,%202024.pdf)

**Licensing**
- **Who must be licensed (SI 155 s3–s4).** A person must hold a licence if it processes personal information with the intention to:
  - decide the means, purpose or outcome of the processing;
  - decide what data to collect or from whom; or
  - "obtain a commercial gain or other benefit from the processing of personal data".

  Anyone who determines purposes and means, alone or jointly, must apply on Form DP1. POTRAZ decides within 14 days and may attach conditions. Controllers already operating had 6 months to apply. Processing without a licence is an offence (level 11, up to 7 years). — [SI 155](https://www.veritaszim.net/sites/veritas_d/files/SI%202024-155%20Cyber%20and%20Data%20Protection%20(Licensing%20of%20Data%20Controllers%20and%20Appointment%20of%20Data%20Protection%20Officers)%20Regulations,%202024.pdf)
- **Validity, tiers and fees (SI 155 s5–s6 and Second Schedule).** A licence lasts 12 months. Renewal must be applied for at least 3 months before expiry, and failing to renew is an offence. Fees can be paid in USD or in ZiG.

  | Tier | Data subjects | Initial/renewal fee |
  |---|---|---|
  | 1 | 50–1,000 | USD 50 |
  | 2 | 1,001–100,000 | USD 300 |
  | 3 | 100,001–500,000 | USD 500 |
  | 4 | More than 500,000 | USD 2,500 |

  Tiers 2–4 also pay a USD 30 application fee. — [SI 155](https://www.veritaszim.net/sites/veritas_d/files/SI%202024-155%20Cyber%20and%20Data%20Protection%20(Licensing%20of%20Data%20Controllers%20and%20Appointment%20of%20Data%20Protection%20Officers)%20Regulations,%202024.pdf)
- **Form DP1 contents.** The application asks for sensitive data types and purposes (the list includes health/biometric data and "criminal, educational, financial or employment history"). It also asks whether data is located in Zimbabwe and, if not, which country, plus a narrative of the security safeguards. — [SI 155](https://www.veritaszim.net/sites/veritas_d/files/SI%202024-155%20Cyber%20and%20Data%20Protection%20(Licensing%20of%20Data%20Controllers%20and%20Appointment%20of%20Data%20Protection%20Officers)%20Regulations,%202024.pdf)
- **Public register (SI 155 s9).** POTRAZ keeps a register of licensed controllers, open to inspection on its website. — [SI 155](https://www.veritaszim.net/sites/veritas_d/files/SI%202024-155%20Cyber%20and%20Data%20Protection%20(Licensing%20of%20Data%20Controllers%20and%20Appointment%20of%20Data%20Protection%20Officers)%20Regulations,%202024.pdf)
- **Deadline.** Secondary sources give the licensing deadline as 12 March 2025, which is 6 months from gazetting. One source gives 31 March 2025. — [Post on Sunday, Aug 2026](https://postonsunday.co.zw/2026/08/17/potraz-sets-september-deadline-for-data-protection-compliance/); [Afriwise](https://www.afriwise.com/blog/a-quick-start-guide-to-zimbabwes-data-protection-regulations)

**DPO appointment**
- **SI 155 s12–s14.** Every controller must appoint a DPO and notify POTRAZ on Form DP2. Existing controllers had 90 days from promulgation, which secondary sources put at about 12 December 2024. Changes to the DPO's details, and the DPO's dismissal or resignation, must be notified within 14 days. Failing to appoint a DPO is an offence (level 7, up to 2 years).
  - Qualifications: skills in data science, analytics, information security, IS audit, law or audit, plus knowledge of data protection law and of the controller's business. The DPO must complete a POTRAZ-approved certification course (USD 1,250 for citizens, USD 1,450 for international candidates). The controller must fund continuing professional development.
  - Functions: compliance monitoring and internal audits, handling requests from the Authority and data subjects, advising on and monitoring DPIAs, and acting as the contact point for data subjects.
  
  — [SI 155](https://www.veritaszim.net/sites/veritas_d/files/SI%202024-155%20Cyber%20and%20Data%20Protection%20(Licensing%20of%20Data%20Controllers%20and%20Appointment%20of%20Data%20Protection%20Officers)%20Regulations,%202024.pdf); [Zimpricecheck (deadline date)](https://zimpricecheck.com/analysis-and-opinion/data-protection-officer-zimbabwe-guide/)

**Notification of processing to the Authority**
- **CDPA s20–s21.** The controller must notify the Authority before any wholly or partly automated processing operation. The notice must include:
  - the purposes;
  - the data categories and a detailed description of sensitive data;
  - the safeguards on disclosure to third parties;
  - how the right of access is facilitated;
  - the retention period;
  - a preliminary assessment of the adequacy of the security measures;
  - any use of a data processor;
  - planned transfers to third parties.

  The Authority may inspect security measures before processing starts where it sees specific risks, and may inspect during working hours on reasonable notice (s21(3)–(4)). — [CDPA](https://www.veritaszim.net/sites/veritas_d/files/Cyber%20%26%20Data%20Protection%20Act%20Cap1207%20No%205%20of%202021%20gaz%202022-03-11.pdf)
- **SI 155 s10(2).** The controller must notify the Authority of:
  - all processing activities;
  - any modification of personal information collected indirectly from data subjects;
  - "any intention to transfer or share information of data subject outside Zimbabwe";
  - any processing involving biometric or genetic data.
  
  — [SI 155](https://www.veritaszim.net/sites/veritas_d/files/SI%202024-155%20Cyber%20and%20Data%20Protection%20(Licensing%20of%20Data%20Controllers%20and%20Appointment%20of%20Data%20Protection%20Officers)%20Regulations,%202024.pdf)
- **CDPA s24 (accountability).** The controller must have internal mechanisms to demonstrate compliance to data subjects and to the Authority. — [CDPA](https://www.veritaszim.net/sites/veritas_d/files/Cyber%20%26%20Data%20Protection%20Act%20Cap1207%20No%205%20of%202021%20gaz%202022-03-11.pdf)

**Cross-border transfer**
- **CDPA s28.** A controller may not transfer personal information to a third party in a foreign country unless two conditions are met. The recipient country or organisation must ensure an adequate level of protection, and the transfer must be solely to allow tasks within the controller's competence.
  - Adequacy is judged on all the circumstances: the nature of the data, the purpose and duration of processing, the recipient, the data protection laws in force, and the professional rules and security measures followed.
  - The Authority may specify categories of transfer that are not authorised.
  - The Cyber Security Centre Minister may give directions.
  
  — [CDPA](https://www.veritaszim.net/sites/veritas_d/files/Cyber%20%26%20Data%20Protection%20Act%20Cap1207%20No%205%20of%202021%20gaz%202022-03-11.pdf)
- **CDPA s29.** Transfers to a country without adequate protection are allowed only in listed cases:
  - unambiguous consent;
  - necessity for a contract with the data subject, or for pre-contractual steps;
  - necessity for a contract with a third party in the data subject's interest;
  - important public interest or legal claims;
  - vital interests;
  - transfers from a public register.

  There is no express standard-contractual-clause or binding-corporate-rules route. — [CDPA](https://www.veritaszim.net/sites/veritas_d/files/Cyber%20%26%20Data%20Protection%20Act%20Cap1207%20No%205%20of%202021%20gaz%202022-03-11.pdf)
- **Penalty.** Contravening s28 is expressly an offence under s33(2) (level 11, up to 7 years, or both). — [CDPA](https://www.veritaszim.net/sites/veritas_d/files/Cyber%20%26%20Data%20Protection%20Act%20Cap1207%20No%205%20of%202021%20gaz%202022-03-11.pdf)
- **Prior notification.** A commentator advises notifying POTRAZ before any transfer abroad. SI 155 s10(2)(c) now states this expressly. — [Michalsons](https://www.michalsons.com/blog/zimbabwes-cyber-and-data-protection-act-overview/78795); [SI 155](https://www.veritaszim.net/sites/veritas_d/files/SI%202024-155%20Cyber%20and%20Data%20Protection%20(Licensing%20of%20Data%20Controllers%20and%20Appointment%20of%20Data%20Protection%20Officers)%20Regulations,%202024.pdf)

**Sensitive data**
- **Definition.** "Sensitive data" is defined unusually broadly. It includes the usual special categories plus:
  - membership of a professional or trade association;
  - "criminal educational, financial or employment history";
  - "gender, age, marital status or family status";
  - health and genetic information.

  — [CDPA definitions](https://www.veritaszim.net/sites/veritas_d/files/Cyber%20%26%20Data%20Protection%20Act%20Cap1207%20No%205%20of%202021%20gaz%202022-03-11.pdf)
- **CDPA s11.** Processing sensitive data requires written consent, which can be withdrawn at any time free of charge, subject to exceptions in s11(5). Contravening s11 is an offence under s33(2). — [CDPA](https://www.veritaszim.net/sites/veritas_d/files/Cyber%20%26%20Data%20Protection%20Act%20Cap1207%20No%205%20of%202021%20gaz%202022-03-11.pdf)
- **CDPA s12.** Processing genetic, biometric and health data is prohibited without written consent. Exceptions include processing necessary for "the specific obligations and rights of the controller in the field of employment law" and for legal claims. Health data must otherwise be processed under the responsibility of a health professional. — [CDPA](https://www.veritaszim.net/sites/veritas_d/files/Cyber%20%26%20Data%20Protection%20Act%20Cap1207%20No%205%20of%202021%20gaz%202022-03-11.pdf)
- **Biometrics under SI 155.** SI 155 defines biometric data to include fingerprints, palm veins and face recognition, and biometric processing must be notified to POTRAZ (s10(2)(d)). — [SI 155](https://www.veritaszim.net/sites/veritas_d/files/SI%202024-155%20Cyber%20and%20Data%20Protection%20(Licensing%20of%20Data%20Controllers%20and%20Appointment%20of%20Data%20Protection%20Officers)%20Regulations,%202024.pdf)

**Automated decision-making**
- **CDPA s25.** A data subject has the right not to be subject to a decision based solely on automated processing, including profiling, that produces legal effects or "similarly significantly affects" them. The exceptions are consent or a provision of law. There is no contract-necessity exception. — [CDPA](https://www.veritaszim.net/sites/veritas_d/files/Cyber%20%26%20Data%20Protection%20Act%20Cap1207%20No%205%20of%202021%20gaz%202022-03-11.pdf)
- **SI 155 s10(3) and s10(5)(f).** SI 155 restates the s25 rule as a controller duty, so breaching it is an offence under s10(6). It also bans automated decisions about children that affect their rights. — [SI 155](https://www.veritaszim.net/sites/veritas_d/files/SI%202024-155%20Cyber%20and%20Data%20Protection%20(Licensing%20of%20Data%20Controllers%20and%20Appointment%20of%20Data%20Protection%20Officers)%20Regulations,%202024.pdf)

**Penalties and enforcement**
- **CDPA s33.** For a controller or its agent, contravening s11, s13, s18(4), s24 or s28 is an offence (level 11 fine, up to 7 years, or both). SI 155 attaches the same penalty to its own ss3–7, 10, 11, 16 and 17. — [CDPA](https://www.veritaszim.net/sites/veritas_d/files/Cyber%20%26%20Data%20Protection%20Act%20Cap1207%20No%205%20of%202021%20gaz%202022-03-11.pdf); [SI 155](https://www.veritaszim.net/sites/veritas_d/files/SI%202024-155%20Cyber%20and%20Data%20Protection%20(Licensing%20of%20Data%20Controllers%20and%20Appointment%20of%20Data%20Protection%20Officers)%20Regulations,%202024.pdf)
- **USD value of level 11.** One source puts a level 11 fine at about USD 1,000. That figure is unverified: the standard scale of fines is set by statutory instrument and changes with currency reforms. — [M&J Consultants, via search summary](https://mjconsultants.co.zw/insights/zimbabwe-data-protection-deadline-what-businesses-must-do/)
- **Civil sanctions.** One source reports that POTRAZ is working on civil sanctions. I found no enacted civil-penalty regime. — [search summary of Zimbabwean sources](https://technomag.co.zw/potraz-unveils-2025-26-planned-enforcement-actions-for-data-controllers/)
- **Inspections (2026).** Under Regulatory Notice 2 of 2026, POTRAZ conducts mandatory compliance inspections from 1 September 2026. The inspections are physical and documentary, take a risk-based approach, and target financial, insurance, local authority, health and mining first. Education, NGOs, government and others are also in scope. — [Post on Sunday, 17 Aug 2026](https://postonsunday.co.zw/2026/08/17/potraz-sets-september-deadline-for-data-protection-compliance/)
- **Conflicting dates.** Another outlet reported in July 2026 that inspections had already "commenced". — [Positive Eye News, 29 Jul 2026](https://positiveeyenews.co.zw/2026/07/29/potraz-commences-compliance-inspections-under-cyber-and-data-protection-act/)

### Inferences
- **Licensing for a SaaS provider is uncertain.** The licensing trigger in SI 155 s3(2)(d), "commercial gain or other benefit from the processing", is wide enough that a recruitment SaaS acting as processor could arguably need its own controller licence. The SaaS would in any case be a controller for its own account and billing data. Employer customers would each need their own licence.
- **Contract terms.** Each employer must have a written DPA with the SaaS (CDPA s18(5); SI 155 s10(4)(f)). Because the controller must report within 24 hours, the DPA should require processor-to-controller notice well inside that window, in practice a few hours.
- **Effect of the broad sensitive-data definition.** Ordinary CV fields such as age, gender, marital status, education and employment history appear to fall within "sensitive data" requiring written consent under s11. That raises the stakes for access control over the whole candidate record, not just health or biometric fields. Field-level restriction and purpose-scoped access are defensible responses.
- **Data residency.** Hosting outside Zimbabwe (for example in South Africa, the EU or the US) requires two things: an adequacy assessment by the controller under s28(2), recorded in writing, and a prior notice to POTRAZ under SI 155 s10(2)(c). Form DP1 asks where data is located, so tenant data-location metadata and per-region hosting options help customers answer it.
- **Breach records and logging.** SI 155 s17(4) and Form DP3 require "robust breach detection" and a breach register recording systems affected and approximate record counts. Answering those questions needs per-tenant audit logs that can show which tenant's records an actor reached.
- **AI suggestions.** Under s25, an AI shortlist or rejection with no meaningful human review is likely a "solely automated" decision with significant effect, and only consent or law can justify it. A role-based human-review step before any adverse outcome is the main mitigation.

### Gaps
- No POTRAZ information-security standard under CDPA s18(3), cross-border adequacy list, transfer regulations, or s28(3) non-authorised categories were found.
- No guidance was found on whether pure processors (as opposed to controllers) need a licence. Secondary commentary does not address SaaS processors specifically.
- No published POTRAZ enforcement decisions or fines under the CDPA were found as of November 2026.
- The USD value of a level 11 fine was not verified against the current standard-scale instrument.
- The status of the 2026 inspection notice was not confirmed on POTRAZ's own website (sources are Zimbabwean news outlets).
- No law-firm briefings were found from Dube Manikai & Hwacha or Scanlen & Holderness. The Zimbabwe commentary located is mainly from Afriwise, Michalsons and local consultancies.

## South Africa: POPIA security, operators, breach notification, transfers, special personal information and enforcement

### Takeaway
POPIA s19 requires risk-based "appropriate, reasonable technical and organisational measures" against loss and unlawful access. These measures must be regularly verified and updated, with regard to generally accepted security practice. A SaaS vendor acting for employers is an "operator". It must act only with the RP's knowledge or authorisation, treat data as confidential (s20), be bound by a written contract imposing s19 measures, and notify the RP "immediately" of suspected unauthorised access (s21). The RP must notify the IR and data subjects as soon as reasonably possible (s22). Since 1 April 2025 that notice must go through the IR's eServices portal, and the IR's position is that there is no risk threshold.

Enforcement is active and escalating:
- R5m fines against the Department of Justice and the Department of Basic Education;
- a fine against Lancet Laboratories for failing to report breaches under s22;
- a 2026 enforcement notice against SABS for weak safeguards after a ransomware attack;
- about 2,374 breach notices in 2024/25, rising roughly 40% in 2025/26.

### Cited Findings

**Section 19: security safeguards**
- An RP must secure the integrity and confidentiality of personal information in its possession or under its control. It does this with appropriate, reasonable technical and organisational measures to prevent loss, damage, unauthorised destruction, and unlawful access or processing (s19(1)). — [POPIA s19](https://popia.co.za/section-19-security-measures-on-integrity-and-confidentiality-of-personal-information/)
- Under s19(2) the RP must take reasonable measures to:
  - identify reasonably foreseeable internal and external risks;
  - establish and maintain appropriate safeguards against them;
  - regularly verify that the safeguards are effectively implemented;
  - update the safeguards in response to new risks or deficiencies.
  
  — [POPIA s19](https://popia.co.za/section-19-security-measures-on-integrity-and-confidentiality-of-personal-information/)
- Under s19(3) the RP must have due regard to generally accepted information security practices and procedures, including those required by specific industry or professional rules. — [POPIA s19](https://popia.co.za/section-19-security-measures-on-integrity-and-confidentiality-of-personal-information/)

**Sections 20–21: operators**
- Under s21(1), the RP must, by written contract, ensure that the operator establishes and maintains the s19 security measures. — [POPIA s21](https://popia.co.za/section-21-security-measures-regarding-information-processed-by-operator/)
- Under s21(2), the operator must notify the RP immediately where there are reasonable grounds to believe a data subject's personal information has been accessed or acquired by an unauthorised person. — [POPIA s21](https://popia.co.za/section-21-security-measures-regarding-information-processed-by-operator/)
- Under s20, an operator, or anyone processing for an RP or operator, must process only with the RP's knowledge or authorisation. It must treat the information as confidential and not disclose it unless required by law or in the course of proper performance of its duties. (Not re-fetched.) — [POPIA s20](https://popia.co.za/section-20-information-processed-by-operator-or-person-acting-under-authority/)

**Section 22: security compromise notification**
- Where there are reasonable grounds to believe personal information has been accessed or acquired by an unauthorised person, the RP must notify the IR and the data subject. The data subject need not be notified if their identity cannot be established. — [POPIA s22](https://popia.co.za/section-22-notification-of-security-compromises/)
- Timing is "as soon as reasonably possible" after discovery, allowing for law-enforcement needs and for measures reasonably necessary to determine the scope of the compromise and restore system integrity. Notice to data subjects may be delayed only if a public body responsible for investigating offences, or the IR, determines that it would impede a criminal investigation. — [POPIA s22](https://popia.co.za/section-22-notification-of-security-compromises/)
- Notice to data subjects must be in writing, by mail, email, prominent website notice, news media, or as the IR directs. It must describe:
  - the possible consequences;
  - the measures taken or intended;
  - recommended mitigation steps;
  - the identity of the unauthorised person, if known.
  
  The IR may direct publicity. — [POPIA s22](https://popia.co.za/section-22-notification-of-security-compromises/)
- **eServices portal.** From 1 April 2025, s22 notifications to the IR must be made on the IR's eServices portal; emailed forms are no longer accepted. — [Inside Privacy (Covington)](https://www.insideprivacy.com/data-security/data-breaches/south-africa-introduces-mandatory-e-portal-reporting-for-data-breaches/); [IR media briefing, 13 Nov 2025](https://inforegulator.org.za/wp-content/uploads/2025/11/MEDIA-STATEMENT_INFORMATION-REGULATORS-LATEST-UPDATE-Journalist-ver.pdf)
- **No reporting threshold.** A secondary source reports that an IR fact sheet of 19 August 2025 states POPIA has no reporting threshold, so notification is mandatory regardless of assessed risk. I did not see the fact sheet itself. — [search summary of POPIA guides](https://mjkinc.co.za/popia/data-breaches)

**Section 72: transborder flows**
- An RP may transfer personal information to a third party in a foreign country only if one of the following applies:
  - (a) the recipient is subject to a law, binding corporate rules or a binding agreement that provides adequate protection. The protection must uphold principles substantially similar to POPIA's conditions and include similar onward-transfer rules.
  - (b) the data subject consents;
  - (c) the transfer is necessary for a contract with the data subject, or for pre-contractual steps;
  - (d) the transfer is necessary for a contract in the data subject's interest;
  - (e) the transfer benefits the data subject and consent is impracticable.
  
  — [POPIA s72](https://popia.co.za/section-72-transfers-of-personal-information-outside-republic/)
- Under s72(2), "binding corporate rules" means intra-group processing policies for transfers within a "group of undertakings". — [POPIA s72](https://popia.co.za/section-72-transfers-of-personal-information-outside-republic/)

**Special personal information and prior authorisation**
- **Prior authorisation (s57–58).** Prior authorisation from the IR is required before certain processing, including transfers of special personal information or children's personal information to a foreign third party without adequate protection under s72 (s57(1)(d)). Processing may not begin until the IR has authorised it (s58(2)). The IR's revised guidance note on prior authorisation is dated around January 2024, and a revised application form was published in January 2025.
  - The CDH commentary on the 2021 note confirms the foreign-transfer limb for children's information.
  - The 4-week decision period comes from the Webber Wentzel summary.
  
  — [IR Prior Authorisation page](https://inforegulator.org.za/prior-authorisation/); [Revised Guidance Note PDF](https://inforegulator.org.za/wp-content/uploads/2020/07/Revised-Guidance-Note-on-applications-for-Prior-Authorisation-adopted-by-Members-30-Jan14.pdf); [Cliffe Dekker Hofmeyr, Mar 2021](https://www.cliffedekkerhofmeyr.com/en/news/publications/2021/TMT/Technology-Media-Telecommunications-Alert-19-March-2021-POPIA-UPDATE-Addressing-POPIA-Prior-Authorisation-the-Information-Regulator-issues-a-Guidance-Note-for-Applications-for-Prior-Authorisation-.html); [Webber Wentzel](https://webberwentzel.com/News/Pages/information-regulator-publishes-guidance-note-on-applications-for-prior-authorisation.aspx)
- **Definition (s26).** Special personal information covers religious or philosophical beliefs, race or ethnic origin, trade union membership, political persuasion, health or sex life, biometric information, and criminal behaviour. Processing is prohibited unless a s27 general authorisation or a s28–33 specific authorisation applies. Section 27 includes consent and "establishment, exercise or defence of a right or obligation in law". (Not re-fetched.) — [POPIA s26](https://popia.co.za/section-26-prohibition-on-processing-of-special-personal-information/)
- **Prior authorisation page wording.** The IR's POPIA page frames the question as "Who makes an application to process Special Personal Information?" and points to its guidance on applications. — [IR POPIA page](https://inforegulator.org.za/popia/)

**Section 71: automated decision-making**
- A data subject may not be subject to a decision with legal consequences, or that affects them to a substantial degree, if it is based solely on automated processing intended to profile them. Examples given include "performance at work", reliability and conduct. — [POPIA s71](https://popia.co.za/section-71-automated-decision-making/)
- There are two exceptions:
  - the decision is taken in connection with concluding or executing a contract, and either the data subject's request was met or appropriate measures protect their legitimate interests; or
  - a law or code of conduct specifies appropriate measures.

  The appropriate measures must give the data subject an opportunity to make representations, and the RP must provide sufficient information about the underlying logic (s71(3)). — [POPIA s71](https://popia.co.za/section-71-automated-decision-making/)

**Amended regulations (2025)**
- The amended POPIA Regulations commenced on 17 April 2025. The IR describes them as imposing "stricter measures" on RPs to comply with POPIA. The detailed changes it highlights concern objection mechanisms and direct marketing, including recording telephone marketing calls. — [IR media briefing, 13 Nov 2025](https://inforegulator.org.za/wp-content/uploads/2025/11/MEDIA-STATEMENT_INFORMATION-REGULATORS-LATEST-UPDATE-Journalist-ver.pdf)

**Enforcement actions relevant to security and access control**
- **Department of Justice and Constitutional Development.** A ransomware attack on 6 September 2021 encrypted the department's systems. The IR found breaches of s19(1)–(3), including expired security licences and an outdated incident response plan. An enforcement notice followed in May 2023 and a R5m infringement notice on 3 July 2023 for non-compliance. The department sought High Court review in September 2023, and the fine remains disputed as of 2026. — [Norton Rose Fulbright](https://nortonrosefulbright.com/en/news/287987e5/information-regulator-issues-first-fine-to-the-department-of-justice-after-ransomware-attack); [Webber Wentzel](https://www.webberwentzel.com/News/Pages/information-regulator-takes-action-against-department-of-justice-and-constitutional-development.aspx); [Werksmans, 31 Aug 2026](https://werksmans.com/the-regulator-is-watching-new-enforcement-signals-for-popia-and-paia-compliance/)
- **Lancet Laboratories.** The IR assessed Lancet because of repeated security compromises. Lancet had not notified the IR or affected data subjects under s22. It received an enforcement notice and then a R100,000 infringement notice, which has been paid. — [IR media briefing, 13 Nov 2025](https://inforegulator.org.za/wp-content/uploads/2025/11/MEDIA-STATEMENT_INFORMATION-REGULATORS-LATEST-UPDATE-Journalist-ver.pdf)
- **Blouberg Municipality.** A former employee's personal information was exposed on the internet. The municipality was fined R500,000 for not complying with the enforcement notice, and the IR is suing to recover the fine. Werksmans reports a court reduced it to R250,000. — [IR media briefing, 13 Nov 2025](https://inforegulator.org.za/wp-content/uploads/2025/11/MEDIA-STATEMENT_INFORMATION-REGULATORS-LATEST-UPDATE-Journalist-ver.pdf); [Werksmans, 2026](https://werksmans.com/the-regulator-is-watching-new-enforcement-signals-for-popia-and-paia-compliance/)
- **Department of Basic Education.** An enforcement notice issued on 18 November 2024 concerned publishing matric results with exam numbers. A R5m infringement notice followed for non-compliance, and the matter is in litigation. — [IR media briefing, 13 Nov 2025](https://inforegulator.org.za/wp-content/uploads/2025/11/MEDIA-STATEMENT_INFORMATION-REGULATORS-LATEST-UPDATE-Journalist-ver.pdf)
- **SABS (2026).** After a 2024 ransomware attack, an own-initiative assessment found:
  - insufficient security safeguards;
  - failure to address known vulnerabilities;
  - no incident response plans;
  - excessive processing;
  - inadequate consent;
  - failure to inform data subjects of how their information was collected.

  SABS was ordered to revise its policies, conduct impact and risk assessments, and implement security measures within 90 days. The IR stressed that it acted because of the compliance failings, not because SABS was a victim of the attack. Reported at the 31 August 2026 briefing. — [Werksmans, 2026](https://werksmans.com/the-regulator-is-watching-new-enforcement-signals-for-popia-and-paia-compliance/); [Polity, 1 Sep 2026](https://www.polity.org.za/article/the-regulator-is-watching-new-enforcement-signals-for-popia-and-paia-compliance-2026-09-01)
- **Other fines.** Werksmans also lists a R100,000 fine against the IEC, which has been paid. — [Werksmans, 2026](https://werksmans.com/the-regulator-is-watching-new-enforcement-signals-for-popia-and-paia-compliance/)

**Breach statistics**
- 2024/25: 2,374 security compromise notices, about 198 per month.
- April to November 2025: 1,947 notices, about 284 per month, a 40% increase.
- Since enforcement began: more than 8,000 notices.
- From 1 April 2026: more than 1,220 notices, with about 3,000 projected for 2026/27.
- Common causes cited: weak passwords, inadequate controls, employee negligence, and malware or ransomware.

— [IR media briefing, 13 Nov 2025](https://inforegulator.org.za/wp-content/uploads/2025/11/MEDIA-STATEMENT_INFORMATION-REGULATORS-LATEST-UPDATE-Journalist-ver.pdf); [Werksmans, 2026](https://werksmans.com/the-regulator-is-watching-new-enforcement-signals-for-popia-and-paia-compliance/)

**Penalties and enforcement mechanics**
- The IR can impose administrative fines of up to R10m. — [Webber Wentzel](https://www.webberwentzel.com/News/Pages/information-regulator-takes-action-against-department-of-justice-and-constitutional-development.aspx)
- Criminal penalties under s107 reach up to 10 years' imprisonment and/or a fine for the most serious offences, such as obstruction and failure to comply with an enforcement notice; lesser offences carry up to 12 months. (Not re-fetched.) — [POPIA s107](https://popia.co.za/section-107-penal-sanctions/)
- Under the current mechanism, an RP that complies within an enforcement notice's grace period cannot be fined. The IR intends to propose GDPR-style immediate fines to Parliament, but no submission date has been given. — [Werksmans, 2026](https://werksmans.com/the-regulator-is-watching-new-enforcement-signals-for-popia-and-paia-compliance/)
- Werksmans also reports that the IR now proactively writes to RPs to demand that they demonstrate compliance. — [Werksmans, 2026](https://werksmans.com/the-regulator-is-watching-new-enforcement-signals-for-popia-and-paia-compliance/)

### Inferences
- **Controller and operator roles.** For employer tenants, the SaaS is an operator and each employer is the RP. Sections 20–21 make tenant isolation a contractual and statutory requirement: data must be processed only on the authority of the RP that owns it. Data crossing between tenants would be processing without the RP's authorisation, and probably a s22 "unauthorised access" event that must be notified.
- **Breach detection.** The IR's position that there is no reporting threshold, together with the s21(2) "immediately" duty, means the operator needs detection that can identify any unauthorised access. That includes a wrong-tenant read by an authenticated user, not only external attacks. Audit logs of who read which tenant's records support both detection and the content of the notice.
- **Security programme.** The enforcement record (incident response plans, unpatched vulnerabilities, expired licences, weak passwords) points to what the IR examines under s19:
  - a documented risk assessment;
  - MFA and strong authentication;
  - patching;
  - a tested incident response plan;
  - periodic verification of controls (s19(2)(c)).
- **Hosting outside South Africa.** Hosting outside South Africa needs a s72(1)(a) basis, typically an operator agreement or intra-group binding agreement with POPIA-equivalent terms. If special personal information (such as health, disability, biometric or criminal-record checks) goes to a country without adequate protection, s57(1)(d) prior authorisation may be triggered.
- **AI in recruitment.** Section 71 expressly lists "performance at work", reliability and conduct as profile factors. An AI ranking or rejection of candidates with no human decision-maker falls within it unless a s71(2) exception applies, and even then the candidate must be able to make representations and receive the underlying logic. Role-based human review of AI suggestions before any decision, with recorded reviewer identity and rationale, is the natural control.
- **Retention and access requests.** POPIA's general retention rule in s14 and access rights in s23 require per-tenant deletion and export. I did not fetch the text of these sections this session.

### Gaps
- No IR guidance note specific to information security, access control or cloud/SaaS operators was found. The IR has issued guidance on information officers, prior authorisation and special personal information, but the search did not surface a security-specific note.
- The 19 August 2025 IR fact sheet on no reporting threshold was not opened; it is cited via a secondary source.
- The full SABS enforcement notice and its date of issue were not found on the IR site.
- The exact amendments in the 2025 POPIA Regulations beyond direct marketing and objections were not confirmed.
- No IR guidance or enforcement action specifically on s71, AI, or recruitment profiling was found.
- I could not open the text of POPIA ss14, 23–25, 26–27, 57, 107 and 109 in this session.

## Translating the obligations into SaaS controls (RBAC, tenant isolation, audit, breach, residency, retention, access requests, AI review)

### Takeaway
Neither statute names "RBAC" or "multi-tenancy". Both require risk-appropriate measures against unauthorised access, processing only on the controller's instructions, written processor contracts, demonstrable compliance, and fast breach notification (Zimbabwe 24 hours to the regulator; South Africa "as soon as reasonably possible", with operators notifying "immediately"). Several SaaS controls follow directly from these duties: least-privilege roles, strict per-employer data separation, immutable audit logs, region-aware hosting with transfer records, configurable retention and deletion, access-request export, and human review of AI recommendations.

### Cited Findings

| Control area | Zimbabwe basis | South Africa basis |
|---|---|---|
| Least privilege and access control | Act s18(1): protect against "unauthorised… access"; SI 155 s16(3): confidentiality, integrity, availability ([CDPA](https://www.veritaszim.net/sites/veritas_d/files/Cyber%20%26%20Data%20Protection%20Act%20Cap1207%20No%205%20of%202021%20gaz%202022-03-11.pdf); [SI 155](https://www.veritaszim.net/sites/veritas_d/files/SI%202024-155%20Cyber%20and%20Data%20Protection%20(Licensing%20of%20Data%20Controllers%20and%20Appointment%20of%20Data%20Protection%20Officers)%20Regulations,%202024.pdf)) | s19(1): prevent "unlawful access" ([POPIA s19](https://popia.co.za/section-19-security-measures-on-integrity-and-confidentiality-of-personal-information/)) |
| Tenant separation (processing only as instructed) | Act s17: only "as instructed by the controller"; SI 155 s10(4)(f): written DPA | s20 (authorisation and confidentiality; not re-fetched); s21(1): written contract with s19 measures ([POPIA s21](https://popia.co.za/section-21-security-measures-regarding-information-processed-by-operator/)) |
| Testing and verifying controls | SI 155 s16(5): test effectiveness and improve | s19(2)(c)–(d): verify regularly and update |
| Breach detection and records | SI 155 s17(4): "robust breach detection" plus a breach register; DP3 asks for systems and record counts | s22(5): the notice must describe consequences and measures; reporting through the eServices portal ([Inside Privacy](https://www.insideprivacy.com/data-security/data-breaches/south-africa-introduces-mandatory-e-portal-reporting-for-data-breaches/)) |
| Notification deadlines | 24 hours to POTRAZ (Act s19; SI 155 s17(1)); 72 hours to data subjects if high-risk; 21-day investigation report | "As soon as reasonably possible" (s22(2)); operator to RP "immediately" (s21(2)) |
| Data residency and transfers | s28 adequacy and s29 derogations; SI 155 s10(2)(c) prior notice to POTRAZ; DP1 asks where data is located | s72(1)(a) binding agreement or BCRs; s57(1)(d) prior authorisation for special or children's personal information ([IR prior authorisation](https://inforegulator.org.za/prior-authorisation/)) |
| Retention and deletion | Act s13: keep data in identifiable form no longer than necessary; s14(e): delete false or misleading data | s14 retention limits (not re-fetched) |
| Data subject access requests | Act s14(b): access to data held by the "controller or data processor"; SI 155 s10(4)(d): measures to facilitate rights; s14 DPO is the contact point | ss23–25 (not re-fetched) |
| Demonstrating compliance | Act s24(b); s21(1)(k) notification includes a security-adequacy assessment | IR proactively requests demonstration of compliance ([Werksmans 2026](https://werksmans.com/the-regulator-is-watching-new-enforcement-signals-for-popia-and-paia-compliance/)) |
| Automated or AI decisions | Act s25 and SI 155 s10(3): consent or law only | s71: contract or code exception, plus the right to make representations and an explanation of the logic ([POPIA s71](https://popia.co.za/section-71-automated-decision-making/)) |

### Inferences
- **Breach-notice terms in customer contracts.** The Zimbabwe 24-hour clock runs against the employer controller. A DPA that promises notice within, say, 72 hours would leave Zimbabwean customers unable to comply. A sub-24-hour processor notice SLA, together with tooling that produces DP3 and eServices fields (systems affected, record counts per tenant, timeline), is the practical way to align both regimes.
- **Treat cross-tenant reads as breaches.** Under POPIA s22, as the IR reads it with no threshold, and under SI 155 s17, a cross-tenant read caused by an authorisation bug is plausibly a notifiable compromise for the affected employer. That argues for defence in depth on tenant isolation (database-level row security or separate schemas, plus application checks) and for logging that can prove the scope of any incident.
- **Field-level restriction.** Zimbabwe's broad "sensitive data" definition and POPIA's special personal information rules both support field-level access controls. Examples: hiding health or disability notes, criminal-check results, and age or marital-status fields from interviewers who do not need them.
- **Per-tenant configuration.** Per-tenant retention settings, deletion with audit evidence, and per-candidate export serve CDPA s13 and s14 and POPIA ss14 and 23 at the same time.
- **Human review of AI.** A role-based review workflow, where AI output is advisory, a named human with an appropriate role decides, and both the decision and the reasoning shown to the reviewer are logged, mitigates CDPA s25 and POPIA s71. Under POPIA, keeping explanations of the logic supports the s71(3) right to make representations.

### Gaps
- Neither regulator has published SaaS-, cloud- or multi-tenancy-specific guidance that I could find. The control mappings above are inferences from general provisions.
- I found no authoritative source saying whether an internal cross-tenant exposure with no evidence of exfiltration meets each regime's breach threshold. Zimbabwe's text says "any security breach", and POPIA's says "reasonable grounds to believe… accessed or acquired by any unauthorised person".
- I did not research sector-specific overlays, such as South Africa's Employment Equity Act rules on psychometric testing (s8) or Zimbabwe labour law. These may further constrain AI-assisted assessment in recruitment.
