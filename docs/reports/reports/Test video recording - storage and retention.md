# Recording candidates during psychometric tests: storage and retention

*Prepared 25 November 2026 for Vettly. Research summary, not legal advice: have a Zimbabwean and a South African privacy lawyer confirm before switching recording on for customers.*

## Recommendation in brief

1. **Recording stays off unless an organisation turns it on.** When it is on, the candidate gives a separate, written opt-in for the recording, apart from consent to the tests themselves. A candidate who says no is offered another way to take the test, such as a supervised session arranged by HR, so that declining doesn't cost them the job.
2. **Store recordings in Vettly's own object storage**, the same storage already used for CVs, under a separate area for each organisation. They are encrypted at rest, have no public links, are played back only through short-lived signed links, and every view is logged.
3. **Keep a recording for 30 days after the candidate's application closes** (hired, rejected or withdrawn), then delete it automatically. HR can put a recording on hold while a concern is being looked into, for up to 90 days in total, and must record a reason. Recordings never go into the talent pool.
4. **No automated face or behaviour analysis.** A person watches a recording only when there is a concern. That keeps Vettly clear of automated biometric processing.
5. **Start with photos rather than continuous video** if the aim is deterrence: one photo every 20 seconds is about a tenth of the size and much less intrusive. Offer continuous video as an organisation setting.

## What the browser measures already do (built on branch `test-security`)

While scored questions are open, the test page:

- Blocks copy, cut and paste, the right-click menu, text selection, and these shortcuts: developer tools (F12, Ctrl+Shift+I, J or C, and Cmd+Option+I, J or C), view source, save, print and select all.
- Counts every blocked attempt, every time the candidate leaves the window and for how long, and answers given within two seconds on timed tests.
- Tells the candidate this before the test starts, and gently again the first time something is blocked.
- Shows HR the result in a **Test conditions** line on each result in the report, and as a **Noticed during test** entry in the activity log, worded as something to ask about rather than proof.

**What this can't do.** No web page can fully stop a determined person. Developer tools can be opened from the browser's own menu, and a second device or another person in the room is invisible to the page. The real protection is that answer keys never reach the browser: the server removes them before sending questions. Recording adds evidence; it does not make the test cheat-proof either.

## The law

**Zimbabwe: Cyber and Data Protection Act, 2021 (CDPA).**
- Section 12 prohibits processing biometric data unless the data subject gives **written consent**. The consent can be withdrawn at any time, without a reason and at no cost. All the other data protection requirements still apply. (Michalsons; DLA Piper)
- The Act doesn't define "biometric data" in section 2 (MISA critique). Video of a face may or may not count, so it is safest to treat recordings as sensitive and to get written consent.
- Section 13 sets out the controller's duties as processing principles. The text in the sources found doesn't spell out a fixed retention period, so the safe reading is to keep data only as long as its purpose needs.
- The regulator is POTRAZ. New regulations were issued in September 2024 (DLA Piper Africa), including on data protection officers.

**South Africa: POPIA.**
- Biometric information is special personal information.
- Consent must be specific, informed and opt-in. Blanket or opt-out consent is generally not acceptable (ASSAf FAQ).
- Section 14: personal information may be kept no longer than the purpose needs, with a defined retention period for each category of data. Data with no reason to keep it should be deleted routinely (Werksmans).
- Regulation 4(b) calls for a personal information impact assessment for technology that captures biometric data. Doing one before launch is sensible.

**Freely given consent.** Regulators abroad have questioned whether consent to proctoring is free when the only alternative is failing. A GDPR regulator found a student forced to accept proctoring or fail wasn't free to refuse, and a Canadian report reached a similar view. This is why the recommendation includes an alternative for candidates who decline.

## How long others keep recordings

| Who | Retention |
|---|---|
| Simon Fraser University, exam invigilation recordings | 4 days |
| University of Toronto, Examity recordings | 60 days |
| Western University, Proctortrack | 180 days after the exam |
| Honorlock, default (customer can change) | 365 days, extended only for an investigation or a grade challenge |

Vettly's purpose is narrower than a university's. A recording helps HR check a specific concern before a hiring decision, and that purpose ends soon after the decision. Thirty days after the application closes leaves time for the candidate to question an outcome. The hold, with a 90-day ceiling and a recorded reason, covers a live dispute.

## Storage options

| Option | For | Against |
|---|---|---|
| **A. Vettly's own object storage** (SeaweedFS, S3-compatible, already holds CVs) | Data stays where customers already trust it; no new cross-border transfer; deletion handled by the existing hourly retention job | Disk to provision as volumes grow |
| B. A cloud bucket (Amazon S3, Cloudflare R2, Backblaze) | Cheap and elastic | Sends candidates' video abroad, which brings in the CDPA's and POPIA's cross-border transfer rules; a new processor to vet |
| C. Photos instead of video, stored as in A | About a tenth of the size; far less intrusive | Misses what happens between photos |

**Recommended: A**, with C as the default capture mode and continuous video as an option.

## Size and cost (estimates)

These are worked out from the bitrate; browsers often record above the rate requested, so measure a real recording before sizing disks.

- **Continuous video** at 320×240, about 250 kbps video plus 32 kbps mono audio: roughly **2.1 MB a minute**. A typical two-test battery of about 48 minutes is about **100 MB per candidate**. 200 candidates a month is about 20 GB a month. With 30-day retention after the application closes, steady state is roughly 40–60 GB per busy organisation.
- **Photos**, one small JPEG (about 40 KB) every 20 seconds: about **6 MB per candidate**.
- **Audio** roughly doubles how intrusive the recording feels, but it catches someone being told answers. Make it a separate setting, off by default.

## What building it involves

- **Settings → Assessments:** "Record candidates during tests" (Off, Photos, Video), "Include sound" (off), "Keep recordings for" (7–30 days after the application closes, default 30), and the alternative offered to candidates who decline.
- **Candidate flow:** a separate written opt-in for recording, with plain wording on who sees it and when it's deleted; a camera check before the timer starts; a visible recording indicator; and a "No, offer me another way" choice that tells HR.
- **Capture:** the browser's MediaRecorder (or a canvas snapshot) in 10-second pieces, uploaded as the test goes, so a dropped connection loses little. Stored per attempt, tied to the invitation.
- **HR:** a "Watch recording" link on the result, only for people allowed to see reports. Each view is logged in the audit log. No downloads.
- **Deletion:** the hourly retention job deletes recordings 30 days after the application closes, unless a hold is in place with a reason. Data-access and deletion requests include recordings.
- **Before launch:** a privacy impact assessment, updated notices in the consent text, and lawyer review.

## Decisions for you

1. Photos, video or both as the options?
2. Sound: off by default, or not offered at all?
3. Retention: 30 days after the application closes (recommended), or another figure?
4. The alternative for candidates who decline: a supervised session, or HR's choice?

## Sources

- Michalsons, [Zimbabwe's Cyber and Data Protection Act overview](https://www.michalsons.com/blog/zimbabwes-cyber-and-data-protection-act-overview/78795)
- DLA Piper, [Data protection in Zimbabwe](https://www.dlapiperdataprotection.com/?c=ZW&t=law); DLA Piper Africa, [Quick-start guide to Zimbabwe's data protection regulations](https://www.dlapiperafrica.com/zimbabwe/insights/2024/A-Quick-Start-Guide-to-Zimbabwes-Data-Protection-Regulations)
- ZimLII, [Cyber and Data Protection Act, 2021](https://zimlii.org/akn/zw/act/2021/5/eng@2022-03-11)
- MISA, [critique of the Cyber and Data Protection Act](https://data.misa.org/en/entity/mez0bnln52l?page=7)
- ASSAf, [FAQs on the POPIA Code of Conduct for Research](https://www.assaf.org.za/wp-content/uploads/2025/10/FAQs-POPIA-Framework-Updated-15-Oct-2025.pdf)
- Werksmans, [legal updates on POPIA retention](https://werksmans.com/know-the-pages-you-will-be-judged-against/page/2/)
- Questionmark, [Proctoring online privacy guidance](https://www.questionmark.com/docs/Questionmark-Proctoring-Online-Privacy-Guidance)
- Biometric Update, [Online proctoring biometrics use fails to meet Canadian legal threshold](https://www.biometricupdate.com/202211/online-proctoring-biometrics-use-fails-to-meet-canadian-legal-threshold-report-says)
- Arizona State University, [Honorlock security and privacy information](https://tlc.sols.asu.edu/technology/honorlock-security-and-privacy-information); Honorlock, [How does Honorlock protect student data?](https://honorlock.com/?p=20749)
- University of Toronto, [Examity privacy and security notice](https://teachingdev.lamp4.utoronto.ca/?p=13237); Western University, [Remote proctoring privacy](https://registrar.uwo.ca/academics/examinations/remote_proctoring/privacy/index.html); Simon Fraser University, [Records retention schedule 2015-001](https://www.sfu.ca/archives/records-management/directory-of-university-records/RRSDA/RRSDA-2015-001.html)
- MDN, [MediaRecorder: videoBitsPerSecond](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/videoBitsPerSecond); Addpipe, [MediaRecorder video bitrates](https://blog.addpipe.com/mediarecorder-video-bitrates/)
